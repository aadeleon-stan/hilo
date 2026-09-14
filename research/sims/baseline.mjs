// Harness validation with no upgrades (upgrades-research.md §1).
// Expected: average ≈ 65%, planner ≈ 97–99%, planner medians near the shipped
// energy par tables in src/store/gameLogic.js.
// Usage: PLAYERS=average,planner N=300 node baseline.mjs
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 300);
const PLAYERS = (process.env.PLAYERS || 'average,planner').split(',');

for (const player of PLAYERS) {
  const s = runMany(player, baseConfig, N);
  console.log(`${player} (${N} runs): win ${s.winPct.toFixed(1)}% ±${s.stderr.toFixed(1)} | deaths% by round ${s.deathsPct.map((d) => d.toFixed(0)).join('/')}`);
  console.log(`  median gross by round: [${s.medianGross.join(', ')}]`);
  console.log(`  median net by round:   [${s.medianNet.join(', ')}]`);
  const p = s.perRound;
  console.log(`  per cleared round: spent ${p.gross.toFixed(1)} | bonus ${p.bonus.toFixed(1)} | refund ${p.refund.toFixed(1)} (lost to cap ${p.refundLost.toFixed(1)}) | turns left ${p.turnsLeft.toFixed(2)} | overshoot ${p.overshoot.toFixed(1)}`);
}
