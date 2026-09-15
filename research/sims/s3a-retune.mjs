// S3a: retune a constrained starting range (sim-plan-2.md §S3a). Binary-
// searches targetScale until the average player's win rate lands near
// TARGET_WIN (default 66%, today's baseline), expanding the search bracket
// first if needed, then confirms the planner at the chosen point.
//
// Also used for S3b-c, where fixed-target win rates hit the ceiling:
//   UNLOCK=10,90          decades added to both pools from the start
//   UNLOCK_PATH=30,20,10  decades added one at a time after GRANT_ROUNDS (default 2,4,6)
//   N_PLANNER=0           skips the planner check
// Usage: RANGE=40,79 N_AVG=200 N_PLANNER=100 node s3a-retune.mjs
//        RANGE=40,79 UNLOCK=10 N_AVG=400 N_PLANNER=0 node s3a-retune.mjs
import { baseConfig, startConfig, runMany } from './upgrade-sim.mjs';

const list = (s) => (s ? s.split(',').map(Number) : []);
const RANGE = list(process.env.RANGE || '40,79');
const UNLOCK = list(process.env.UNLOCK);
const UNLOCK_PATH = list(process.env.UNLOCK_PATH);
const GRANT_ROUNDS = list(process.env.GRANT_ROUNDS || '2,4,6');
const N_AVG = Number(process.env.N_AVG || 200);
const N_PLANNER = Number(process.env.N_PLANNER ?? 100);
const TARGET_WIN = Number(process.env.TARGET_WIN || 66);
const TOL = Number(process.env.TOL || 2);

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const withDecades = (c, decades) => {
  if (!decades.length) return c;
  const merge = (dom) => [...new Set([...dom, ...decades.flatMap(decade)])].sort((a, b) => a - b);
  return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB) };
};

function cfgFactory(scale) {
  return () => withDecades({ ...baseConfig(), ...startConfig(RANGE), targetScale: scale }, UNLOCK);
}
const options = UNLOCK_PATH.length
  ? {
      onRoundWin: (cfg, r) => {
        const i = GRANT_ROUNDS.indexOf(r);
        return i >= 0 && i < UNLOCK_PATH.length ? withDecades(cfg, [UNLOCK_PATH[i]]) : cfg;
      },
    }
  : undefined;
const evalScale = (scale, n) => runMany('average', cfgFactory(scale), n, options);
const show = (label, scale, r) => console.log(`  ${label}=${scale.toFixed(3)} -> ${r.winPct.toFixed(1)}% ±${r.stderr.toFixed(1)}`);

const decades = (ds) => ds.map((d) => `${d}s`).join(UNLOCK_PATH === ds ? ' > ' : ' + ');
const setup = `range ${RANGE[0]}-${RANGE[1]}`
  + (UNLOCK.length ? ` + ${decades(UNLOCK)}` : '')
  + (UNLOCK_PATH.length ? ` | unlocks ${decades(UNLOCK_PATH)} after rounds ${GRANT_ROUNDS.slice(0, UNLOCK_PATH.length).join(', ')}` : '');
console.log(`${setup} | searching targetScale for average win% ~ ${TARGET_WIN} (n=${N_AVG}/point)`);

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
if (loResult.winPct < TARGET_WIN) console.log(`  WARNING: even at scale ${lo}, win% (${loResult.winPct.toFixed(1)}) is still below target — this setup may need more max energy too, not just a lower target.`);
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

console.log(`\nChosen targetScale ${best.scale.toFixed(3)} for ${setup}: average ${best.r.winPct.toFixed(1)}% ±${best.r.stderr.toFixed(1)} (n=${N_AVG}) | deaths% by round ${best.r.deathsPct.map((p) => p.toFixed(0)).join('/')}`);
if (N_PLANNER > 0) {
  const plannerResult = runMany('planner', cfgFactory(best.scale), N_PLANNER, options);
  console.log(`Planner at that scale: ${plannerResult.winPct.toFixed(1)}% ±${plannerResult.stderr.toFixed(1)} (n=${N_PLANNER})`);
}
