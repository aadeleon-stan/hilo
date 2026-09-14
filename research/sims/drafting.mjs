// Pick-one-of-three drafting after every round won, with targets climbing an
// extra K per round (upgrades-research.md §4). Round r target = shipped + K*(r-1).
// Usage: PLAYER=average N=200 K=20,25,30 POLICIES=best,random,worst,none node drafting.mjs
//        PLAYER=planner N=100 K=30 POLICIES=best node drafting.mjs
import { simulateRun, players, baseConfig, summarize } from './upgrade-sim.mjs';
import { policies, draftHook } from './draft-pool.mjs';

const N = Number(process.env.N || 200);
const PLAYER = process.env.PLAYER || 'average';
const KS = (process.env.K || '0,20,25,30,35,40').split(',').map(Number);
const POLICIES = (process.env.POLICIES || 'best,random,worst,none').split(',');

console.log(`${PLAYER}, ${N} runs per cell | round r target = shipped + K*(r-1)`);
console.log(`K | ${POLICIES.join(' | ')}`);
for (const k of KS) {
  const cells = [];
  const pickCounts = {};
  for (const name of POLICIES) {
    const picks = [];
    const results = Array.from({ length: N }, () => simulateRun(players[PLAYER], baseConfig(), { onRoundWin: draftHook(policies[name], k, picks) }));
    const s = summarize(results);
    cells.push(`${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)}`);
    if (name === 'best') picks.forEach((p) => (pickCounts[p] = (pickCounts[p] || 0) + 1));
  }
  console.log(`${k} | ${cells.join(' | ')}`);
  if (Object.keys(pickCounts).length) {
    console.log(`  best-policy picks: ${Object.entries(pickCounts).sort((a, b) => b[1] - a[1]).map(([id, c]) => `${id} ${c}`).join(', ')}`);
  }
}
