import {
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
  getBudget,
  getRunTarget,
  getTarget,
} from './gameLogic';
import { getRoguelikeTarget } from './roguelike/constants';
import { PRACTICE_DEFAULT_MAX_ENERGY, PRACTICE_DEFAULT_TARGET } from './practice';
import { DAILY_MAX_ENERGY, DAILY_TARGETS } from './daily/dailyBoard';

// Per-mode rules, so screens and the store don't branch on one mode id.
//   rounds: round count, or null for endless.
//   target(round) / maxEnergy(round, runConfig): the round's goal and energy.
//   carryEnergy: one pool across rounds (vs. a fresh budget each round).
//   parHints: show the simulated energy par (Arcade tuning only).
//   optimal: best plays earn the Optimal tag and bonus.
//   bank: Classic's banked score.  money: the roguelike's money and shops.
//   endScreen: what shows when a round ends — the shared Overlay, or a
//     mode-specific screen rendered by GameScreen.
export const MODES = {
  run: {
    name: 'Arcade',
    rounds: RUN_ROUNDS,
    target: getRunTarget,
    maxEnergy: () => RUN_MAX_ENERGY,
    carryEnergy: true,
    parHints: true,
    optimal: true,
    bank: false,
    money: false,
    endScreen: 'overlay',
    lossTitle: 'Run Over',
    quitLabel: 'Abandon run',
    quitPrompt: 'Abandon this run? Your progress will be lost.',
  },
  classic: {
    name: 'Endless Classic',
    rounds: null,
    target: getTarget,
    maxEnergy: (round) => getBudget(round),
    carryEnergy: false,
    parHints: false,
    optimal: false,
    bank: true,
    money: false,
    endScreen: 'overlay',
    lossTitle: 'Game Over',
    quitLabel: 'Quit to menu',
    quitPrompt: 'Quit to the main menu? Your progress will be lost.',
  },
  roguelike: {
    name: 'Run',
    rounds: RUN_ROUNDS,
    target: getRoguelikeTarget,
    maxEnergy: (round, runConfig) => runConfig.maxEnergy,
    carryEnergy: true,
    parHints: false,
    optimal: true,
    bank: false,
    money: true,
    endScreen: 'overlay',
    lossTitle: 'Run Over',
    quitLabel: 'Abandon run',
    quitPrompt: 'Abandon this run? Your progress will be lost.',
  },
  // One round a day, the same for every player; its board, target and energy
  // come from the date (see daily/dailyBoard.js).
  daily: {
    name: 'Daily challenge',
    rounds: 1,
    target: () => DAILY_TARGETS[0],
    maxEnergy: () => DAILY_MAX_ENERGY,
    carryEnergy: false,
    parHints: false,
    optimal: true,
    bank: false,
    money: false,
    endScreen: 'daily',
    lossTitle: 'Out of energy',
    quitLabel: 'Leave daily',
    quitPrompt: 'Leave the daily challenge? Your attempt still counts.',
  },
  // A single round for learning the mechanic. Its target and max energy come
  // from the player's practice settings; these are only the defaults.
  practice: {
    name: 'Practice',
    rounds: 1,
    target: () => PRACTICE_DEFAULT_TARGET,
    maxEnergy: () => PRACTICE_DEFAULT_MAX_ENERGY,
    carryEnergy: false,
    parHints: false,
    optimal: true,
    bank: false,
    money: false,
    endScreen: 'stats',
    lossTitle: 'Round Over',
    quitLabel: 'Leave practice',
    quitPrompt: 'Leave practice? This round will be discarded.',
  },
};
