// S1c: does it matter which pool loses which digit? Compares (x removed from
// pool A, y from pool B) against the swap, granted after round 1
// (sim-plan-2.md §S1). One strong, one mixed and one weak pair from S1a.
// Usage: N=600 BASE_N=1200 node s1c-pair-symmetry.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 600);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';
const PAIRS = [[8, 9], [1, 8], [2, 3]];

const assign = (a, b) => (c) => ({
  ...c,
  domainA: c.domainA.filter((v) => v % 10 !== a),
  domainB: c.domainB.filter((v) => v % 10 !== b),
});
const noise = (d, se) => (Math.abs(d) < 2 * se ? '~' : '');
const signed = (d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;

const base = runMany(PLAYER, baseConfig, BASE_N);
console.log(`${PLAYER} baseline (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
console.log(`${N} runs per assignment, granted after round 1. "~" marks a difference within 2x its error.`);
console.log('pair | x in A, y in B | y in A, x in B | difference between assignments');
for (const [x, y] of PAIRS) {
  const xy = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === 1 ? assign(x, y)(cfg) : cfg) });
  const yx = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === 1 ? assign(y, x)(cfg) : cfg) });
  const d = xy.winPct - yx.winPct;
  const se = Math.hypot(xy.stderr, yx.stderr);
  const vsBase = (s) => signed(s.winPct - base.winPct);
  console.log(`${x} & ${y} | ${xy.winPct.toFixed(1)} ±${xy.stderr.toFixed(1)} (${vsBase(xy)}) | ${yx.winPct.toFixed(1)} ±${yx.stderr.toFixed(1)} (${vsBase(yx)}) | ${noise(d, se)}${signed(d)} ±${se.toFixed(1)}`);
}
