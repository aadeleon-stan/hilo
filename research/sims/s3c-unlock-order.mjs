// S3c: does unlock order matter? Fixed unlock paths granted after rounds 2,
// 4 and 6 on a constrained start (sim-plan-2.md §S3). near-first and
// lowest-first unlock the same decades in opposite orders, so they isolate
// order; the other paths also differ in which decades they unlock.
// Usage: RANGE=40,79 TARGET_SCALE=0.564 N=600 BASE_N=1200 node s3c-unlock-order.mjs
import { runMany, baseConfig, startConfig } from './upgrade-sim.mjs';

const RANGE = (process.env.RANGE || '40,79').split(',').map(Number);
const TARGET_SCALE = Number(process.env.TARGET_SCALE || 0.564);
const N = Number(process.env.N || 600);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';
const GRANT_ROUNDS = [2, 4, 6];

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const unlock = (d) => (c) => {
  const merge = (dom) => [...new Set([...dom, ...decade(d)])].sort((a, b) => a - b);
  return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB) };
};

const PATHS = [
  ['near-first', [30, 20, 10]],
  ['lowest-first', [10, 20, 30]],
  ['high-first', [80, 90, 30]],
  ['alternating', [30, 80, 20]],
];

const deaths = (s) => s.deathsPct.map((p) => p.toFixed(0)).join('/');
const start = () => ({ ...baseConfig(), ...startConfig(RANGE), targetScale: TARGET_SCALE });
const base = runMany(PLAYER, start, BASE_N);
console.log(`${PLAYER}, start ${RANGE[0]}-${RANGE[1]}, targetScale ${TARGET_SCALE}, unlocks after rounds ${GRANT_ROUNDS.join(', ')}`);
console.log(`no unlocks (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)} | spent/round ${base.perRound.gross.toFixed(1)} | deaths% by round ${deaths(base)}`);
console.log(`${N} runs per path. "~" marks a change within 2x its error.`);
console.log('path | unlocks in order | win% | change | spent/round | deaths% by round');
for (const [name, path] of PATHS) {
  const s = runMany(PLAYER, start, N, {
    onRoundWin: (cfg, r) => {
      const i = GRANT_ROUNDS.indexOf(r);
      return i >= 0 ? unlock(path[i])(cfg) : cfg;
    },
  });
  const d = s.winPct - base.winPct;
  const se = Math.hypot(s.stderr, base.stderr);
  console.log(`${name} | ${path.map((x) => `${x}s`).join(' > ')} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)} | ${s.perRound.gross.toFixed(1)} | ${deaths(s)}`);
}
