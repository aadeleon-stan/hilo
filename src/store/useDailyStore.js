import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pacificDateKey, previousDateKey } from './daily/dailyBoard';

// Daily results, kept separate from the game store so the roguelike's saved
// run (hilo-roguelike-run) is untouched. One result per date key.
const useDailyStore = create(
  persist(
    (set) => ({
      results: {},
      record: (key, result) =>
        set((s) => (s.results[key] ? s : { results: { ...s.results, [key]: result } })),
    }),
    { name: 'hilo-daily', version: 1 }
  )
);

export function dailyResult(results, key = pacificDateKey()) {
  return results[key] ?? null;
}

// Days won in an unbroken line ending today (or yesterday, if today isn't
// played yet, so an unplayed day doesn't look like a broken streak).
export function dailyStreak(results, today = pacificDateKey()) {
  let key = results[today]?.won ? today : previousDateKey(today);
  let streak = 0;
  while (results[key]?.won) {
    streak++;
    key = previousDateKey(key);
  }
  return streak;
}

export function bestEnergyLeft(results) {
  const wins = Object.values(results).filter((r) => r.won);
  return wins.length ? Math.max(...wins.map((r) => r.energyLeft)) : null;
}

export default useDailyStore;
