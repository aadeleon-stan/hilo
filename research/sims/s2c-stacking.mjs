// S2c: marginal value of stacking one odds upgrade (sim-plan-2.md §S2).
// Level k = the upgrade granted after each of the first k of rounds 1, 3, 5, 7.
// Runs at a harder difficulty (TARGET_SCALE) because at today's targets a
// single 10s upgrade already pushes the average player to 95-100%, leaving
// no room to see later stacks.
//
// Upgrades (pool A only, compounding per stack):
//   guarantee   at least k numbers from 10-19
//   tens1.5     10s weight x1.5 per stack
//   nineties0.5 90s weight x0.5 per stack
//
// Usage: UPGRADE=tens1.5 TARGET_SCALE=1.06 N=300 BASE_N=1200 node s2c-stacking.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const UPGRADE = process.env.UPGRADE || 'tens1.5';
const TARGET_SCALE = Number(process.env.TARGET_SCALE || 1);
const N = Number(process.env.N || 300);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';
const GRANT_ROUNDS = [1, 3, 5, 7];

const withOdds = (c, tens, nineties) => ({
  ...c,
  oddsTens: tens,
  oddsNineties: nineties,
  weightsA: (v) => (v < 20 ? tens : v >= 90 ? nineties : 1),
});
const STACK = {
  guarantee: (c) => ({ ...c, guaranteesA: [{ min: 10, max: 19, count: (c.guaranteesA[0]?.count || 0) + 1 }] }),
  'tens1.5': (c) => withOdds(c, (c.oddsTens || 1) * 1.5, c.oddsNineties || 1),
  'nineties0.5': (c) => withOdds(c, c.oddsTens || 1, (c.oddsNineties || 1) * 0.5),
};
if (!STACK[UPGRADE]) throw new Error(`UPGRADE must be one of ${Object.keys(STACK).join(', ')}`);

const start = () => ({ ...baseConfig(), targetScale: TARGET_SCALE });
const base = runMany(PLAYER, start, BASE_N);
console.log(`${PLAYER}, targetScale ${TARGET_SCALE}, upgrade ${UPGRADE} (pool A)`);
console.log(`level 0 (no upgrade, ${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
console.log(`${N} runs per level. "~" marks a step within 2x its error.`);
console.log('level | granted after rounds | win% | change vs level 0 | step from previous level');
let prev = base;
for (let k = 1; k <= GRANT_ROUNDS.length; k++) {
  const grants = GRANT_ROUNDS.slice(0, k);
  const s = runMany(PLAYER, start, N, { onRoundWin: (cfg, r) => (grants.includes(r) ? STACK[UPGRADE](cfg) : cfg) });
  const total = s.winPct - base.winPct;
  const step = s.winPct - prev.winPct;
  const stepSE = Math.hypot(s.stderr, prev.stderr);
  const signed = (d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
  console.log(`${k} | ${grants.join(', ')} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${signed(total)} | ${Math.abs(step) < 2 * stepSE ? '~' : ''}${signed(step)} ±${stepSE.toFixed(1)}`);
  prev = s;
}
