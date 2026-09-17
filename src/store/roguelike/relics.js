import { RELIC_CHOICE_COUNT } from './constants';
import { weightedSample } from './upgrades';

// Relics: passive effects that last the run, picked free at each shop.
//   eligible(cfg): whether the relic would do anything.
//   grantsEnergy: current energy added when it's taken.
export const RELICS = [
  {
    id: 'refund-40',
    label: '+40% refund',
    desc: 'Energy recovered from leftover turns is 40% higher.',
    apply: (cfg) => ({ ...cfg, refundMultiplier: cfg.refundMultiplier + 0.4 }),
  },
  {
    id: 'max-energy-40',
    label: '+40 max energy',
    desc: 'Max energy +40, and gain 40 energy now.',
    grantsEnergy: 40,
    apply: (cfg) => ({ ...cfg, maxEnergy: cfg.maxEnergy + 40 }),
  },
  {
    id: 'bonus-cap-4',
    label: 'Bigger Optimal bonus',
    desc: 'Optimal plays can recover up to 4 more energy.',
    apply: (cfg) => ({ ...cfg, bonusCap: cfg.bonusCap + 4 }),
  },
  {
    id: 'squares-free',
    label: 'Perfect squares',
    desc: 'Multiplying a number by itself (a × a) costs no energy.',
    eligible: (cfg) => !cfg.squaresFree,
    apply: (cfg) => ({ ...cfg, squaresFree: true }),
  },
  {
    id: 'over-4000-double',
    label: 'Big products',
    desc: 'Products over 4000 score double points.',
    apply: (cfg) => ({ ...cfg, over4000Double: true }),
  },
  {
    id: 'high-factor-discount',
    label: 'Heavy lifting',
    desc: 'Plays using a number of 70 or more cost 25% less energy.',
    apply: (cfg) => ({ ...cfg, highFactorDiscount: true }),
  },
  {
    id: 'money-50',
    label: 'Interest',
    desc: 'Earn 50% more money for each round cleared.',
    apply: (cfg) => ({ ...cfg, moneyMultiplier: cfg.moneyMultiplier + 0.5 }),
  },
  {
    id: 'free-swap',
    label: 'Free digit swap',
    desc: 'Once per round, swap the digits of an unused number (47 → 74).',
    apply: (cfg) => ({ ...cfg, freeSwapsPerRound: cfg.freeSwapsPerRound + 1 }),
  },
  {
    id: 'inventory-5',
    label: 'Bigger bag',
    desc: 'Your inventory holds 5 items instead of 3.',
    apply: (cfg) => ({ ...cfg, inventorySize: Math.max(cfg.inventorySize, 5) }),
  },
  {
    id: 'shop-discount',
    label: 'Loyalty card',
    desc: 'Shop prices are 25% lower.',
    apply: (cfg) => ({ ...cfg, shopDiscount: 0.25 }),
  },
  {
    id: 'first-play-free',
    label: 'Head start',
    desc: 'The first play of each round costs no energy.',
    apply: (cfg) => ({ ...cfg, firstPlayFree: true }),
  },
];

export const RELICS_BY_ID = Object.fromEntries(RELICS.map((relic) => [relic.id, relic]));

// Relics the player doesn't own and that would do something, chosen at random.
export function buildRelicChoice(cfg, owned) {
  const options = RELICS.filter(
    (relic) => !owned.includes(relic.id) && (!relic.eligible || relic.eligible(cfg))
  );
  return weightedSample(options, RELIC_CHOICE_COUNT, () => 1).map((relic) => relic.id);
}
