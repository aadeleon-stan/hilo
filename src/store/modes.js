import {
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
  getBudget,
  getRunTarget,
  getTarget,
} from './gameLogic';
import { getRoguelikeTarget } from './roguelike/constants';

// Per-mode rules, so screens and the store don't branch on one mode id.
//   rounds: round count, or null for endless.
//   target(round) / maxEnergy(round, runConfig): the round's goal and energy.
//   carryEnergy: one pool across rounds (vs. a fresh budget each round).
//   parHints: show the simulated energy par (Arcade tuning only).
//   optimal: best plays earn the Optimal tag and bonus.
//   bank: Classic's banked score.  money: the roguelike's money and shops.
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
    lossTitle: 'Run Over',
    quitLabel: 'Abandon run',
    quitPrompt: 'Abandon this run? Your progress will be lost.',
  },
};
