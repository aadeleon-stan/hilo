// S2e: exact odds-chart data for weighted-draw settings (sim-plan-2.md §S2).
// No simulation — an exact forward DP over remaining-count states for three
// symmetric weight classes (10s, 90s, everything else), since all values
// within a class share a weight and are exchangeable under weighted sampling
// without replacement. Self-checks the baseline (all weights 1) against the
// closed-form hypergeometric distribution before trusting the DP.
//
// Usage: node s2e-odds-chart.mjs
const POOL_SIZE = 9;
const SIZES = { tens: 10, nineties: 10, mid: 70 }; // 20s..80s: 7 decades x 10
const CLASSES = ['tens', 'nineties', 'mid'];

function exactDistribution(wTens, wNineties, wMid = 1) {
  const weights = { tens: wTens, nineties: wNineties, mid: wMid };
  const key = (r) => CLASSES.map((c) => r[c]).join(',');
  const parse = (k) => { const [tens, nineties, mid] = k.split(',').map(Number); return { tens, nineties, mid }; };

  let dp = new Map([[key(SIZES), 1]]);
  for (let step = 0; step < POOL_SIZE; step++) {
    const next = new Map();
    for (const [k, p] of dp) {
      const r = parse(k);
      const totalW = CLASSES.reduce((acc, c) => acc + r[c] * weights[c], 0);
      for (const c of CLASSES) {
        if (r[c] <= 0) continue;
        const pc = (r[c] * weights[c]) / totalW;
        const r2 = { ...r, [c]: r[c] - 1 };
        const k2 = key(r2);
        next.set(k2, (next.get(k2) || 0) + p * pc);
      }
    }
    dp = next;
  }

  const expected = { tens: 0, nineties: 0, mid: 0 };
  const tensDrawnDist = Array(POOL_SIZE + 1).fill(0);
  let totalP = 0;
  for (const [k, p] of dp) {
    const r = parse(k);
    const drawn = { tens: SIZES.tens - r.tens, nineties: SIZES.nineties - r.nineties, mid: SIZES.mid - r.mid };
    expected.tens += p * drawn.tens;
    expected.nineties += p * drawn.nineties;
    expected.mid += p * drawn.mid;
    tensDrawnDist[drawn.tens] += p;
    totalP += p;
  }
  return { expected, pAtLeastOneTen: 1 - tensDrawnDist[0], tensDrawnDist, totalP };
}

// Self-check: baseline (all weights 1, plain uniform sampling) must match the
// closed-form hypergeometric mean (n*K/N) and P(X=0) for the 10s class.
{
  const N = 90, K = 10, n = POOL_SIZE;
  const hyperMean = (n * K) / N;
  let hyperP0 = 1;
  for (let i = 0; i < n; i++) hyperP0 *= (N - K - i) / (N - i);
  const dp = exactDistribution(1, 1);
  const meanOk = Math.abs(dp.expected.tens - hyperMean) < 1e-9;
  const p0Ok = Math.abs(dp.tensDrawnDist[0] - hyperP0) < 1e-9;
  const massOk = Math.abs(dp.totalP - 1) < 1e-9;
  console.log(`selftest: E[tens] DP=${dp.expected.tens.toFixed(6)} vs hypergeometric=${hyperMean.toFixed(6)} -> ${meanOk ? 'PASS' : 'FAIL'}`);
  console.log(`selftest: P(0 tens) DP=${dp.tensDrawnDist[0].toFixed(6)} vs hypergeometric=${hyperP0.toFixed(6)} -> ${p0Ok ? 'PASS' : 'FAIL'}`);
  console.log(`selftest: DP distribution sums to 1 -> ${massOk ? 'PASS' : 'FAIL'}`);
  if (!meanOk || !p0Ok || !massOk) { console.error('DP self-check failed; not trusting the chart data.'); process.exit(1); }
  console.log('');
}

const SETTINGS = [
  { name: 'baseline (no upgrade)', wTens: 1, wNineties: 1 },
  { name: '10s x1.5', wTens: 1.5, wNineties: 1 },
  { name: '10s x2', wTens: 2, wNineties: 1 },
  { name: '10s x3', wTens: 3, wNineties: 1 },
  { name: '90s x0.5', wTens: 1, wNineties: 0.5 },
  { name: '90s x0.25', wTens: 1, wNineties: 0.25 },
  { name: '10s x2 + 90s x0.5 (combined)', wTens: 2, wNineties: 0.5 },
];

console.log('Exact odds-chart data for a 9-tile weighted pool draw (one affected pool; the other pool, if unaffected, stays at baseline).');
console.log('setting | E[10s count] | E[90s count] | E[per other decade] | P(>=1 ten)');
const results = SETTINGS.map((s) => ({ s, r: exactDistribution(s.wTens, s.wNineties) }));
for (const { s, r } of results) {
  console.log(`${s.name} | ${r.expected.tens.toFixed(3)} | ${r.expected.nineties.toFixed(3)} | ${(r.expected.mid / 7).toFixed(3)} | ${(r.pAtLeastOneTen * 100).toFixed(2)}%`);
}

console.log('\nFull distribution of 10s count in the pool, P(count = 0..9) as %, per setting:');
for (const { s, r } of results) {
  console.log(`${s.name}: [${r.tensDrawnDist.map((p) => (p * 100).toFixed(2)).join(', ')}]`);
}

console.log('\nMarginal step from stacking (win-rate marginal value should be checked against this in S2c):');
for (let i = 1; i < results.length && results[i].s.wNineties === 1; i++) {
  const prev = results[i - 1], cur = results[i];
  if (prev.s.wNineties !== 1) continue;
  console.log(`${prev.s.name} -> ${cur.s.name}: E[10s] +${(cur.r.expected.tens - prev.r.expected.tens).toFixed(3)}, P(>=1 ten) +${((cur.r.pAtLeastOneTen - prev.r.pAtLeastOneTen) * 100).toFixed(2)}pp`);
}
