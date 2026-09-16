// Roguelike mode tuning. Run shape and money come from
// feature-docs/roguelike-mvp.md (sections 1, 3 and 5); the catalog from
// feature-docs/roguelike-mode.txt. Playtest values, not balanced.
export const ROGUELIKE_TARGETS = [130, 135, 155, 185, 230, 285, 355, 435, 525, 630];

export const POOL_SIZE = 9;
export const START_DECADES = [40, 50, 60, 70];
export const START_MAX_ENERGY = 200;
export const START_REFUND_PER_TURN = 5;
export const START_BONUS_CAP = 6;
export const START_INVENTORY_SIZE = 3;

export const DRAFT_SIZE = 3;
export const SHOP_ROUNDS = [3, 6, 9];
export const SHOP_ITEM_COUNT = 3;
export const RELIC_CHOICE_COUNT = 2;
export const MAX_GUARANTEES_PER_POOL = 4;
export const MAX_REROLLS_PER_ROUND = 3;

export const MONEY_PER_ROUND = 5;
export const MONEY_PER_TURN_LEFT = 1;
export const MONEY_PER_OPTIMAL = 2;
export const MONEY_PER_OVERSHOOT = 0.5;

export function getRoguelikeTarget(round) {
  return ROGUELIKE_TARGETS[round - 1];
}
