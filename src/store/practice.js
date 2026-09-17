import { ROGUELIKE_TARGETS } from './roguelike/constants';

// Practice defaults: roguelike round 1, which is also the first target preset.
export const PRACTICE_DEFAULT_TARGET = ROGUELIKE_TARGETS[0];
export const PRACTICE_DEFAULT_MAX_ENERGY = 200;

// Target presets are the roguelike's ten round targets, so practice can
// rehearse any point in a run.
export const PRACTICE_TARGET_PRESETS = ROGUELIKE_TARGETS.map((target, i) => ({
  target,
  label: `Round ${i + 1} · ${target}`,
}));

export const PRACTICE_ENERGY_PRESETS = [120, 160, 200, 240, 300];
