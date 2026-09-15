// S1b: full-run win-rate change when a ones-digit pair is removed from both
// pools after round 1 (sim-plan-2.md §S1). By default runs S1a's 5 strongest,
// 5 median and 5 weakest pairs; PAIRS=all runs all 45, split across
// processes with SHARD/SHARDS. BASE_N=0 skips the baseline so one separate
// run can supply it.
// Usage: N=300 BASE_N=1200 node s1b-pair-winrate.mjs
//        PAIRS=all N=1200 BASE_N=0 SHARD=0 SHARDS=6 node s1b-pair-winrate.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 300);
const BASE_N = Number(process.env.BASE_N ?? 1200);
const PLAYER = process.env.PLAYER || 'average';
const SHARD = Number(process.env.SHARD || 0);
const SHARDS = Number(process.env.SHARDS || 1);

const SAMPLE = {
  strongest: [[5, 8], [6, 8], [7, 8], [8, 9], [5, 9]],
  median: [[3, 5], [2, 9], [3, 9], [0, 6], [2, 5]],
  weakest: [[0, 2], [2, 3], [0, 1], [1, 3], [1, 2]],
};
const allPairs = [];
for (let x = 0; x <= 9; x++) for (let y = x + 1; y <= 9; y++) allPairs.push([x, y]);
const groups = process.env.PAIRS === 'all' ? { all: allPairs.filter((_, i) => i % SHARDS === SHARD) } : SAMPLE;

const removePair = (x, y) => (c) => {
  const keep = (v) => v % 10 !== x && v % 10 !== y;
  return { ...c, domainA: c.domainA.filter(keep), domainB: c.domainB.filter(keep) };
};

const base = BASE_N > 0 ? runMany(PLAYER, baseConfig, BASE_N) : null;
if (base) console.log(`${PLAYER} baseline (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
console.log(`${N} runs per pair, removed after round 1.${base ? ' "~" marks a change within 2x its error.' : ''}`);
console.log(base ? 'group | pair | win% | change' : 'group | pair | win%');
for (const [group, pairs] of Object.entries(groups)) {
  for (const [x, y] of pairs) {
    const s = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === 1 ? removePair(x, y)(cfg) : cfg) });
    const row = `${group} | ${x} & ${y} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)}`;
    if (!base) { console.log(row); continue; }
    const d = s.winPct - base.winPct;
    const se = Math.hypot(s.stderr, base.stderr);
    console.log(`${row} | ${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)}`);
  }
}
