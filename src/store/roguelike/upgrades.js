import { DRAFT_SIZE, MAX_GUARANTEES_PER_POOL, MAX_REROLLS_PER_ROUND } from './constants';
import {
  addDecade,
  addGuarantee,
  isDrawable,
  removeDecade,
  removeDigit,
  updatePool,
} from './runConfig';

// Upgrade cards offered in the draft after each round won.
//   needsPool: the player picks the card, then Pool A or B.
//   eligible(cfg, pool): whether the card can apply (to that pool).
//   apply(cfg, pool): returns the new run config.
//   grantsEnergy: current energy added along with the upgrade.
// `taken` counts are kept by the store under takenKey(card, pool).

export const takenKey = (card, pool) => (card.needsPool ? `${card.id}:${pool}` : card.id);

const topDecade = (pool) => Math.max(...pool.decades);
const plural = (decade) => `${decade}s`;

const decadeUnlock = (decade, weight) => ({
  id: `unlock-${decade}`,
  label: `Unlock the ${plural(decade)}`,
  desc: `${decade}–${decade + 9} can be drawn in the pool you choose.`,
  weight,
  needsPool: true,
  eligible: (cfg, pool) => !cfg.pools[pool].decades.includes(decade),
  apply: (cfg, pool) => updatePool(cfg, pool, (p) => addDecade(p, decade)),
});

const cursedUnlock = (decade, reward) => ({
  id: `cursed-${decade}-${reward}`,
  label: `Unlock the ${plural(decade)}`,
  desc:
    reward === 'refund'
      ? `Cursed: ${decade}–${decade + 9} can be drawn in the pool you choose. +50% round-end refund.`
      : `Cursed: ${decade}–${decade + 9} can be drawn in the pool you choose. +10 money per round cleared.`,
  cursed: true,
  weight: 0.5,
  needsPool: true,
  eligible: (cfg, pool) => !cfg.taken[`cursed-${decade}-${reward}:${pool}`],
  apply: (cfg, pool) => {
    const next = updatePool(cfg, pool, (p) => addDecade(p, decade));
    return reward === 'refund'
      ? { ...next, refundMultiplier: next.refundMultiplier + 0.5 }
      : { ...next, cashPerRound: next.cashPerRound + 10 };
  },
});

const guarantee = (decade) => ({
  id: `guarantee-${decade}`,
  label: `Guarantee a ${plural(decade)} value`,
  desc: `Every board has at least one more ${decade}–${decade + 9} value in the pool you choose (up to ${MAX_GUARANTEES_PER_POOL} per pool). Needs the ${plural(decade)} unlocked there.`,
  weight: 1,
  needsPool: true,
  eligible: (cfg, pool) => {
    const p = cfg.pools[pool];
    return (
      p.decades.includes(decade) &&
      p.guarantees.length < MAX_GUARANTEES_PER_POOL &&
      isDrawable(addGuarantee(p, decade))
    );
  },
  apply: (cfg, pool) => updatePool(cfg, pool, (p) => addGuarantee(p, decade)),
});

const removeTopDecade = {
  id: 'remove-top-decade',
  label: 'Remove the highest decade',
  desc: 'The highest decade in the pool you choose can no longer be drawn.',
  poolNote: (cfg, pool) => `the ${plural(topDecade(cfg.pools[pool]))}`,
  weight: 1,
  needsPool: true,
  eligible: (cfg, pool) => {
    const p = cfg.pools[pool];
    return p.decades.length > 1 && isDrawable(removeDecade(p, topDecade(p)));
  },
  apply: (cfg, pool) => updatePool(cfg, pool, (p) => removeDecade(p, topDecade(p))),
};

// Every ordered pair: 100 cards sharing a combined weight of 2.
const digitPairs = [];
for (let x = 0; x <= 9; x++) {
  for (let y = 0; y <= 9; y++) {
    digitPairs.push({
      id: `digits-${x}-${y}`,
      label: `Remove ${x}s from A, ${y}s from B`,
      desc: `Numbers ending in ${x} can no longer be drawn in Pool A, and numbers ending in ${y} in Pool B.`,
      weight: 0.02,
      needsPool: false,
      eligible: (cfg) => {
        const { A, B } = cfg.pools;
        return (
          !A.removedDigits.includes(x) &&
          !B.removedDigits.includes(y) &&
          isDrawable(removeDigit(A, x)) &&
          isDrawable(removeDigit(B, y))
        );
      },
      apply: (cfg) =>
        updatePool(
          updatePool(cfg, 'A', (p) => removeDigit(p, x)),
          'B',
          (p) => removeDigit(p, y)
        ),
    });
  }
}

export const UPGRADES = [
  decadeUnlock(10, 1),
  decadeUnlock(20, 1),
  decadeUnlock(30, 1),
  cursedUnlock(80, 'refund'),
  cursedUnlock(80, 'cash'),
  cursedUnlock(90, 'refund'),
  cursedUnlock(90, 'cash'),
  guarantee(10),
  guarantee(20),
  guarantee(30),
  removeTopDecade,
  {
    id: 'max-energy',
    label: '+10 max energy',
    desc: 'Max energy +10, and gain 10 energy now.',
    weight: 1,
    needsPool: false,
    grantsEnergy: 10,
    eligible: () => true,
    apply: (cfg) => ({ ...cfg, maxEnergy: cfg.maxEnergy + 10 }),
  },
  {
    id: 'refund-percent',
    label: '+10% round-end refund',
    desc: 'Energy recovered from leftover turns is 10% higher.',
    weight: 1,
    needsPool: false,
    eligible: () => true,
    apply: (cfg) => ({ ...cfg, refundMultiplier: cfg.refundMultiplier + 0.1 }),
  },
  {
    id: 'bonus-cap',
    label: '+1 Optimal bonus cap',
    desc: 'Optimal plays can recover 1 more energy.',
    weight: 1,
    needsPool: false,
    eligible: () => true,
    apply: (cfg) => ({ ...cfg, bonusCap: cfg.bonusCap + 1 }),
  },
  {
    id: 'refund-per-turn',
    label: '+1 energy per leftover turn',
    desc: 'Each turn left when you clear a round recovers 1 more energy.',
    weight: 1,
    needsPool: false,
    eligible: () => true,
    apply: (cfg) => ({ ...cfg, refundPerTurn: cfg.refundPerTurn + 1 }),
  },
  {
    id: 'reroll-charge',
    label: '+1 reroll per round',
    desc: `Once per round, replace any unused number on the board with a new draw (up to ${MAX_REROLLS_PER_ROUND}).`,
    weight: 1,
    needsPool: false,
    eligible: (cfg) => cfg.rerollsPerRound < MAX_REROLLS_PER_ROUND,
    apply: (cfg) => ({ ...cfg, rerollsPerRound: cfg.rerollsPerRound + 1 }),
  },
  {
    id: 'squares-free',
    label: 'Squares cost 0 energy',
    desc: 'Multiplying a number by itself (a × a) costs no energy.',
    weight: 1,
    needsPool: false,
    eligible: (cfg) => !cfg.squaresFree,
    apply: (cfg) => ({ ...cfg, squaresFree: true }),
  },
  ...digitPairs,
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((card) => [card.id, card]));

export function isCardEligible(cfg, card) {
  return card.needsPool
    ? card.eligible(cfg, 'A') || card.eligible(cfg, 'B')
    : card.eligible(cfg);
}

// Weighted draw without replacement from the given items.
export function weightedSample(items, count, weightOf) {
  const left = [...items];
  const out = [];
  while (out.length < count && left.length > 0) {
    const total = left.reduce((sum, item) => sum + weightOf(item), 0);
    let r = Math.random() * total;
    let i = 0;
    while (i < left.length - 1 && r >= weightOf(left[i])) {
      r -= weightOf(left[i]);
      i++;
    }
    out.push(left.splice(i, 1)[0]);
  }
  return out;
}

// Up to DRAFT_SIZE distinct eligible card ids, drawn by weight.
export function buildDraft(cfg, exclude = []) {
  const eligible = UPGRADES.filter((card) => !exclude.includes(card.id) && isCardEligible(cfg, card));
  return weightedSample(eligible, DRAFT_SIZE, (card) => card.weight).map((card) => card.id);
}

// Applies a card: the new config with the card counted as taken.
export function applyUpgrade(cfg, card, pool) {
  const next = card.apply(cfg, pool);
  const key = takenKey(card, pool);
  return { ...next, taken: { ...next.taken, [key]: (next.taken[key] ?? 0) + 1 } };
}
