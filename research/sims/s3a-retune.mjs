// S3a: retune a constrained starting range (sim-plan-2.md §S3a). Binary-
// searches targetScale until the average player's win rate lands near
// today's baseline (~65-67%), expanding the search bracket first if needed,
// then confirms the planner at the chosen point.
// Usage: RANGE=40,79 N_AVG=200 N_PLANNER=100 node s3a-retune.mjs
import { baseConfig, startConfig, runMany } from './upgrade-sim.mjs';

const RANGE = (process.env.RANGE || '40,79').split(',').map(Number);
const N_AVG = Number(process.env.N_AVG || 200);
const N_PLANNER = Number(process.env.N_PLANNER || 100);
const TARGET_WIN = Number(process.env.TARGET_WIN || 66);
const TOL = Number(process.env.TOL || 2);

function cfgFactory(scale) {
  return () => ({ ...baseConfig(), ...startConfig(RANGE), targetScale: scale });
}
const evalScale = (scale, n) => runMany('average', cfgFactory(scale), n);
const show = (label, scale, r) => console.log(`  ${label}=${scale.toFixed(3)} -> ${r.winPct.toFixed(1)}% ±${r.stderr.toFixed(1)}`);

console.log(`range ${RANGE[0]}-${RANGE[1]} | searching targetScale for average win% ~ ${TARGET_WIN} (n=${N_AVG}/point)`);

let lo = 0.3, hi = 1.6;
let loResult = evalScale(lo, N_AVG);
let hiResult = evalScale(hi, N_AVG);
show('lo', lo, loResult);
show('hi', hi, hiResult);

while (loResult.winPct < TARGET_WIN && lo > 0.02) {
  lo = Math.max(lo / 2, 0.02);
  loResult = evalScale(lo, N_AVG);
  show('lo (expanded)', lo, loResult);
}
while (hiResult.winPct > TARGET_WIN && hi < 25) {
  hi = Math.min(hi * 1.5, 25);
  hiResult = evalScale(hi, N_AVG);
  show('hi (expanded)', hi, hiResult);
}
if (loResult.winPct < TARGET_WIN) console.log(`  WARNING: even at scale ${lo}, win% (${loResult.winPct.toFixed(1)}) is still below target — this range may need more max energy too, not just a lower target.`);
if (hiResult.winPct > TARGET_WIN) console.log(`  WARNING: even at scale ${hi}, win% (${hiResult.winPct.toFixed(1)}) is still above target — targetScale alone can't reach this difficulty in range.`);

let best = { scale: lo, r: loResult };
if (Math.abs(hiResult.winPct - TARGET_WIN) < Math.abs(best.r.winPct - TARGET_WIN)) best = { scale: hi, r: hiResult };

for (let iter = 0; iter < 8; iter++) {
  const mid = (lo + hi) / 2;
  const r = evalScale(mid, N_AVG);
  show('mid', mid, r);
  if (Math.abs(r.winPct - TARGET_WIN) < Math.abs(best.r.winPct - TARGET_WIN)) best = { scale: mid, r };
  if (r.winPct > TARGET_WIN) lo = mid; else hi = mid;
  if (Math.abs(r.winPct - TARGET_WIN) < TOL) break;
}

console.log(`\nChosen targetScale ${best.scale.toFixed(3)} for range ${RANGE[0]}-${RANGE[1]}: average ${best.r.winPct.toFixed(1)}% ±${best.r.stderr.toFixed(1)} (n=${N_AVG})`);
const plannerResult = runMany('planner', cfgFactory(best.scale), N_PLANNER);
console.log(`Planner at that scale: ${plannerResult.winPct.toFixed(1)}% ±${plannerResult.stderr.toFixed(1)} (n=${N_PLANNER})`);
