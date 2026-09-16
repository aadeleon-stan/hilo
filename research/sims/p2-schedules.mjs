// P2b-c (sim-plan-3.md): one target schedule on the 40-79 start with
// drafting after every round. Calibrates the schedule's knob so the average
// player drafting well (by P2a's value table) wins about CAL_WIN%, then
// measures every drafting policy, the planner, deaths by round, the tightest
// round, and how much win rate moves when targets shift by 5%.
//
//   FAMILY=power      targets T1 + c * (r - 1)^P; knob = c
//   FAMILY=geometric  targets T1 * g^(r - 1);     knob = g
//
// Usage: FAMILY=power P=2 T1=115 N_CAL=400 N=600 N_PLANNER=200 node p2-schedules.mjs
import { readFileSync } from 'node:fs';
import { runMany, baseConfig, startConfig, powerTargets, geometricTargets, calibrate } from './upgrade-sim.mjs';
import { policies, draftHook } from './draft-pool-3.mjs';

const FAMILY = process.env.FAMILY || 'power';
const P = Number(process.env.P || 1.5);
const T1 = Number(process.env.T1 || 135);
const CAL_WIN = Number(process.env.CAL_WIN || 92);
const N_CAL = Number(process.env.N_CAL || 400);
const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 200);
const VALUES = JSON.parse(readFileSync(process.env.VALUES || new URL('./values-4079.json', import.meta.url), 'utf8')).values;

const schedule = (knob) => (FAMILY === 'geometric' ? geometricTargets(T1, knob) : powerTargets(T1, knob, P));
const bracket = FAMILY === 'geometric' ? { lo: 1, hi: 1.3 } : { lo: 0, hi: 20 };
const label = FAMILY === 'geometric' ? `${T1} * g^(r - 1)` : `${T1} + c * (r - 1)^${P}`;

const start = (knob, scale = 1) => () => ({ ...baseConfig(), ...startConfig([40, 79]), targets: schedule(knob), targetScale: scale });
const drafting = (policy) => {
  const picks = {};
  const hook = draftHook(policy);
  return {
    picks,
    options: {
      onRoundWin: (cfg, r, E, draft) => {
        const next = hook(cfg, r, E, draft);
        const picked = draft[draft.length - 1]?.picked;
        if (picked) picks[picked] = (picks[picked] || 0) + 1;
        return next;
      },
    },
  };
};

const cal = calibrate((knob) => runMany('average', start(knob), N_CAL, drafting(policies.best(VALUES)).options), { ...bracket, target: CAL_WIN });
const knob = cal.knob;
console.log(`schedule ${label} | ${FAMILY === 'geometric' ? 'g' : 'c'} = ${knob.toFixed(4)} | targets ${schedule(knob).map(Math.round).join(' ')}`);
console.log(`calibration: average drafting well ${cal.result.winPct.toFixed(1)}% ±${cal.result.stderr.toFixed(1)} (n=${N_CAL})${cal.reachable ? '' : ' | WARNING: target not reachable even at the easiest knob'}`);

const deaths = (s) => s.deathsPct.map((p) => p.toFixed(0)).join('/');
const tight = (s) => (s.tightestRound.median === null ? '-' : `${s.tightestRound.median} (p10 ${s.tightestRound.p10})`);
console.log('player | drafting | win% | rounds cleared | deaths% by round | tightest round energy, median (p10)');
const cells = [
  ['average', 'well', policies.best(VALUES), N],
  ['average', 'randomly', policies.random(), N],
  ['average', 'worst-first', policies.worst(VALUES), N],
  ['average', 'declining', policies.none(), N],
  ['planner', 'well', policies.best(VALUES), N_PLANNER],
];
let wellPicks = null;
for (const [player, name, policy, n] of cells) {
  if (n <= 0) continue;
  const d = drafting(policy);
  const s = runMany(player, start(knob), n, d.options);
  if (player === 'average' && name === 'well') wellPicks = d.picks;
  console.log(`${player} | ${name} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} (n=${n}) | ${s.meanRoundsCleared.toFixed(2)} | ${deaths(s)} | ${tight(s)}`);
}

const down = runMany('average', start(knob, 0.95), N, drafting(policies.best(VALUES)).options);
const up = runMany('average', start(knob, 1.05), N, drafting(policies.best(VALUES)).options);
console.log(`target sensitivity (average drafting well): targets x0.95 -> ${down.winPct.toFixed(1)}% ±${down.stderr.toFixed(1)}, x1.05 -> ${up.winPct.toFixed(1)}% ±${up.stderr.toFixed(1)}`);
if (wellPicks) {
  console.log(`average drafting-well picks: ${Object.entries(wellPicks).sort((a, b) => b[1] - a[1]).map(([id, k]) => `${id} ${k}`).join(', ')}`);
}
