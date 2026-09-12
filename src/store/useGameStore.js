import { create } from 'zustand';
import { generatePool, computeProduct, getTarget, getBudget, getRoundBonus, checkRoundEnd } from './gameLogic';

const useGameStore = create((set, get) => ({
  screen: 'menu',
  round: 1,
  score: 0,
  energy: 0,
  bank: 0,
  phase: 'selecting',
  poolA: [],
  poolB: [],
  selectedA: null,
  selectedB: null,
  lastResult: null,
  turn: 0,
  roundBonus: 0,
  turnsAtEnd: 0,

  startGame: () =>
    set({
      screen: 'game',
      round: 1,
      score: 0,
      energy: getBudget(1),
      bank: 0,
      phase: 'selecting',
      poolA: generatePool(),
      poolB: generatePool(),
      selectedA: null,
      selectedB: null,
      lastResult: null,
      turn: 0,
      roundBonus: 0,
      turnsAtEnd: 0,
    }),

  selectFromPoolA: (id) => {
    const state = get();
    if (state.phase !== 'selecting') return;
    const item = state.poolA.find((n) => n.id === id);
    if (!item || item.used) return;
    set({ selectedA: id });

    if (state.selectedB !== null) {
      setTimeout(() => get().confirmSelection(), 150);
    }
  },

  selectFromPoolB: (id) => {
    const state = get();
    if (state.phase !== 'selecting') return;
    const item = state.poolB.find((n) => n.id === id);
    if (!item || item.used) return;
    set({ selectedB: id });

    if (state.selectedA !== null) {
      setTimeout(() => get().confirmSelection(), 150);
    }
  },

  confirmSelection: () => {
    const state = get();
    if (state.selectedA === null || state.selectedB === null) return;

    const a = state.poolA.find((n) => n.id === state.selectedA);
    const b = state.poolB.find((n) => n.id === state.selectedB);
    if (!a || !b) return;

    const result = computeProduct(a.value, b.value);
    const newPoolA = state.poolA.map((n) =>
      n.id === state.selectedA ? { ...n, used: true } : n
    );
    const newPoolB = state.poolB.map((n) =>
      n.id === state.selectedB ? { ...n, used: true } : n
    );
    const newScore = state.score + result.lowWord;
    const newEnergy = state.energy - result.highWord;
    const target = getTarget(state.round);

    const outcome = checkRoundEnd(newScore, target, newEnergy, newPoolA, newPoolB);

    const turnsRemaining = Math.min(
      newPoolA.filter((n) => !n.used).length,
      newPoolB.filter((n) => !n.used).length
    );
    const bonus = outcome === 'win' ? getRoundBonus(turnsRemaining) : 0;

    set({
      poolA: newPoolA,
      poolB: newPoolB,
      selectedA: null,
      selectedB: null,
      lastResult: result,
      turn: state.turn + 1,
      score: newScore,
      energy: newEnergy,
      bank: outcome === 'win' ? state.bank + bonus + newEnergy : state.bank,
      roundBonus: bonus,
      turnsAtEnd: outcome === 'win' ? turnsRemaining : 0,
      phase: outcome || 'selecting',
    });
  },

  nextRound: () => {
    const state = get();
    const newRound = state.round + 1;
    set({
      round: newRound,
      score: 0,
      energy: getBudget(newRound),
      phase: 'selecting',
      poolA: generatePool(),
      poolB: generatePool(),
      selectedA: null,
      selectedB: null,
      lastResult: null,
      roundBonus: 0,
      turnsAtEnd: 0,
      turn: 0,
    });
  },

  resetGame: () =>
    set({
      screen: 'menu',
      round: 1,
      score: 0,
      energy: 0,
      bank: 0,
      phase: 'selecting',
      poolA: [],
      poolB: [],
      selectedA: null,
      selectedB: null,
      lastResult: null,
      roundBonus: 0,
      turnsAtEnd: 0,
    }),
}));

export default useGameStore;
