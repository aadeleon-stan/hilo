// S1a: single-round cost screen for ones-digit pair removals (sim-plan-2.md
// §S1). Same method as single-round-restrictions.mjs: one-move-at-a-time
// skilled player trying several cost weights, target 300, 9 turns, best
// weight kept per board.
//
// Variants: all 45 unordered digit pairs removed from both pools, plus all
// 100 ordered (digit removed from A, digit removed from B) assignments
// (including the same digit in both) — 145 total.
//
// Usage: N=1000 node s1a-pair-screen.mjs
import { computeProduct } from '../../src/store/gameLogic.js';

const N = Number(process.env.N || 1000);
const T = Number(process.env.TARGET || 300);
const ALL = Array.from({ length: 90 }, (_, i) => i + 10);

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

function screen(domainA, domainB, n) {
  const es = [];
  let fails = 0, cheapHigh = 0;
  for (let k = 0; k < n; k++) {
    const A = pool(domainA), B = pool(domainB);
    for (const a of A) for (const b of B) { const p = computeProduct(a, b); if (p.lowWord >= 80 && p.highWord <= 15) cheapHigh++; }
    const r = round(A, B);
    if (r) es.push(r.e); else fails++;
  }
  const mean = es.length ? es.reduce((a, b) => a + b, 0) / es.length : null;
  const variance = es.length > 1 ? es.reduce((a, x) => a + (x - mean) ** 2, 0) / (es.length - 1) : 0;
  return {
    mean,
    stderr: es.length ? Math.sqrt(variance / es.length) : null,
    fail: (fails / n) * 100,
    cheapHigh: cheapHigh / n,
  };
}

const baseline = screen(ALL, ALL, N);
// A variant's energy-saved% is a difference of two means; its own stderr combines both.
const combinedSE = (r) => Math.sqrt(baseline.stderr ** 2 + r.stderr ** 2);
const pctSE = (r) => (combinedSE(r) / baseline.mean) * 100;
const isNoise = (r) => Math.abs(r.savedPct) < 2 * pctSE(r);

const variants = [];
for (let d1 = 0; d1 <= 9; d1++) {
  for (let d2 = d1 + 1; d2 <= 9; d2++) {
    const dom = ALL.filter((v) => v % 10 !== d1 && v % 10 !== d2);
    variants.push({ kind: 'both', label: `remove ${d1} & ${d2} (both pools)`, domainA: dom, domainB: dom });
  }
}
for (let dA = 0; dA <= 9; dA++) {
  for (let dB = 0; dB <= 9; dB++) {
    const domA = ALL.filter((v) => v % 10 !== dA);
    const domB = ALL.filter((v) => v % 10 !== dB);
    variants.push({ kind: 'ordered', label: `remove ${dA} from A, ${dB} from B`, dA, dB, domainA: domA, domainB: domB });
  }
}

console.log(`S1a screen | target ${T}, ${N} boards/variant, ${variants.length} variants | baseline mean energy ${baseline.mean.toFixed(1)} ±${baseline.stderr.toFixed(2)} (fail% ${baseline.fail.toFixed(1)})`);
console.log(`Per-variant sampling error on energy-saved% is about ±${pctSE({ stderr: baseline.stderr }).toFixed(1)} (1 SE); differences under 2x that are noise and marked with "~".`);

const rows = variants.map((v) => {
  const r = screen(v.domainA, v.domainB, N);
  const savedPct = ((baseline.mean - r.mean) / baseline.mean) * 100;
  return { ...v, ...r, savedPct, se: pctSE(r), noise: isNoise({ ...r, savedPct }) };
});

const fmt = (r) => `${r.noise ? '~' : ''}${r.savedPct.toFixed(1)}%`;

console.log('\nkind | label | mean energy ±SE | energy saved vs none | fail% | cheap high-scoring moves/board');
for (const r of rows) {
  console.log(`${r.kind} | ${r.label} | ${r.mean.toFixed(1)}±${r.stderr.toFixed(2)} | ${fmt(r)} | ${r.fail.toFixed(1)} | ${r.cheapHigh.toFixed(1)}`);
}

const bothPairs = rows.filter((r) => r.kind === 'both').sort((a, b) => b.savedPct - a.savedPct);
console.log('\nBoth-pools pairs (45), strongest to weakest ("~" = within noise):');
for (const r of bothPairs) console.log(`  ${r.label} | saved ${fmt(r)} | mean ${r.mean.toFixed(1)}`);

const ordered = rows.filter((r) => r.kind === 'ordered').sort((a, b) => b.savedPct - a.savedPct);
console.log('\nOrdered pairs (100), top 15 by energy saved:');
for (const r of ordered.slice(0, 15)) console.log(`  A:${r.dA} B:${r.dB} | saved ${fmt(r)} | mean ${r.mean.toFixed(1)}`);
console.log('Ordered pairs (100), bottom 15 by energy saved:');
for (const r of ordered.slice(-15)) console.log(`  A:${r.dA} B:${r.dB} | saved ${fmt(r)} | mean ${r.mean.toFixed(1)}`);

const realOrdered = ordered.filter((r) => !r.noise);
console.log(`\n${realOrdered.length} of 100 ordered pairs clear 2x sampling error; ${100 - realOrdered.length} are noise at N=${N}.`);
const realBoth = bothPairs.filter((r) => !r.noise);
console.log(`${realBoth.length} of 45 both-pools pairs clear 2x sampling error; ${45 - realBoth.length} are noise at N=${N}.`);

const grid = Array.from({ length: 10 }, () => Array(10).fill(0));
for (const r of rows) if (r.kind === 'ordered') grid[r.dA][r.dB] = r.savedPct;
console.log('\nHeat map: rows = digit removed from A, cols = digit removed from B, cells = energy saved % (noise not marked here, see table above):');
console.log('A\\B  ' + Array.from({ length: 10 }, (_, i) => i).map((d) => String(d).padStart(6)).join(''));
for (let dA = 0; dA <= 9; dA++) {
  console.log(`${dA}    ` + grid[dA].map((v) => v.toFixed(1).padStart(6)).join(''));
}
