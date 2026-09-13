import { create } from 'zustand';
import {
  generatePool,
  computeProduct,
  getTarget,
  getBudget,
  getRoundBonus,
  checkRoundEnd,
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
  RUN_TURN_REFUND,
  getRunTarget,
  getBestPlays,
  getBestPlayBonus,
} from './gameLogic';

let confirmTimer = null;

function scheduleConfirm(get) {
  clearTimeout(confirmTimer);
  confirmTimer = setTimeout(() => get().confirmSelection(), 150);
}

function cancelConfirm() {
  clearTimeout(confirmTimer);
  confirmTimer = null;
}

const useGameStore = create((set, get) => ({
  screen: 'menu',
  mode: 'run',
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

  startRun: () =>
    set({
      screen: 'game',
      mode: 'run',
      round: 1,
      score: 0,
      energy: RUN_MAX_ENERGY,
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

  startClassic: () =>
    set({
      screen: 'game',
      mode: 'classic',
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
      scheduleConfirm(get);
    }
  },

  selectFromPoolB: (id) => {
    const state = get();
    if (state.phase !== 'selecting') return;
    const item = state.poolB.find((n) => n.id === id);
    if (!item || item.used) return;
    set({ selectedB: id });

    if (state.selectedA !== null) {
      scheduleConfirm(get);
    }
  },

  confirmSelection: () => {
    const state = get();
    if (state.selectedA === null || state.selectedB === null) return;

    const a = state.poolA.find((n) => n.id === state.selectedA);
    const b = state.poolB.find((n) => n.id === state.selectedB);
    if (!a || !b) return;

    const isRun = state.mode === 'run';
    const target = isRun ? getRunTarget(state.round) : getTarget(state.round);

    // Best plays are judged against the board as it was before this move.
    const wasBest =
      isRun &&
      getBestPlays(
        state.poolA,
        state.poolB,
        state.score,
        target,
        state.energy,
        RUN_ROUNDS - state.round + 1
      ).has(`${a.id}:${b.id}`);

    const result = computeProduct(a.value, b.value);
    const newPoolA = state.poolA.map((n) =>
      n.id === state.selectedA ? { ...n, used: true } : n
    );
    const newPoolB = state.poolB.map((n) =>
      n.id === state.selectedB ? { ...n, used: true } : n
    );
    const newScore = state.score + result.lowWord;
    const newEnergy = state.energy - result.highWord;

    const outcome = checkRoundEnd(newScore, target, newEnergy, newPoolA, newPoolB);

    const turnsRemaining = Math.min(
      newPoolA.filter((n) => !n.used).length,
      newPoolB.filter((n) => !n.used).length
    );

    const moveState = {
      poolA: newPoolA,
      poolB: newPoolB,
      selectedA: null,
      selectedB: null,
      turn: state.turn + 1,
      score: newScore,
      turnsAtEnd: outcome === 'win' ? turnsRemaining : 0,
    };

    if (!isRun) {
      const bonus = outcome === 'win' ? getRoundBonus(turnsRemaining) : 0;
      set({
        ...moveState,
        lastResult: result,
        energy: newEnergy,
        bank: outcome === 'win' ? state.bank + bonus + newEnergy : state.bank,
        roundBonus: bonus,
        phase: outcome || 'selecting',
      });
      return;
    }

    // Recovery is applied after the round-end check, so it can't rescue an
    // overspend. Both sources are capped at max energy.
    const isBest = wasBest && outcome !== 'loss';
    const bestBonus = isBest
      ? Math.min(getBestPlayBonus(result.highWord), RUN_MAX_ENERGY - newEnergy)
      : 0;
    const refund =
      outcome === 'win'
        ? Math.min(turnsRemaining * RUN_TURN_REFUND, RUN_MAX_ENERGY - newEnergy - bestBonus)
        : 0;
    const runWon = outcome === 'win' && state.round === RUN_ROUNDS;

    set({
      ...moveState,
      lastResult: { ...result, isBest, bonus: bestBonus },
      energy: newEnergy + bestBonus + refund,
      roundBonus: refund,
      phase: runWon ? 'runWon' : outcome || 'selecting',
    });
  },

  nextRound: () => {
    cancelConfirm();
    const state = get();
    const newRound = state.round + 1;
    set({
      round: newRound,
      score: 0,
      energy: state.mode === 'run' ? state.energy : getBudget(newRound),
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

  resetGame: () => {
    cancelConfirm();
    set({
      screen: 'menu',
      mode: 'run',
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
    });
  },
}));

export default useGameStore;
