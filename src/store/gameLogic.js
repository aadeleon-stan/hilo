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
// See feature-docs/progression-research.md, section 10.
const RUN_SPEND_PAR = [29, 30, 33, 34, 37, 38, 42, 43, 53, 56];
const RUN_NET_PAR = [0, 0, 0, 0, 0, 0, 0, 7, 9, 18];

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
// affordable energy pace. Among moves worth at least BEST_PLAY_MIN_SCORE
// points, those within BEST_PLAY_TOLERANCE of the top score are best plays,
// unless another open move costs no more and scores no less.
// Returns a Set of "idA:idB" keys (empty if no move meets the minimum).
export function getBestPlays(poolA, poolB, score, target, energy, roundsLeft) {
  const openA = poolA.filter((n) => !n.used);
  const openB = poolB.filter((n) => !n.used);
  const turnsLeft = Math.min(openA.length, openB.length);
  const best = new Set();
  if (turnsLeft === 0) return best;

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

  for (const move of moves) {
    if (move.lowWord < BEST_PLAY_MIN_SCORE) continue;
    if (move.value < maxValue - BEST_PLAY_TOLERANCE) continue;
    const beaten = moves.some(
      (other) =>
        other.highWord <= move.highWord &&
        other.lowWord >= move.lowWord &&
        (other.highWord < move.highWord || other.lowWord > move.lowWord)
    );
    if (!beaten) best.add(move.key);
  }
  return best;
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
