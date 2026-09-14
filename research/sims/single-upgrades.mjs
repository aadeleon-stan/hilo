// Win-rate effect of each single upgrade granted after a given round
// (upgrades-research.md §2–§3).
// Usage: PLAYER=average N=300 GRANT_ROUNDS=1,5 ONLY="no 90s (both pools)" node single-upgrades.mjs
import { pathToFileURL } from 'node:url';
import { runMany, baseConfig } from './upgrade-sim.mjs';

const N = Number(process.env.N || 300);
const PLAYER = process.env.PLAYER || 'average';
const GRANT_ROUNDS = (process.env.GRANT_ROUNDS || '1,5').split(',').map(Number);
const ONLY = process.env.ONLY;

const both = (c, keep) => ({ ...c, domainA: c.domainA.filter(keep), domainB: c.domainB.filter(keep) });
const noTens = (c) => both(c, (v) => v >= 20);

export const SINGLE_UPGRADES = {
  'no 90s (both pools)': (c) => both(c, (v) => v < 90),
  'no 90s (one pool)': (c) => ({ ...c, domainA: c.domainA.filter((v) => v < 90) }),
  'no 80s (both pools)': (c) => both(c, (v) => v < 80 || v >= 90),
  'no 70s (both pools)': (c) => both(c, (v) => v < 70 || v >= 80),
  'no ones digit 5': (c) => both(c, (v) => v % 10 !== 5),
  'no ones digits 5 and 7': (c) => both(c, (v) => v % 10 !== 5 && v % 10 !== 7),
  '+1 number per pool (10 turns)': (c) => ({ ...c, poolSize: c.poolSize + 1 }),
  'guaranteed 10s value per pool': (c) => ({ ...c, guaranteeTens: true }),
  'repeated values allowed': (c) => ({ ...c, allowRepeats: true }),
  'pool A narrowed to 10-49': (c) => ({ ...c, domainA: c.domainA.filter((v) => v <= 49) }),
  'reroll largest number once per round': (c) => ({ ...c, rerollsPerRound: c.rerollsPerRound + 1 }),
  'keep smallest number into next round': (c) => ({ ...c, keepSmallest: true }),
  'RISK: no 10s + 60 max energy': (c) => ({ ...noTens(c), maxEnergy: c.maxEnergy + 60 }),
  'RISK: no 10s + 3 refund per turn': (c) => ({ ...noTens(c), refundPerTurn: c.refundPerTurn + 3 }),
  'relic: +40 max energy': (c) => ({ ...c, maxEnergy: c.maxEnergy + 40 }),
  'relic: +40% round-end refund': (c) => ({ ...c, refundMultiplier: 1.4 }),
  'relic: Optimal bonus cap 10': (c) => ({ ...c, bonusCap: 10 }),
  'relic: squares (a x a) cost 0': (c) => ({ ...c, energyMod: (a, b, h) => (a === b ? 0 : h) }),
  'relic: products over 4000 score double': (c) => ({ ...c, pointsMod: (a, b, l) => (a * b > 4000 ? l * 2 : l) }),
  'relic: 80s/90s factors cost 25% less': (c) => ({ ...c, energyMod: (a, b, h) => (a >= 80 || b >= 80 ? Math.floor(h * 0.75) : h) }),
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = runMany(PLAYER, baseConfig, N);
  console.log(`${PLAYER} baseline (${N} runs): win ${base.winPct.toFixed(1)}% ±${base.stderr.toFixed(1)}`);
  console.log('upgrade | granted after round | win% | change | spent/round | bonus/round | refund/round (lost)');
  for (const [name, apply] of Object.entries(SINGLE_UPGRADES)) {
    if (ONLY && name !== ONLY) continue;
    for (const g of GRANT_ROUNDS) {
      const s = runMany(PLAYER, baseConfig, N, { onRoundWin: (cfg, r) => (r === g ? apply(cfg) : cfg) });
      const d = s.winPct - base.winPct;
      const p = s.perRound;
      console.log(`${name} | ${g} | ${s.winPct.toFixed(1)} ±${s.stderr.toFixed(1)} | ${d >= 0 ? '+' : ''}${d.toFixed(1)} | ${p.gross.toFixed(1)} | ${p.bonus.toFixed(1)} | ${p.refund.toFixed(1)} (${p.refundLost.toFixed(1)})`);
    }
  }
}
