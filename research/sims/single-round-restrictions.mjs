// Single-round energy cost when pools are drawn from restricted value sets
// (upgrades-research.md §2). One-move-at-a-time skilled player (best of
// several cost weights), target 300, 9 turns.
// Usage: N=1500 node single-round-restrictions.mjs
import { computeProduct } from '../../src/store/gameLogic.js';

const N = Number(process.env.N || 1500);
const T = Number(process.env.TARGET || 300);

function pool(domain) {
  const s = new Set();
  while (s.size < 9) s.add(domain[Math.floor(Math.random() * domain.length)]);
  return [...s];
}

function round(A, B) {
  let best = null;
  for (const lam of [0, 0.5, 1, 2, 4, 8]) {
    const ua = Array(9).fill(false), ub = Array(9).fill(false);
    let s = 0, e = 0, t = 0;
    while (s < T && t < 9) {
      let bv = -Infinity, bi = 0, bj = 0;
      for (let i = 0; i < 9; i++) if (!ua[i]) for (let j = 0; j < 9; j++) if (!ub[j]) {
        const p = computeProduct(A[i], B[j]);
        const v = p.lowWord - lam * p.highWord;
        if (v > bv) { bv = v; bi = i; bj = j; }
      }
      const p = computeProduct(A[bi], B[bj]);
      s += p.lowWord; e += p.highWord; ua[bi] = ub[bj] = true; t++;
    }
    if (s >= T && (!best || e < best.e)) best = { e, t };
  }
  return best;
}

const ALL = Array.from({ length: 90 }, (_, i) => i + 10);
const variants = [['none (10-99)', ALL]];
for (let d = 1; d <= 9; d++) variants.push([`no ${d}0s`, ALL.filter((v) => Math.floor(v / 10) !== d)]);
for (let u = 0; u <= 9; u++) variants.push([`no ones digit ${u}`, ALL.filter((v) => v % 10 !== u)]);

const rows = variants.map(([name, dom]) => {
  const es = [];
  let fails = 0, cheapHigh = 0;
  for (let k = 0; k < N; k++) {
    const A = pool(dom), B = pool(dom);
    for (const a of A) for (const b of B) { const p = computeProduct(a, b); if (p.lowWord >= 80 && p.highWord <= 15) cheapHigh++; }
    const r = round(A, B);
    if (r) es.push(r.e); else fails++;
  }
  return { name, mean: es.reduce((a, b) => a + b, 0) / es.length, fail: (fails / N) * 100, cheapHigh: cheapHigh / N };
});
const base = rows[0].mean;
console.log(`target ${T}, ${N} boards each`);
console.log('restriction | mean energy | vs none | fail% | cheap high-scoring moves/board');
for (const r of rows) {
  console.log(`${r.name} | ${r.mean.toFixed(1)} | ${(((r.mean - base) / base) * 100).toFixed(0)}% | ${r.fail.toFixed(1)} | ${r.cheapHigh.toFixed(1)}`);
}
