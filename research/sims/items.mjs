// Energy equivalents of single-use shop items on one round
// (upgrades-research.md §6). Target 300, 9 turns, fresh boards, skilled
// one-move-at-a-time player. Energy equivalent = energy saved + 5 per turn saved.
// Usage: N=2000 node items.mjs
import { computeProduct } from '../../src/store/gameLogic.js';

const T = 300, REFUND = 5;
const N = Number(process.env.N || 2000);
const ALL = Array.from({ length: 90 }, (_, i) => i + 10);
const pool = () => { const s = new Set(); while (s.size < 9) s.add(ALL[Math.floor(Math.random() * 90)]); return [...s]; };

function play(A, B, { doubleFirst = false } = {}) {
  let best = null;
  for (const lam of [0, 0.5, 1, 2, 4, 8]) {
    const ua = Array(9).fill(false), ub = Array(9).fill(false);
    let s = 0, t = 0;
    const costs = [];
    while (s < T && t < 9) {
      let bv = -Infinity, bi = 0, bj = 0;
      for (let i = 0; i < 9; i++) if (!ua[i]) for (let j = 0; j < 9; j++) if (!ub[j]) {
        const p = computeProduct(A[i], B[j]);
        const l = doubleFirst && t === 0 ? p.lowWord * 2 : p.lowWord;
        const v = l - lam * p.highWord;
        if (v > bv) { bv = v; bi = i; bj = j; }
      }
      const p = computeProduct(A[bi], B[bj]);
      s += doubleFirst && t === 0 ? p.lowWord * 2 : p.lowWord;
      costs.push(p.highWord); ua[bi] = ub[bj] = true; t++;
    }
    if (s < T) continue;
    const e = costs.reduce((a, b) => a + b, 0);
    const value = e + t * REFUND;
    if (!best || value < best.value) best = { e, t, value, maxCost: Math.max(...costs) };
  }
  return best;
}

const swapDigits = (v) => (v % 10 === 0 ? null : (v % 10) * 10 + Math.floor(v / 10));
const boards = Array.from({ length: N }, () => ({ A: pool(), B: pool() })).map((b) => ({ ...b, base: play(b.A, b.B) })).filter((b) => b.base);
const sorted = boards.map((b) => b.base.value).sort((x, y) => x - y);
const worstQuartile = sorted[Math.floor(sorted.length * 0.75)];
let free = 0, half = 0, dbl = 0, rerollAll = 0, rerollBad = 0, badN = 0, refreshBad = 0, swap = 0;
for (const b of boards) {
  free += b.base.maxCost;
  half += Math.floor(b.base.maxCost / 2);
  const d = play(b.A, b.B, { doubleFirst: true });
  if (d) dbl += b.base.value - d.value;
  const bigger = b.A.reduce((a, v) => a + v, 0) >= b.B.reduce((a, v) => a + v, 0) ? 'A' : 'B';
  const rr = bigger === 'A' ? play(pool(), b.B) : play(b.A, pool());
  const rrGain = rr ? b.base.value - rr.value : 0;
  rerollAll += rrGain;
  if (b.base.value >= worstQuartile) {
    badN++; rerollBad += rrGain;
    const fresh = play(pool(), pool());
    if (fresh) refreshBad += b.base.value - fresh.value;
  }
  let bestSwap = 0;
  for (const side of ['A', 'B']) {
    const P = b[side];
    P.forEach((v, idx) => {
      const w = swapDigits(v);
      if (w === null || w < 10 || P.includes(w)) return;
      const Q = [...P]; Q[idx] = w;
      const r = side === 'A' ? play(Q, b.B) : play(b.A, Q);
      if (r) bestSwap = Math.max(bestSwap, b.base.value - r.value);
    });
  }
  swap += bestSwap;
}
const n = boards.length;
console.log(`boards ${n} | energy equivalent = energy saved + ${REFUND} per turn saved`);
console.log(`free next move (priciest move): ${(free / n).toFixed(1)}`);
console.log(`half-cost next move: ${(half / n).toFixed(1)}`);
console.log(`double points on the first move: ${(dbl / n).toFixed(1)}`);
console.log(`reroll one pool, any board: ${(rerollAll / n).toFixed(1)} | worst-quartile boards only: ${(rerollBad / badN).toFixed(1)}`);
console.log(`board refresh, worst-quartile boards only: ${(refreshBad / badN).toFixed(1)}`);
console.log(`best single digit swap (XY -> YX): ${(swap / n).toFixed(1)}`);
