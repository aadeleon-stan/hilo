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

export function checkRoundEnd(score, target, energy, poolA, poolB) {
  if (score >= target) return 'win';
  if (energy <= 0) return 'loss';
  const aRemaining = poolA.filter((n) => !n.used).length;
  const bRemaining = poolB.filter((n) => !n.used).length;
  if (aRemaining === 0 || bRemaining === 0) return 'loss';
  return null;
}
