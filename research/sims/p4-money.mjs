// P4a (sim-plan-3.md): how much win rate a money-seeking player gives up.
// Average player and planner, drafting well from P2a's table at the chosen
// schedule, with money valued at MU energy per unit. Money is reported as
// its own output; nothing converts it back into power (user decision).
// Provisional rates (env): PER_ROUND 5, PER_TURN 2 per leftover turn,
// PER_OVERSHOOT 0.1 per point over target, PER_OPTIMAL 2 per Optimal play.
// Usage: MUS=0,0.1,0.25,0.5,1,2 N=600 N_PLANNER=200 node p4-money.mjs
import { readFileSync } from 'node:fs';
import { runManyRaw, summarize } from './upgrade-sim.mjs';
import { policies, draftHook } from './draft-pool-3.mjs';
import { round3Start } from './round3-config.mjs';

const MUS = (process.env.MUS || '0,0.1,0.25,0.5,1,2').split(',').map(Number);
const PLAYERS = (process.env.PLAYERS || 'average,planner').split(',');
const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 200);
const RATES = {
  moneyPerRound: Number(process.env.PER_ROUND ?? 5),
  moneyPerTurnLeft: Number(process.env.PER_TURN ?? 2),
  moneyPerOvershoot: Number(process.env.PER_OVERSHOOT ?? 0.1),
  moneyPerOptimal: Number(process.env.PER_OPTIMAL ?? 2),
};
const VALUES = JSON.parse(readFileSync(new URL('./values-4079.json', import.meta.url), 'utf8')).values;

console.log(`money rates: ${RATES.moneyPerRound} per round won, ${RATES.moneyPerTurnLeft} per leftover turn, ${RATES.moneyPerOvershoot} per overshoot point, ${RATES.moneyPerOptimal} per Optimal play`);
console.log('player | mu | runs | win% | rounds cleared | money per run | per cleared round: money, turns left, overshoot, Optimal plays | tightest round energy, median (p10)');
for (const player of PLAYERS) {
  const n = player === 'planner' ? N_PLANNER : N;
  if (n <= 0) continue;
  for (const mu of MUS) {
    const results = runManyRaw(player, () => ({ ...round3Start(), ...RATES, moneyWeight: mu }), n, { onRoundWin: draftHook(policies.best(VALUES)) });
    const s = summarize(results);
    const perRun = results.map((r) => r.rounds.reduce((t, rd) => t + rd.money, 0));
    const mean = s.moneyPerRun;
    const se = Math.sqrt(perRun.reduce((t, x) => t + (x - mean) ** 2, 0) / Math.max(1, n - 1) / n);
    const rounds = results.flatMap((r) => r.rounds);
    const optimal = rounds.reduce((t, rd) => t + rd.bestPlays, 0) / Math.max(1, rounds.length);
    const p = s.perRound;
    const tight = s.tightestRound.median === null ? '-' : `${s.tightestRound.median} (${s.tightestRound.p10})`;
    console.log(`${player} | ${mu} | ${n} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${s.meanRoundsCleared.toFixed(2)} | ${mean.toFixed(1)} ±${se.toFixed(1)} | ${p.money.toFixed(1)}, ${p.turnsLeft.toFixed(2)}, ${p.overshoot.toFixed(1)}, ${optimal.toFixed(2)} | ${tight}`);
  }
}
