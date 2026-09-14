// Stackable upgrade offer pool shared by the drafting simulations.
// value = average-player win-rate change when granted after round 1 (single-upgrade sweeps).
const decades = [90, 80, 70];
export const UPGRADES = [
  { id: 'remove-high-decade', value: 27, eligible: (c) => decades.some((d) => c.domainA.some((v) => v >= d && v < d + 10)),
    apply: (c) => { const d = decades.find((x) => c.domainA.some((v) => v >= x && v < x + 10)); return { ...c, domainA: c.domainA.filter((v) => v < d || v >= d + 10), domainB: c.domainB.filter((v) => v < d || v >= d + 10) }; } },
  { id: 'remove-digit-5', value: 3, eligible: (c) => c.domainA.some((v) => v % 10 === 5), apply: (c) => ({ ...c, domainA: c.domainA.filter((v) => v % 10 !== 5), domainB: c.domainB.filter((v) => v % 10 !== 5) }) },
  { id: 'remove-digit-7', value: 3, eligible: (c) => c.domainA.some((v) => v % 10 === 7), apply: (c) => ({ ...c, domainA: c.domainA.filter((v) => v % 10 !== 7), domainB: c.domainB.filter((v) => v % 10 !== 7) }) },
  { id: 'pool-size+1', value: 30, eligible: (c) => c.poolSize < 11, apply: (c) => ({ ...c, poolSize: c.poolSize + 1 }) },
  { id: 'guarantee-10s', value: 33, eligible: (c) => !c.guaranteeTens, apply: (c) => ({ ...c, guaranteeTens: true }) },
  { id: 'narrow-pool-A', value: 33, eligible: (c) => c.domainA.some((v) => v > 49), apply: (c) => ({ ...c, domainA: c.domainA.filter((v) => v <= 49) }) },
  { id: 'keep-smallest', value: 33, eligible: (c) => !c.keepSmallest, apply: (c) => ({ ...c, keepSmallest: true }) },
  { id: 'reroll+1', value: 14, eligible: (c) => c.rerollsPerRound < 3, apply: (c) => ({ ...c, rerollsPerRound: c.rerollsPerRound + 1 }) },
  { id: 'max-energy+40', value: 17, eligible: () => true, apply: (c) => ({ ...c, maxEnergy: c.maxEnergy + 40 }) },
  { id: 'refund+40%', value: 24, eligible: (c) => c.refundMultiplier < 2.5, apply: (c) => ({ ...c, refundMultiplier: c.refundMultiplier * 1.4 }) },
  { id: 'bonus-cap+4', value: 13, eligible: (c) => c.bonusCap < 18, apply: (c) => ({ ...c, bonusCap: c.bonusCap + 4 }) },
  { id: 'squares-free', value: 19, eligible: (c) => !c.squaresFree, apply: (c) => ({ ...c, squaresFree: true, energyMod: (a, b, h) => (a === b ? 0 : h) }) },
];
export function offer(cfg) {
  const pool = UPGRADES.filter((u) => u.eligible(cfg));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
export const policies = {
  best: (offers) => offers.reduce((a, b) => (b.value > a.value ? b : a)),
  random: (offers) => offers[Math.floor(Math.random() * offers.length)],
  worst: (offers) => offers.reduce((a, b) => (b.value < a.value ? b : a)),
  none: () => null,
};
export const draftHook = (choose, k, picks) => (cfg, r) => {
  const offers = offer(cfg);
  const chosen = offers.length ? choose(offers) : null;
  if (chosen && picks) picks.push(chosen.id);
  const next = chosen ? chosen.apply(cfg) : { ...cfg };
  return { ...next, targetExtra: k * r };
};
