// Pair colors for Optimal indicators, chosen to avoid gold (energy) and cyan
// (points). Repeats if a board has more best pairs than colors.
export const OPTIMAL_COLORS = ['#f472b6', '#a78bfa', '#4ade80', '#fb923c', '#f87171'];

// Turns best-play keys ("idA:idB") into per-pool maps of tile id -> colors.
// Each pair gets its own color; a tile in several pairs collects several.
export function buildOptimalGlows(bestKeys) {
  const glowsA = {};
  const glowsB = {};
  [...bestKeys].sort().forEach((key, i) => {
    const color = OPTIMAL_COLORS[i % OPTIMAL_COLORS.length];
    const [idA, idB] = key.split(':').map(Number);
    (glowsA[idA] ??= []).push(color);
    (glowsB[idB] ??= []).push(color);
  });
  return { glowsA, glowsB };
}
