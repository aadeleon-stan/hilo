import { computeProduct } from '../gameLogic';

// The energy cost and points of a move after relics, upgrades and one-shot
// item effects. Used for the real move and the Easy mode previews alike.
// `fx` is the store's tempEffects; `firstPlay` is true for a round's first move.
export function moveCost(cfg, fx, a, b, firstPlay) {
  const { product, highWord, lowWord } = computeProduct(a, b);
  let cost = highWord;
  let points = lowWord;

  if (fx.flip) [cost, points] = [lowWord, highWord];
  if (fx.highWordBonus) points += highWord;
  if (cfg.over4000Double && product > 4000) points *= 2;
  if (fx.doublePoints) points *= 2;

  if (cfg.highFactorDiscount && (a >= 70 || b >= 70)) cost = Math.floor(cost * 0.75);
  if (fx.halfCost) cost = Math.floor(cost / 2);
  if (fx.freePlay || (cfg.squaresFree && a === b) || (cfg.firstPlayFree && firstPlay)) cost = 0;

  return { cost, points };
}

// Effects that last until the next play.
export const NEXT_PLAY_EFFECTS = ['freePlay', 'halfCost', 'doublePoints', 'flip', 'highWordBonus'];

export function emptyEffects() {
  return {
    // Next play
    freePlay: false,
    halfCost: false,
    doublePoints: false,
    flip: false,
    highWordBonus: false,
    // This round
    doubleRefund: false,
    safetyNet: false,
    // Next round / next draft
    twinDraw: false,
    extraPick: false,
  };
}

export function clearNextPlayEffects(fx) {
  const out = { ...fx };
  for (const key of NEXT_PLAY_EFFECTS) out[key] = false;
  return out;
}
