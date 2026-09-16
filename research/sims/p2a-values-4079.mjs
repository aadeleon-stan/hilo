// P2a (sim-plan-3.md): solo value of each round 3 offer on the 40-79 start,
// the "drafting well" table for P2b-c. Each offer is granted after round 1
// under a provisional schedule T1 + c * (r - 1)^P. c is calibrated so the
// strongest single offer, unlocking the 10s, wins about CAL_WIN%: at gentler
// targets every low unlock wins every run (round 2 S3b) and they would tie.
// Value = change in mean rounds cleared, which has no ceiling at either end;
// win rate is shown alongside.
// Usage: N=600 BASE_N=1200 N_CAL=400 node p2a-values-4079.mjs
import { writeFileSync } from 'node:fs';
import { runMany, baseConfig, startConfig, powerTargets, calibrate } from './upgrade-sim.mjs';
import { OFFERS, byId } from './draft-pool-3.mjs';

const N = Number(process.env.N || 600);
const BASE_N = Number(process.env.BASE_N || 1200);
const N_CAL = Number(process.env.N_CAL || 400);
const CAL_WIN = Number(process.env.CAL_WIN || 50);
const T1 = Number(process.env.T1 || 135);
const P = Number(process.env.P || 1.5);
const OUT = process.env.OUT || new URL('./values-4079.json', import.meta.url);

const startAt = (c) => () => ({ ...baseConfig(), ...startConfig([40, 79]), targets: powerTargets(T1, c, P) });
const grant = (...ids) => ({ onRoundWin: (cfg, r) => (r === 1 ? ids.reduce((acc, id) => byId[id].apply(acc), cfg) : cfg) });

const cal = calibrate((c) => runMany('average', startAt(c), N_CAL, grant('unlock-10s')), { lo: 0, hi: 50, target: CAL_WIN });
const c = cal.knob;
const schedule = powerTargets(T1, c, P);
console.log(`provisional schedule: ${T1} + ${c.toFixed(2)} * (r - 1)^${P} -> ${schedule.map(Math.round).join(' ')}`);
console.log(`calibration: unlock-10s after round 1 wins ${cal.result.winPct.toFixed(1)}% ±${cal.result.stderr.toFixed(1)} (n=${N_CAL})${cal.reachable ? '' : ' | WARNING: target not reachable'}`);

const base = runMany('average', startAt(c), BASE_N);
console.log(`no pick (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)} | rounds cleared ${base.meanRoundsCleared.toFixed(2)} ±${base.roundsClearedSE.toFixed(2)}`);

const start = startAt(c)();
const results = {};
const rows = [];
for (const o of OFFERS) {
  let s, ref, note = '';
  if (o.eligible(start)) {
    s = runMany('average', startAt(c), N, grant(o.id));
    ref = base;
  } else if (o.id === 'guarantee-10s' && results['unlock-10s']) {
    s = runMany('average', startAt(c), N, grant('unlock-10s', o.id));
    ref = results['unlock-10s'];
    note = 'on top of unlock-10s';
  } else {
    console.log(`${o.id}: not offered at the start, skipped`);
    continue;
  }
  results[o.id] = s;
  const value = s.meanRoundsCleared - ref.meanRoundsCleared;
  const se = Math.hypot(s.roundsClearedSE, ref.roundsClearedSE);
  rows.push({ id: o.id, value, se, winPct: s.winPct, winSE: s.stderr, rounds: s.meanRoundsCleared, note });
}

rows.sort((a, b) => b.value - a.value);
console.log(`\n${N} runs per offer, granted after round 1. Value = change in mean rounds cleared; "~" marks a value within 2x its error.`);
console.log('offer | value (rounds cleared) | win% | rounds cleared | note');
for (const r of rows) {
  const mark = Math.abs(r.value) < 2 * r.se ? '~' : '';
  console.log(`${r.id} | ${mark}${r.value >= 0 ? '+' : ''}${r.value.toFixed(2)} ±${r.se.toFixed(2)} | ${r.winPct.toFixed(1)} ±${r.winSE.toFixed(1)} | ${r.rounds.toFixed(2)} | ${r.note}`);
}

writeFileSync(OUT, JSON.stringify({
  measured: new Date().toISOString().slice(0, 10),
  schedule: { T1, c, p: P, targets: schedule },
  runsPerOffer: N,
  values: Object.fromEntries(rows.map((r) => [r.id, Number(r.value.toFixed(3))])),
  detail: rows,
}, null, 2));
console.log(`\nwrote ${OUT instanceof URL ? OUT.pathname : OUT}`);
