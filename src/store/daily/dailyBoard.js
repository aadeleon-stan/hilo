// gameLogic is this module's only dependency, with an explicit .js extension,
// so plain Node can import it too: the daily puzzle's determinism and
// winnability are checked by a script in research/.
import { computeProduct } from '../gameLogic.js';

// The daily challenge: one round that is the same for everyone, built from the
// date alone. Nothing here uses Math.random, so a date key always yields the
// same puzzle.

export const DAILY_POOL_SIZE = 9;
export const DAILY_MAX_ENERGY = 200;
// Mid-run targets by the roguelike's scale (its rounds 5-6 are 230 and 285),
// since daily players have no upgrades.
export const DAILY_TARGETS = [230, 245, 260, 275, 285];
// A puzzle must be clearable with at least this many turns to spare.
export const DAILY_SPARE_TURNS = 2;

const DAILY_VALUES = Array.from({ length: 90 }, (_, i) => i + 10);

// The date in Pacific time, as YYYY-MM-DD, so the puzzle rolls over at
// midnight Pacific for every player whatever their own timezone.
export function pacificDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function previousDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// mulberry32 over a string hash: small, deterministic, no dependencies.
export function seededRng(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPool(rng) {
  const values = [];
  while (values.length < DAILY_POOL_SIZE) {
    const value = DAILY_VALUES[Math.floor(rng() * DAILY_VALUES.length)];
    if (!values.includes(value)) values.push(value);
  }
  return values;
}

// How a skilled player would clear this board: the one-move-at-a-time model
// from research/sims, trying several cost weights and keeping the run that
// leaves the most turns. Returns { turnsLeft, energyLeft } or null.
export function solveBoard(valuesA, valuesB, target, maxEnergy) {
  let best = null;
  for (const lam of [0, 0.5, 1, 2, 4, 8]) {
    const usedA = valuesA.map(() => false);
    const usedB = valuesB.map(() => false);
    let score = 0;
    let energy = maxEnergy;
    let turns = 0;
    while (score < target && turns < valuesA.length) {
      let pickI = -1;
      let pickJ = -1;
      let bestValue = -Infinity;
      for (let i = 0; i < valuesA.length; i++) {
        if (usedA[i]) continue;
        for (let j = 0; j < valuesB.length; j++) {
          if (usedB[j]) continue;
          const { highWord, lowWord } = computeProduct(valuesA[i], valuesB[j]);
          if (highWord > energy) continue;
          const value = lowWord - lam * highWord;
          if (value > bestValue) {
            bestValue = value;
            pickI = i;
            pickJ = j;
          }
        }
      }
      if (pickI < 0) break;
      const { highWord, lowWord } = computeProduct(valuesA[pickI], valuesB[pickJ]);
      score += lowWord;
      energy -= highWord;
      usedA[pickI] = true;
      usedB[pickJ] = true;
      turns++;
    }
    if (score < target) continue;
    const result = { turnsLeft: valuesA.length - turns, energyLeft: energy };
    if (!best || result.turnsLeft > best.turnsLeft) best = result;
  }
  return best;
}

export function isWinnable(valuesA, valuesB, target, maxEnergy) {
  const solved = solveBoard(valuesA, valuesB, target, maxEnergy);
  return Boolean(solved) && solved.turnsLeft >= DAILY_SPARE_TURNS;
}

// Today's puzzle: values, target and energy, decided by the date key alone.
// Boards are redrawn until one is winnable with turns to spare; the target
// steps down through the band if a date proves stubborn.
export function dailyPuzzle(key, { attemptsPerTarget = 60 } = {}) {
  const rng = seededRng(key);
  const targets = [...DAILY_TARGETS].sort((a, b) => b - a);
  const startIndex = Math.floor(rng() * targets.length);
  const order = [
    targets[startIndex],
    ...targets.slice(startIndex + 1),
    ...targets.slice(0, startIndex).reverse(),
  ];

  let fallback = null;
  for (const target of order) {
    for (let attempt = 0; attempt < attemptsPerTarget; attempt++) {
      const valuesA = drawPool(rng);
      const valuesB = drawPool(rng);
      if (!fallback) fallback = { valuesA, valuesB, target };
      if (isWinnable(valuesA, valuesB, target, DAILY_MAX_ENERGY)) {
        return { key, valuesA, valuesB, target, maxEnergy: DAILY_MAX_ENERGY };
      }
    }
  }
  // Not reachable in practice (every tested date passes on the first target),
  // but never hand back a puzzle that can't be played.
  return { key, ...fallback, target: targets[targets.length - 1], maxEnergy: DAILY_MAX_ENERGY };
}

// The puzzle as board tiles, ready for the store. Tile ids are unique across
// both pools, like the roguelike's makeTiles.
export function dailyBoard(puzzle) {
  const tiles = (values, from) => values.map((value, i) => ({ id: from + i, value, used: false }));
  return {
    poolA: tiles(puzzle.valuesA, 0),
    poolB: tiles(puzzle.valuesB, puzzle.valuesA.length),
    nextTileId: puzzle.valuesA.length + puzzle.valuesB.length,
  };
}
