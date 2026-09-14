// Board-level checks (upgrades-research.md §3 and §6): relic trigger
// frequencies on normal boards, and how pool upgrades change best plays and
// the smallest-number heuristic.
// Usage: N=4000 node board-effects.mjs
import {
  generatePool, computeProduct, getBestPlays, getBestPlayBonus, getRunTarget, RUN_ROUNDS, RUN_MAX_ENERGY,
} from '../../src/store/gameLogic.js';

const N = Number(process.env.N || 4000);

// Relic trigger frequencies.
{
  let shared = 0, sharedCount = 0, over4000Count = 0, highFactors = 0, squareProducts = 0;
  for (let k = 0; k < N * 5; k++) {
    const A = generatePool().map((c) => c.value), B = generatePool().map((c) => c.value);
    const common = A.filter((v) => B.includes(v)).length;
    if (common) shared++;
    sharedCount += common;
    for (const a of A) for (const b of B) {
      const p = computeProduct(a, b);
      if (p.product > 4000) over4000Count++;
      if (Number.isInteger(Math.sqrt(p.product))) squareProducts++;
    }
    highFactors += A.filter((v) => v >= 80).length + B.filter((v) => v >= 80).length;
  }
  const boards = N * 5;
  console.log(`relic triggers over ${boards} boards:`);
  console.log(`  same number in both pools: ${((shared / boards) * 100).toFixed(1)}% of boards, ${(sharedCount / boards).toFixed(2)} per board`);
  console.log(`  perfect-square products: ${(squareProducts / boards).toFixed(2)} of 81 per board`);
  console.log(`  products over 4000: ${(over4000Count / boards).toFixed(1)} of 81 per board`);
  console.log(`  80s/90s: ${(highFactors / boards / 2).toFixed(2)} per pool`);
}

// Best plays under pool variants.
const ALL = Array.from({ length: 90 }, (_, i) => i + 10);
function makePool(domain, size, guaranteeTens) {
  const vals = [];
  if (guaranteeTens) vals.push(10 + Math.floor(Math.random() * 10));
  while (vals.length < size) {
    const v = domain[Math.floor(Math.random() * domain.length)];
    if (!vals.includes(v)) vals.push(v);
  }
  return vals.map((value, id) => ({ id, value, used: false }));
}
const variants = {
  none: { A: ALL, B: ALL, size: 9 },
  'no 90s (both pools)': { A: ALL.filter((v) => v < 90), B: ALL.filter((v) => v < 90), size: 9 },
  'guaranteed 10s per pool': { A: ALL, B: ALL, size: 9, tens: true },
  'pool A limited to 10-49': { A: ALL.filter((v) => v <= 49), B: ALL, size: 9 },
  '+1 number per pool': { A: ALL, B: ALL, size: 10 },
};
console.log('variant | best plays per turn | Optimal bonus per best play | best plays include the smallest open number');
for (const [name, v] of Object.entries(variants)) {
  let n = 0, size = 0, bonus = 0, bonusN = 0, smallest = 0;
  for (let k = 0; k < N; k++) {
    const pa = makePool(v.A, v.size, v.tens), pb = makePool(v.B, v.size, v.tens);
    const used = Math.floor(Math.random() * (v.size - 2));
    pa.slice(0, used).forEach((c) => (c.used = true));
    pb.slice(0, used).forEach((c) => (c.used = true));
    const round = 1 + Math.floor(Math.random() * RUN_ROUNDS), t = getRunTarget(round);
    const best = getBestPlays(pa, pb, Math.floor(Math.random() * t), t, 20 + Math.floor(Math.random() * (RUN_MAX_ENERGY - 19)), RUN_ROUNDS - round + 1);
    if (!best.size) continue;
    n++; size += best.size;
    const minVal = Math.min(...[...pa, ...pb].filter((c) => !c.used).map((c) => c.value));
    let hasMin = false;
    for (const key of best) {
      const [i, j] = key.split(':').map(Number);
      bonus += getBestPlayBonus(computeProduct(pa[i].value, pb[j].value).highWord);
      bonusN++;
      if (pa[i].value === minVal || pb[j].value === minVal) hasMin = true;
    }
    if (hasMin) smallest++;
  }
  console.log(`${name} | ${(size / n).toFixed(2)} | ${(bonus / bonusN).toFixed(2)} | ${((smallest / n) * 100).toFixed(0)}%`);
}
