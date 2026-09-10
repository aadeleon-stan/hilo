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
  return 200 + round * 100;
}

export function checkRoundEnd(score, target, poolA, poolB) {
  if (score >= target) return 'win';
  const aRemaining = poolA.filter((n) => !n.used).length;
  const bRemaining = poolB.filter((n) => !n.used).length;
  if (aRemaining === 0 || bRemaining === 0) return 'loss';
  return null;
}
