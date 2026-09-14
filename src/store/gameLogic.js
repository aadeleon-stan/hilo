// Run (progression) mode tuning. See feature-docs/progression-research.md.
export const RUN_ROUNDS = 10;
export const RUN_MAX_ENERGY = 200;
export const RUN_TURN_REFUND = 5;
export const BEST_PLAY_TOLERANCE = 0.15;
export const BEST_PLAY_MIN_SCORE = 20;

export function generatePool() {
  const values = new Set();
  while (values.size < 9) {
    values.add(Math.floor(Math.random() * 90) + 10);
  }
  return [...values].map((value, i) => ({ id: i, value, used: false }));
}

export function computeProduct(a, b) {
  const product = a * b;
  return {
    a,
    b,
    product,
    highWord: Math.floor(product / 100),
    lowWord: product % 100,
  };
}

export function getTarget(round) {
  return 100 + round * 30;
}

export function getBudget(round) {
  return 280 - round * 5;
}

export function getRoundBonus(turnsRemaining) {
  return turnsRemaining * 25;
}

export function getRunTarget(round) {
  return 240 + (round - 1) * 15;
}

// Per-round median energy for a strong (planning) player in simulated runs:
// gross spend (sum of high words) and net use (spend minus bonus and refund).
// Derived from the constants above; regenerate if run tuning changes.
// See feature-docs/progression-research.md, sections 10 and 11.
const RUN_SPEND_PAR = [30, 30, 33, 37, 38, 38, 41, 46, 50, 57];
const RUN_NET_PAR = [0, 0, 0, 0, 0, 0, 0, 6, 8, 15];

export function getRunSpendPar(round) {
  return RUN_SPEND_PAR[round - 1];
}

export function getRunNetPar(round) {
  return RUN_NET_PAR[round - 1];
}

export function getBestPlayBonus(highWord) {
  return Math.min(6, Math.ceil(highWord / 2));
}

// Scores every open move as points per needed score pace minus cost per
// affordable energy pace. The scored best plays are the moves worth at least
// BEST_PLAY_MIN_SCORE points within BEST_PLAY_TOLERANCE of the top score,
// unless another open move costs no more and scores no less. Also returns the
// open moves that would finish the round.
function rankPlays(poolA, poolB, score, target, energy, roundsLeft) {
  const openA = poolA.filter((n) => !n.used);
  const openB = poolB.filter((n) => !n.used);
  const turnsLeft = Math.min(openA.length, openB.length);
  if (turnsLeft === 0) return { scored: [], finishing: [] };

  const scorePace = Math.max(1, (target - score) / turnsLeft);
  const energyPace = Math.max(1, energy / roundsLeft / turnsLeft);

  const moves = [];
  let maxValue = -Infinity;
  for (const a of openA) {
    for (const b of openB) {
      const { highWord, lowWord } = computeProduct(a.value, b.value);
      const value = lowWord / scorePace - highWord / energyPace;
      moves.push({ key: `${a.id}:${b.id}`, value, highWord, lowWord });
      if (lowWord >= BEST_PLAY_MIN_SCORE && value > maxValue) maxValue = value;
    }
  }

  const scored = moves.filter(
    (move) =>
      move.lowWord >= BEST_PLAY_MIN_SCORE &&
      move.value >= maxValue - BEST_PLAY_TOLERANCE &&
      !moves.some(
        (other) =>
          other.highWord <= move.highWord &&
          other.lowWord >= move.lowWord &&
          (other.highWord < move.highWord || other.lowWord > move.lowWord)
      )
  );
  const finishing = moves.filter((move) => move.lowWord >= target - score);
  return { scored, finishing };
}

// The cheapest of the given moves; ties all count.
function cheapestOf(moves) {
  if (moves.length === 0) return [];
  const cheapest = Math.min(...moves.map((move) => move.highWord));
  return moves.filter((move) => move.highWord === cheapest);
}

// Moves that earn the Optimal tag and bonus: the scored best plays, the
// cheapest finishing move(s), and any finishing move that costs no more than
// the priciest scored best play. Returns a Set of "idA:idB" keys.
export function getBestPlays(poolA, poolB, score, target, energy, roundsLeft) {
  const { scored, finishing } = rankPlays(poolA, poolB, score, target, energy, roundsLeft);
  const limit = Math.max(...scored.map((move) => move.highWord));
  const plays = [
    ...scored,
    ...cheapestOf(finishing),
    ...finishing.filter((move) => move.highWord <= limit),
  ];
  return new Set(plays.map((move) => move.key));
}

// Moves the Optimal indicators playtest setting glows: the scored best plays
// and only the cheapest finishing move(s), so late-round boards stay readable.
// Always a subset of getBestPlays.
export function getHighlightedPlays(poolA, poolB, score, target, energy, roundsLeft) {
  const { scored, finishing } = rankPlays(poolA, poolB, score, target, energy, roundsLeft);
  return new Set([...scored, ...cheapestOf(finishing)].map((move) => move.key));
}

export function checkRoundEnd(score, target, energy, poolA, poolB) {
  if (energy < 0) return 'loss';
  if (score >= target) return 'win';
  if (energy === 0) return 'loss';
  const aRemaining = poolA.filter((n) => !n.used).length;
  const bRemaining = poolB.filter((n) => !n.used).length;
  if (aRemaining === 0 || bRemaining === 0) return 'loss';
  return null;
}
