// P3c (sim-plan-3.md): main effects and pairwise interactions from P3b's
// random-draft records.
// - Landmark: only runs that cleared round L count, holding what they picked
//   after rounds 1..L. Otherwise early deaths, which make fewer picks, would
//   look like bad picks.
// - Interaction: a difference in differences, (both - A only) - (B only -
//   neither), for win rate and for rounds cleared. Positive = synergy.
// - Hold-out: pairs are ranked on the even-numbered runs and re-measured on
//   the odd-numbered ones.
// - Controls: pairs expected to be anti-synergies are printed regardless.
// Usage: IN_DIR=p3-runs L=5 MIN_CELL=150 TOP=10 node p3-synergy.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const IN_DIR = process.env.IN_DIR || 'p3-runs';
const L = Number(process.env.L || 5);
const MIN_CELL = Number(process.env.MIN_CELL || 150);
const TOP = Number(process.env.TOP || 10);
const CONTROLS = [
  ['high-factors-cheaper', 'remove-high-decade'],
  ['odds-70s-A-x0.5', 'remove-high-decade'],
];

const runs = readdirSync(IN_DIR)
  .filter((f) => f.endsWith('.jsonl'))
  .flatMap((f) => readFileSync(path.join(IN_DIR, f), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)));

const zero = () => ({ n: 0, w: 0, c: 0, q: 0 });
const addRun = (t, run) => { t.n++; t.w += run.won ? 1 : 0; t.c += run.cleared; t.q += run.cleared ** 2; };
const minus = (x, y) => ({ n: x.n - y.n, w: x.w - y.w, c: x.c - y.c, q: x.q - y.q });
const plus = (x, y) => ({ n: x.n + y.n, w: x.w + y.w, c: x.c + y.c, q: x.q + y.q });

function tally(sample) {
  const all = zero(), one = new Map(), two = new Map();
  const bump = (m, k, run) => { if (!m.has(k)) m.set(k, zero()); addRun(m.get(k), run); };
  for (const run of sample) {
    addRun(all, run);
    const held = [...new Set(run.picks.slice(0, L).filter(Boolean))].sort();
    for (let i = 0; i < held.length; i++) {
      bump(one, held[i], run);
      for (let j = i + 1; j < held.length; j++) bump(two, `${held[i]}|${held[j]}`, run);
    }
  }
  return { all, one, two };
}

// Mean and variance of the mean, for win rate (w) and rounds cleared (c).
const stats = (t) => {
  const p = t.w / t.n, m = t.c / t.n;
  return { n: t.n, p, vp: (p * (1 - p)) / t.n, m, vm: Math.max(0, t.q / t.n - m * m) / t.n };
};

function mainEffect(T, id) {
  const has = T.one.get(id) || zero();
  const not = minus(T.all, has);
  if (has.n < MIN_CELL || not.n < MIN_CELL) return null;
  const a = stats(has), b = stats(not);
  return { id, n: has.n, dp: a.p - b.p, sp: Math.sqrt(a.vp + b.vp), dm: a.m - b.m, sm: Math.sqrt(a.vm + b.vm) };
}

// Log-odds of winning, with half a win and half a loss added so 0% and 100% cells stay finite.
const logOdds = (t) => {
  const w = t.w + 0.5, l = t.n - t.w + 0.5;
  return { v: Math.log(w / l), var: 1 / w + 1 / l };
};

function interaction(T, x, y) {
  const [a, b] = [x, y].sort();
  const AB = T.two.get(`${a}|${b}`) || zero();
  const A = T.one.get(a) || zero(), B = T.one.get(b) || zero();
  const raw = [AB, minus(A, AB), minus(B, AB), plus(minus(minus(T.all, A), B), AB)];
  if (raw.some((t) => t.n < MIN_CELL)) return null;
  const [both, aOnly, bOnly, neither] = raw.map(stats);
  const [lb, la, lB, ln] = raw.map(logOdds);
  return {
    pair: `${a} + ${b}`,
    nBoth: both.n,
    dp: (both.p - aOnly.p) - (bOnly.p - neither.p),
    sp: Math.sqrt(both.vp + aOnly.vp + bOnly.vp + neither.vp),
    dm: (both.m - aOnly.m) - (bOnly.m - neither.m),
    sm: Math.sqrt(both.vm + aOnly.vm + bOnly.vm + neither.vm),
    // Win rate and rounds cleared both have ceilings that can make two strong picks look redundant; log-odds doesn't.
    dl: lb.v - la.v - lB.v + ln.v,
    sl: Math.sqrt(lb.var + la.var + lB.var + ln.var),
  };
}

const landmark = runs.filter((r) => r.cleared >= L);
const discovery = landmark.filter((_, i) => i % 2 === 0);
const confirmation = landmark.filter((_, i) => i % 2 === 1);
const TD = tally(discovery), TC = tally(confirmation), TA = tally(landmark);

const fmt = (d, s, digits = 2) => `${d >= 0 ? '+' : ''}${d.toFixed(digits)} ±${s.toFixed(digits)}`;
const pct = (d, s) => fmt(d * 100, s * 100, 1);

console.log(`${runs.length} runs, ${landmark.length} cleared round ${L} (landmark); discovery ${discovery.length}, confirmation ${confirmation.length}; cells need at least ${MIN_CELL} runs`);
console.log(`overall among landmark runs: win ${((TA.all.w / TA.all.n) * 100).toFixed(1)}%, rounds cleared ${(TA.all.c / TA.all.n).toFixed(2)}`);

console.log(`\nMain effects (all landmark runs): holding the offer by round ${L} vs not`);
console.log('offer | runs holding | win-rate change (points) | rounds-cleared change');
const effects = [...TA.one.keys()].map((id) => mainEffect(TA, id)).filter(Boolean).sort((a, b) => b.dm - a.dm);
for (const e of effects) console.log(`${e.id} | ${e.n} | ${pct(e.dp, e.sp)} | ${fmt(e.dm, e.sm)}`);

const keys = [...TD.two.keys()].map((k) => k.split('|'));
const found = keys.map(([a, b]) => interaction(TD, a, b)).filter(Boolean).map((r) => ({ ...r, z: r.dm / r.sm }));
const ranked = [...found].sort((a, b) => b.z - a.z);
const report = (label, list) => {
  console.log(`\n${label}`);
  console.log('pair | runs holding both (discovery) | discovery: rounds cleared, win points, win log-odds | confirmation: same | confirmed? | measures agree?');
  const cols = (x) => `${fmt(x.dm, x.sm)}, ${pct(x.dp, x.sp)}, ${fmt(x.dl, x.sl)}`;
  for (const r of list) {
    const [a, b] = r.pair.split(' + ');
    const c = interaction(TC, a, b);
    const confirmed = c && Math.sign(c.dm) === Math.sign(r.dm) && Math.abs(c.dm / c.sm) >= 2 ? 'yes' : 'no';
    // Flag pairs where the capped measure and log-odds point opposite ways with some confidence.
    const agree = Math.sign(r.dm) === Math.sign(r.dl) || Math.abs(r.dl / r.sl) < 2 ? 'yes' : 'NO (ceiling?)';
    console.log(`${r.pair} | ${r.nBoth} | ${cols(r)} | ${c ? cols(c) : 'too few runs'} | ${confirmed} | ${agree}`);
  }
};
console.log(`\n${found.length} pairs had enough runs in every cell of the discovery half.`);
report(`Strongest ${TOP} positive interactions (synergies), ranked on discovery`, ranked.slice(0, TOP));
report(`Strongest ${Math.ceil(TOP / 2)} negative interactions, ranked on discovery`, ranked.slice(-Math.ceil(TOP / 2)).reverse());

console.log('\nControls (expected anti-synergies), all landmark runs:');
for (const [a, b] of CONTROLS) {
  const r = interaction(TA, a, b);
  console.log(`${a} + ${b} | ${r ? `rounds cleared ${fmt(r.dm, r.sm)}, win ${pct(r.dp, r.sp)}, win log-odds ${fmt(r.dl, r.sl)} (both held in ${r.nBoth} runs)` : 'too few runs in some cell'}`);
}
