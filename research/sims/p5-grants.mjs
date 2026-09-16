// P5b-c (sim-plan-3.md): controlled runs for high-decade curses, bonuses and
// enablers on the 40-79 start at the chosen schedule. Each cell grants a set
// after round 1; every cell then drafts with POLICY from the P2 pool (well =
// P2a's table, or random), never offering a granted offer again.
//   curse-80s / curse-90s   add that decade to both pools, locked against removal
//   refund-x<m>             multiply the round-end refund by m (an energy-regain passive)
//   any offer id from draft-pool-3.mjs
// Cells are separated by "|", each "name:grant,grant". The first cell is the reference.
// Usage: CELLS="none:|curse:curse-80s|curse + regain:curse-80s,refund-x1.5" POLICY=random N=600 N_PLANNER=0 node p5-grants.mjs
import { readFileSync } from 'node:fs';
import { runMany } from './upgrade-sim.mjs';
import { OFFERS, byId, policies, draftHook } from './draft-pool-3.mjs';
import { round3Start } from './round3-config.mjs';

const CELLS = (process.env.CELLS || 'none:|curse-80s:curse-80s').split('|').map((spec) => {
  const [name, list = ''] = spec.split(':');
  return { name: name.trim(), grants: list.split(',').map((g) => g.trim()).filter(Boolean) };
});
const POLICY = process.env.POLICY || 'well';
const PLAYERS = (process.env.PLAYERS || 'average,planner').split(',');
const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 200);
const VALUES = JSON.parse(readFileSync(new URL('./values-4079.json', import.meta.url), 'utf8')).values;

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
function applyGrant(c, token) {
  const curse = token.match(/^curse-(\d0)s$/);
  if (curse) {
    const d = Number(curse[1]);
    const merge = (dom) => [...new Set([...dom, ...decade(d)])].sort((a, b) => a - b);
    return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB), lockedDecades: [...(c.lockedDecades || []), d] };
  }
  const regain = token.match(/^refund-x([\d.]+)$/);
  if (regain) return { ...c, refundMultiplier: c.refundMultiplier * Number(regain[1]) };
  if (byId[token]) {
    if (!byId[token].eligible(c)) throw new Error(`${token} isn't eligible when granted after round 1`);
    return byId[token].apply(c);
  }
  throw new Error(`unknown grant "${token}"`);
}
for (const cell of CELLS) cell.grants.reduce(applyGrant, round3Start());

function options(cell) {
  const pool = OFFERS.filter((o) => !cell.grants.includes(o.id));
  const policy = POLICY === 'random' ? policies.random() : policies.best(VALUES);
  const background = draftHook(policy, pool);
  return { onRoundWin: (cfg, r, E, draft) => (r === 1 ? cell.grants.reduce(applyGrant, cfg) : background(cfg, r, E, draft)) };
}

console.log(`chosen schedule, 40-79 start; grants after round 1, then drafting ${POLICY === 'random' ? 'randomly' : 'well'} from the P2 pool`);
console.log('player | cell | grants | runs | win% | change vs first cell | rounds cleared');
for (const player of PLAYERS) {
  const n = player === 'planner' ? N_PLANNER : N;
  if (n <= 0) continue;
  let base = null;
  for (const cell of CELLS) {
    const s = runMany(player, round3Start, n, options(cell));
    let change = '-';
    if (base) {
      const d = s.winPct - base.winPct;
      const se = Math.hypot(s.stderr, base.stderr);
      change = `${Math.abs(d) < 2 * se ? '~' : ''}${d >= 0 ? '+' : ''}${d.toFixed(1)} ±${se.toFixed(1)}`;
    } else {
      base = s;
    }
    console.log(`${player} | ${cell.name} | ${cell.grants.join(', ') || 'none'} | ${n} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${change} | ${s.meanRoundsCleared.toFixed(2)}`);
  }
}
