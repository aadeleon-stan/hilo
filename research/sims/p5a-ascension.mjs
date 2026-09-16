// P5a (sim-plan-3.md): ascension-style modifiers on the 40-79 start. The
// 80s, the 90s, or both are in both pools from round 1, locked so "remove the
// highest decade" can't take them out. Both players draft well (P2a's table)
// at the chosen schedule; reports how much each level costs against the
// first level listed.
// Usage: N=600 N_PLANNER=200 LEVELS=none,80,90,80+90 node p5a-ascension.mjs
import { readFileSync } from 'node:fs';
import { runMany } from './upgrade-sim.mjs';
import { policies, draftHook } from './draft-pool-3.mjs';
import { round3Start } from './round3-config.mjs';

const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 200);
const PLAYERS = (process.env.PLAYERS || 'average,planner').split(',');
const LEVELS = (process.env.LEVELS || 'none,80,90,80+90').split(',');
const VALUES = JSON.parse(readFileSync(new URL('./values-4079.json', import.meta.url), 'utf8')).values;

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const withLockedDecades = (c, ds) => {
  const merge = (dom) => [...new Set([...dom, ...ds.flatMap(decade)])].sort((a, b) => a - b);
  return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB), lockedDecades: ds };
};
const decadesOf = (level) => (level === 'none' ? [] : level.split('+').map(Number));
const deaths = (s) => s.deathsPct.map((p) => p.toFixed(0)).join('/');

console.log('player | level | runs | win% | change vs first level | rounds cleared | deaths% by round');
for (const player of PLAYERS) {
  const n = player === 'planner' ? N_PLANNER : N;
  if (n <= 0) continue;
  let base = null;
  for (const level of LEVELS) {
    const ds = decadesOf(level);
    const s = runMany(player, () => withLockedDecades(round3Start(), ds), n, { onRoundWin: draftHook(policies.best(VALUES)) });
    let change = '-';
    if (base) {
      const d = s.winPct - base.winPct;
      const se = Math.hypot(s.stderr, base.stderr);
      change = `${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)}`;
    } else {
      base = s;
    }
    console.log(`${player} | ${level} | ${n} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${change} | ${s.meanRoundsCleared.toFixed(2)} | ${deaths(s)}`);
  }
}
