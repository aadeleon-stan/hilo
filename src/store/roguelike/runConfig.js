import {
  POOL_SIZE,
  START_DECADES,
  START_MAX_ENERGY,
  START_REFUND_PER_TURN,
  START_BONUS_CAP,
  START_INVENTORY_SIZE,
} from './constants';

// The run's build: everything upgrades and relics change. Plain data only, so
// it can be saved to localStorage.
//
// Each pool is { decades, removedDigits, guarantees }: its allowed values are
// the decades' numbers minus any with a removed ones digit, and each entry in
// guarantees (a decade) promises one value from that decade per draw.
export function defaultRunConfig() {
  const pool = () => ({ decades: [...START_DECADES], removedDigits: [], guarantees: [] });
  return {
    pools: { A: pool(), B: pool() },
    maxEnergy: START_MAX_ENERGY,
    refundPerTurn: START_REFUND_PER_TURN,
    refundMultiplier: 1,
    bonusCap: START_BONUS_CAP,
    rerollsPerRound: 0,
    freeSwapsPerRound: 0,
    cashPerRound: 0,
    moneyMultiplier: 1,
    inventorySize: START_INVENTORY_SIZE,
    shopDiscount: 0,
    squaresFree: false,
    over4000Double: false,
    highFactorDiscount: false,
    firstPlayFree: false,
    // Upgrade card id -> times taken, for cards with a repeat limit.
    taken: {},
  };
}

export const otherPool = (which) => (which === 'A' ? 'B' : 'A');
export const decadeOf = (value) => Math.floor(value / 10) * 10;

export function decadeValues(pool, decade) {
  const values = [];
  for (let v = decade; v < decade + 10; v++) {
    if (v >= 10 && v <= 99 && !pool.removedDigits.includes(v % 10)) values.push(v);
  }
  return values;
}

export function allowedValues(pool) {
  return [...pool.decades].sort((x, y) => x - y).flatMap((d) => decadeValues(pool, d));
}

// A pool can be drawn if it has enough values for a full board and every
// guarantee slot has its own value to fill it.
export function isDrawable(pool) {
  if (allowedValues(pool).length < POOL_SIZE) return false;
  for (const decade of new Set(pool.guarantees)) {
    const slots = pool.guarantees.filter((d) => d === decade).length;
    if (!pool.decades.includes(decade)) return false;
    if (decadeValues(pool, decade).length < slots) return false;
  }
  return true;
}

export function updatePool(cfg, which, fn) {
  return { ...cfg, pools: { ...cfg.pools, [which]: fn(cfg.pools[which]) } };
}

export function addDecade(pool, decade) {
  if (pool.decades.includes(decade)) return pool;
  return { ...pool, decades: [...pool.decades, decade] };
}

export function removeDecade(pool, decade) {
  return { ...pool, decades: pool.decades.filter((d) => d !== decade) };
}

export function removeDigit(pool, digit) {
  if (pool.removedDigits.includes(digit)) return pool;
  return { ...pool, removedDigits: [...pool.removedDigits, digit] };
}

export function addGuarantee(pool, decade) {
  return { ...pool, guarantees: [...pool.guarantees, decade] };
}
