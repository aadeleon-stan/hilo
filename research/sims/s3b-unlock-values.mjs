// S3b: value of each decade unlock on a constrained start, granted after
// round 1 (sim-plan-2.md §S3). An unlock adds the decade to both pools.
// Energy spent per cleared round is printed too, since it still separates
// unlocks when win rates hit the ceiling.
// Usage: RANGE=40,79 TARGET_SCALE=0.564 N=600 BASE_N=1200 node s3b-unlock-values.mjs
import { runMany, baseConfig, startConfig } from './upgrade-sim.mjs';

const RANGE = (process.env.RANGE || '40,79').split(',').map(Number);
const TARGET_SCALE = Number(process.env.TARGET_SCALE || 0.564);
const N = Number(process.env.N || 600);
const BASE_N = Number(process.env.BASE_N || 1200);
const PLAYER = process.env.PLAYER || 'average';

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const unlock = (decades) => (c) => {
  const merge = (dom) => [...new Set([...dom, ...decades.flatMap(decade)])].sort((a, b) => a - b);
  return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB) };
};

const UNLOCKS = [
  ['+30s', [30]],
  ['+20s', [20]],
  ['+10s', [10]],
  ['+80s', [80]],
  ['+90s', [90]],
  ['+10s & +90s', [10, 90]],
  ['+20s & +80s', [20, 80]],
  ['+30s & +80s', [30, 80]],
];

const start = () => ({ ...baseConfig(), ...startConfig(RANGE), targetScale: TARGET_SCALE });
const base = runMany(PLAYER, start, BASE_N);
console.log(`${PLAYER}, start ${RANGE[0]}-${RANGE[1]}, targetScale ${TARGET_SCALE}`);
console.log(`no unlock (${BASE_N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)} | spent/round ${base.perRound.gross.toFixed(1)}`);
console.log(`${N} runs per unlock, granted after round 1. "~" marks a change within 2x its error.`);
console.log('unlock | win% | change | spent/round');
for (const [name, decades] of UNLOCKS) {
  const s = runMany(PLAYER, start, N, { onRoundWin: (cfg, r) => (r === 1 ? unlock(decades)(cfg) : cfg) });
  const d = s.winPct - base.winPct;
  const se = Math.hypot(s.stderr, base.stderr);
  console.log(`${name} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)} | ${s.perRound.gross.toFixed(1)}`);
}
