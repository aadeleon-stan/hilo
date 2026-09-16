// Offer pools for round 3 drafting on the 40-79 start (sim-plan-3.md).
//   OFFERS     low decade unlocks plus round 1's upgrades adapted to this start (P2)
//   P3_OFFERS  OFFERS plus the ones-digit pair family, odds upgrades for pool A
//              and two relics, for random-draft synergy discovery (P3)
// Eligibility keeps every pool drawable: nothing may leave a pool with fewer
// allowed numbers than its size, or fewer than a guarantee needs. Offers are
// drawn by weight (default 1). Values for the "best" and "worst" policies come
// from a table keyed by offer id (measured in P2a).
const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const inDecade = (d) => (v) => v >= d && v < d + 10;
const hasDecade = (dom, d) => dom.some(inDecade(d));
const both = (c, f) => ({ ...c, domainA: f(c.domainA), domainB: f(c.domainB) });

const guaranteesFor = (c, which) => [
  ...(which === 'A' ? c.guaranteesA : c.guaranteesB),
  ...(c.guaranteeTens ? [{ min: 10, max: 19, count: 1 }] : []),
];
const guaranteesMet = (dom, gs) => gs.every((g) => dom.filter((v) => v >= g.min && v <= g.max).length >= g.count);
const fits = (c, keep, size = c.poolSize) => {
  const a = c.domainA.filter(keep), b = c.domainB.filter(keep);
  return a.length >= size && b.length >= size && guaranteesMet(a, guaranteesFor(c, 'A')) && guaranteesMet(b, guaranteesFor(c, 'B'));
};

// Energy and points modifiers are rebuilt from flags so relics compose.
const withMods = (c) => ({
  ...c,
  energyMod: c.squaresFree || c.highFactorsCheaper
    ? (a, b, h) => {
        const cost = c.squaresFree && a === b ? 0 : h;
        return c.highFactorsCheaper && (a >= 70 || b >= 70) ? Math.floor(cost * 0.75) : cost;
      }
    : null,
  pointsMod: c.over4000Double ? (a, b, l) => (a * b > 4000 ? l * 2 : l) : null,
});

const unlock = (d) => ({
  id: `unlock-${d}s`,
  eligible: (c) => !hasDecade(c.domainA, d) || !hasDecade(c.domainB, d),
  apply: (c) => both(c, (dom) => [...new Set([...dom, ...decade(d)])].sort((a, b) => a - b)),
});

// Decades in cfg.lockedDecades (ascension modifiers, P5) are never removed.
const highestDecade = (c) => [90, 80, 70].find((d) => !(c.lockedDecades || []).includes(d) && (hasDecade(c.domainA, d) || hasDecade(c.domainB, d)));
const withoutDigits = (...us) => (v) => !us.includes(v % 10);
const removeDigits = (id, us, weight) => ({
  id,
  weight,
  eligible: (c) => [...c.domainA, ...c.domainB].some((v) => us.includes(v % 10)) && fits(c, withoutDigits(...us)),
  apply: (c) => both(c, (dom) => dom.filter(withoutDigits(...us))),
});

export const OFFERS = [
  unlock(10),
  unlock(20),
  unlock(30),
  {
    id: 'remove-high-decade',
    eligible: (c) => {
      const d = highestDecade(c);
      return d !== undefined && fits(c, (v) => !inDecade(d)(v));
    },
    apply: (c) => {
      const d = highestDecade(c);
      return both(c, (dom) => dom.filter((v) => !inDecade(d)(v)));
    },
  },
  removeDigits('remove-digit-5', [5]),
  removeDigits('remove-digit-7', [7]),
  { id: 'pool-size+1', eligible: (c) => c.poolSize < 11 && fits(c, () => true, c.poolSize + 1), apply: (c) => ({ ...c, poolSize: c.poolSize + 1 }) },
  { id: 'guarantee-10s', eligible: (c) => !c.guaranteeTens && hasDecade(c.domainA, 10) && hasDecade(c.domainB, 10), apply: (c) => ({ ...c, guaranteeTens: true }) },
  {
    id: 'narrow-pool-A',
    eligible: (c) => c.domainA.some((v) => v > 49) && c.domainA.filter((v) => v <= 49).length >= c.poolSize,
    apply: (c) => ({ ...c, domainA: c.domainA.filter((v) => v <= 49) }),
  },
  { id: 'keep-smallest', eligible: (c) => !c.keepSmallest, apply: (c) => ({ ...c, keepSmallest: true }) },
  { id: 'reroll+1', eligible: (c) => c.rerollsPerRound < 3, apply: (c) => ({ ...c, rerollsPerRound: c.rerollsPerRound + 1 }) },
  { id: 'max-energy+40', eligible: () => true, apply: (c) => ({ ...c, maxEnergy: c.maxEnergy + 40 }) },
  { id: 'refund+40%', eligible: (c) => c.refundMultiplier < 2.5, apply: (c) => ({ ...c, refundMultiplier: c.refundMultiplier * 1.4 }) },
  { id: 'bonus-cap+4', eligible: (c) => c.bonusCap < 18, apply: (c) => ({ ...c, bonusCap: c.bonusCap + 4 }) },
  { id: 'squares-free', eligible: (c) => !c.squaresFree, apply: (c) => withMods({ ...c, squaresFree: true }) },
];

// The 45 ones-digit pairs share a total weight of 2 offers, so they don't crowd out everything else.
const PAIR_FAMILY_WEIGHT = 2;
const digitPairs = [];
for (let x = 0; x <= 9; x++) for (let y = x + 1; y <= 9; y++) digitPairs.push([x, y]);

// Odds upgrades for pool A stack by compounding; the 70s stand in for "high numbers" until P5 adds the 80s and 90s.
const withOddsA = (c, tens, seventies) => ({
  ...c,
  oddsTensA: tens,
  oddsSeventiesA: seventies,
  weightsA: (v) => (inDecade(10)(v) ? tens : 1) * (inDecade(70)(v) ? seventies : 1),
});
const tensGuaranteeA = (c) => c.guaranteesA.find((g) => g.min === 10 && g.max === 19)?.count || 0;

export const P3_OFFERS = [
  ...OFFERS,
  ...digitPairs.map(([x, y]) => removeDigits(`remove-digits-${x}-${y}`, [x, y], PAIR_FAMILY_WEIGHT / digitPairs.length)),
  {
    id: 'odds-10s-A-x1.5',
    eligible: (c) => hasDecade(c.domainA, 10) && (c.oddsTensA || 1) < 5,
    apply: (c) => withOddsA(c, (c.oddsTensA || 1) * 1.5, c.oddsSeventiesA || 1),
  },
  {
    id: 'odds-70s-A-x0.5',
    eligible: (c) => hasDecade(c.domainA, 70) && (c.oddsSeventiesA || 1) > 0.1,
    apply: (c) => withOddsA(c, c.oddsTensA || 1, (c.oddsSeventiesA || 1) * 0.5),
  },
  {
    id: 'guarantee-10s-A+1',
    eligible: (c) => tensGuaranteeA(c) < 3 && c.domainA.filter(inDecade(10)).length > tensGuaranteeA(c),
    apply: (c) => ({
      ...c,
      guaranteesA: [...c.guaranteesA.filter((g) => !(g.min === 10 && g.max === 19)), { min: 10, max: 19, count: tensGuaranteeA(c) + 1 }],
    }),
  },
  { id: 'over-4000-double', eligible: (c) => !c.over4000Double, apply: (c) => withMods({ ...c, over4000Double: true }) },
  {
    id: 'high-factors-cheaper',
    eligible: (c) => !c.highFactorsCheaper && [...c.domainA, ...c.domainB].some((v) => v >= 70),
    apply: (c) => withMods({ ...c, highFactorsCheaper: true }),
  },
];

export const byId = Object.fromEntries(P3_OFFERS.map((o) => [o.id, o]));

export function offer(cfg, count = 3, pool = OFFERS) {
  const eligible = pool.filter((o) => o.eligible(cfg));
  const chosen = [];
  while (chosen.length < count && eligible.length) {
    const total = eligible.reduce((t, o) => t + (o.weight ?? 1), 0);
    let r = Math.random() * total;
    let k = 0;
    while (k < eligible.length - 1 && (r -= eligible[k].weight ?? 1) > 0) k++;
    chosen.push(eligible.splice(k, 1)[0]);
  }
  return chosen;
}

const valueOf = (values, o) => values[o.id] ?? -Infinity;
export const policies = {
  best: (values) => (offers) => offers.reduce((a, b) => (valueOf(values, b) > valueOf(values, a) ? b : a)),
  worst: (values) => (offers) => offers.reduce((a, b) => (valueOf(values, b) < valueOf(values, a) ? b : a)),
  random: () => (offers) => offers[Math.floor(Math.random() * offers.length)],
  none: () => () => null,
};

// onRoundWin hook: offer from `pool`, pick with `choose`, record the offer in the run's draft log.
export const draftHook = (choose, pool = OFFERS) => (cfg, round, energy, draft) => {
  const offers = offer(cfg, 3, pool);
  const chosen = offers.length ? choose(offers) : null;
  if (draft) draft.push({ round, offered: offers.map((o) => o.id), picked: chosen ? chosen.id : null });
  return chosen ? chosen.apply(cfg) : cfg;
};
