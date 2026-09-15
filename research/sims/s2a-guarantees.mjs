// S2a: "guarantee at least N numbers from 10-19" for N = 1-4, in pool A only
// or in both pools, granted after round 1 (sim-plan-2.md §S2). N = 1 in both
// pools matches round 1's "guaranteed 10s value per pool" (+33) as a check.
// Usage: N=300 BASE_N=1200 node s2a-guarantees.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 300);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';

const guarantee = (count, both) => (c) => {
  const g = { min: 10, max: 19, count };
  return { ...c, guaranteesA: [...c.guaranteesA, g], ...(both ? { guaranteesB: [...c.guaranteesB, g] } : {}) };
};

const base = runMany(PLAYER, baseConfig, BASE_N);
console.log(`${PLAYER} baseline (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
console.log(`${N} runs per cell, granted after round 1. "~" marks a change within 2x its error.`);
console.log('at least N tens | pools | win% | change');
for (const count of [1, 2, 3, 4]) {
  for (const both of [false, true]) {
    const s = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === 1 ? guarantee(count, both)(cfg) : cfg) });
    const d = s.winPct - base.winPct;
    const se = Math.hypot(s.stderr, base.stderr);
    console.log(`${count} | ${both ? 'both' : 'A only'} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)}`);
  }
}
