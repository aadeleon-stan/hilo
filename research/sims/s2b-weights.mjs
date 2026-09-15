// S2b: odds upgrades that reweight the 10s up and/or the 90s down, in pool A
// only or in both pools, granted after round 1 (sim-plan-2.md §S2). Chart
// data for the same settings is in s2e-odds-chart.mjs.
// Usage: N=300 BASE_N=1200 node s2b-weights.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 300);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';

const SETTINGS = [
  ['10s x1.5', 1.5, 1],
  ['10s x2', 2, 1],
  ['10s x3', 3, 1],
  ['90s x0.5', 1, 0.5],
  ['90s x0.25', 1, 0.25],
  ['10s x2 + 90s x0.5', 2, 0.5],
];
const reweight = (wTens, wNineties, both) => (c) => {
  const w = (v) => (v < 20 ? wTens : v >= 90 ? wNineties : 1);
  return { ...c, weightsA: w, ...(both ? { weightsB: w } : {}) };
};

const base = runMany(PLAYER, baseConfig, BASE_N);
console.log(`${PLAYER} baseline (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
console.log(`${N} runs per cell, granted after round 1. "~" marks a change within 2x its error.`);
console.log('setting | pools | win% | change');
for (const [name, wTens, wNineties] of SETTINGS) {
  for (const both of [false, true]) {
    const s = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === 1 ? reweight(wTens, wNineties, both)(cfg) : cfg) });
    const d = s.winPct - base.winPct;
    const se = Math.hypot(s.stderr, base.stderr);
    console.log(`${name} | ${both ? 'both' : 'A only'} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)}`);
  }
}
