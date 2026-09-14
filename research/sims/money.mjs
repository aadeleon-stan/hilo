// Distributions of the proposed money sources: leftover turns and overshoot
// per round, plus totals at shop points (upgrades-research.md §6).
// Usage: PLAYER=average N=400 node money.mjs
import { simulateRun, players, baseConfig, RUN_ROUNDS } from './upgrade-sim.mjs';

const N = Number(process.env.N || 400);
const PLAYER = process.env.PLAYER || 'average';
const runs = Array.from({ length: N }, () => simulateRun(players[PLAYER], baseConfig()));
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

console.log(`${PLAYER}, ${N} runs, win ${((runs.filter((r) => r.won).length / N) * 100).toFixed(1)}%`);
console.log('round | cleared | turns left mean (p10/p50/p90) | overshoot mean (p10/p50/p90) | Optimal plays mean');
for (let r = 1; r <= RUN_ROUNDS; r++) {
  const rs = runs.flatMap((x) => x.rounds.filter((rd) => rd.round === r));
  const tl = rs.map((x) => x.turnsLeft), ov = rs.map((x) => x.overshoot), bp = rs.map((x) => x.bestPlays);
  console.log(`${r} | ${rs.length} | ${mean(tl).toFixed(2)} (${q(tl, 0.1)}/${q(tl, 0.5)}/${q(tl, 0.9)}) | ${mean(ov).toFixed(1)} (${q(ov, 0.1)}/${q(ov, 0.5)}/${q(ov, 0.9)}) | ${mean(bp).toFixed(2)}`);
}
for (const shopAfter of [3, 6, 9]) {
  const reached = runs.filter((x) => x.rounds.length >= shopAfter);
  const sum = (k) => reached.map((x) => x.rounds.slice(0, shopAfter).reduce((s, rd) => s + rd[k], 0));
  const turns = sum('turnsLeft'), over = sum('overshoot'), best = sum('bestPlays');
  console.log(`after round ${shopAfter}: ${reached.length} runs | turns left median ${q(turns, 0.5)} (p10 ${q(turns, 0.1)}, p90 ${q(turns, 0.9)}) | overshoot median ${q(over, 0.5)} (p10 ${q(over, 0.1)}, p90 ${q(over, 0.9)}) | Optimal plays median ${q(best, 0.5)}`);
}
