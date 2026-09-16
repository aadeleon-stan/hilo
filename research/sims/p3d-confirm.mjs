// P3d (sim-plan-3.md): controlled check of one interaction found by P3c.
// Four cells at the chosen schedule: neither, A only (granted after round 1),
// B only (granted after round 2), and both. After round 2, every cell drafts
// well from the P2 pool with A and B never offered, so the pair is the only
// difference between cells. Reports each cell and the interaction
// (both - A only) - (B only - neither) for rounds cleared, win rate and win
// log-odds, for the average player and the planner.
// Usage: PAIR=narrow-pool-A,over-4000-double N=600 N_PLANNER=200 node p3d-confirm.mjs
import { readFileSync } from 'node:fs';
import { runManyRaw } from './upgrade-sim.mjs';
import { OFFERS, byId, policies, draftHook } from './draft-pool-3.mjs';
import { round3Start } from './round3-config.mjs';

const [A, B] = (process.env.PAIR || '').split(',');
if (!byId[A] || !byId[B]) throw new Error('PAIR must name two offer ids from draft-pool-3.mjs, e.g. PAIR=narrow-pool-A,over-4000-double');
const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 200);
const VALUES = JSON.parse(readFileSync(new URL('./values-4079.json', import.meta.url), 'utf8')).values;

const background = draftHook(policies.best(VALUES), OFFERS.filter((o) => o.id !== A && o.id !== B));
let skipped = 0;
const grant = (id, cfg) => {
  if (byId[id].eligible(cfg)) return byId[id].apply(cfg);
  skipped++;
  return cfg;
};
const cell = (withA, withB) => ({
  onRoundWin: (cfg, r, E, draft) => {
    if (r === 1) return withA ? grant(A, cfg) : cfg;
    if (r === 2) return withB ? grant(B, cfg) : cfg;
    return background(cfg, r, E, draft);
  },
});

function stats(results) {
  const n = results.length;
  const wins = results.filter((r) => r.won).length;
  const cleared = results.map((r) => r.rounds.length);
  const m = cleared.reduce((t, x) => t + x, 0) / n;
  const vm = cleared.reduce((t, x) => t + (x - m) ** 2, 0) / Math.max(1, n - 1) / n;
  const p = wins / n;
  const w = wins + 0.5, l = n - wins + 0.5;
  return { n, p, vp: (p * (1 - p)) / n, m, vm, lo: Math.log(w / l), vlo: 1 / w + 1 / l };
}
const did = (c, k, vk) => ({
  d: (c.both[k] - c.aOnly[k]) - (c.bOnly[k] - c.neither[k]),
  s: Math.sqrt(c.both[vk] + c.aOnly[vk] + c.bOnly[vk] + c.neither[vk]),
});
const fmt = ({ d, s }, scale = 1, digits = 2) => `${d >= 0 ? '+' : ''}${(d * scale).toFixed(digits)} ±${(s * scale).toFixed(digits)}`;

console.log(`pair: ${A} (granted after round 1) + ${B} (after round 2); rounds 3-9 draft well from the P2 pool without them`);
console.log('player | runs per cell | neither | A only | B only | both (win%, rounds cleared) | interaction: rounds cleared | win points | win log-odds');
for (const [player, n] of [['average', N], ['planner', N_PLANNER]]) {
  if (n <= 0) continue;
  const c = {
    neither: stats(runManyRaw(player, round3Start, n, cell(false, false))),
    aOnly: stats(runManyRaw(player, round3Start, n, cell(true, false))),
    bOnly: stats(runManyRaw(player, round3Start, n, cell(false, true))),
    both: stats(runManyRaw(player, round3Start, n, cell(true, true))),
  };
  const show = (s) => `${(s.p * 100).toFixed(1)}%, ${s.m.toFixed(2)}`;
  console.log(`${player} | ${n} | ${show(c.neither)} | ${show(c.aOnly)} | ${show(c.bOnly)} | ${show(c.both)} | ${fmt(did(c, 'm', 'vm'))} | ${fmt(did(c, 'p', 'vp'), 100, 1)} | ${fmt(did(c, 'lo', 'vlo'))}`);
}
if (skipped) console.log(`WARNING: ${skipped} grants were skipped because the offer wasn't eligible at that point`);
