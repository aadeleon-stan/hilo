import { redrawUnused, rerollValue, replaceTile } from './pools';
import { buildDraft } from './upgrades';
import { otherPool } from './runConfig';

// Consumable items: bought in the shop, held in the inventory, used once.
//   usableIn: where the item works — 'round' (mid-round), 'draft', 'shop'.
//   steps: what the player picks before it applies, in order. A step is
//     { select: 'tile', pool: 'any' | 'A' | 'B' | 'same' | 'other', used, prompt }
//     or { select: 'pool', prompt }. 'same' and 'other' refer to the first pick.
//   apply(state, picks): a store patch, or a string explaining why it can't
//     be used. It may return { openShop: true } for the store to handle.
// Items with shop: false are never sold; they back the per-round charges.

const poolKey = (which) => (which === 'A' ? 'poolA' : 'poolB');
const tileOf = (state, pick) => state[poolKey(pick.pool)].find((t) => t.id === pick.id);

// Sets an unused tile to a new value, keeping pools free of repeats.
function setTileValue(state, which, tileId, value) {
  if (value < 10 || value > 99) return 'The result must stay between 10 and 99.';
  const tiles = state[poolKey(which)];
  if (tiles.some((t) => t.id !== tileId && t.value === value)) {
    return `Pool ${which} already has ${value}.`;
  }
  const { tiles: next, nextTileId } = replaceTile(tiles, tileId, value, state.nextTileId);
  return { [poolKey(which)]: next, nextTileId };
}

const effect = (key, message) => (state) =>
  state.tempEffects[key] ? message : { tempEffects: { ...state.tempEffects, [key]: true } };

const oneTile = (prompt) => [{ select: 'tile', pool: 'any', used: false, prompt }];

function lowerTarget(amount) {
  return (state) => ({ roundTarget: Math.max(1, state.roundTarget - amount) });
}

function digitSwap(state, [pick]) {
  const { value } = tileOf(state, pick);
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (ones === 0) return `${value} ends in 0, so it can't be swapped.`;
  if (tens === ones) return `Swapping ${value} doesn't change it.`;
  return setTileValue(state, pick.pool, pick.id, ones * 10 + tens);
}

function nudge(delta) {
  return (state, [pick]) => setTileValue(state, pick.pool, pick.id, tileOf(state, pick).value + delta);
}

function rerollOnes(state, [pick]) {
  const { value } = tileOf(state, pick);
  const tens = Math.floor(value / 10) * 10;
  const inPool = new Set(state[poolKey(pick.pool)].map((t) => t.value));
  const options = [];
  for (let d = 1; d <= 9; d++) {
    if (tens + d !== value && !inPool.has(tens + d)) options.push(tens + d);
  }
  if (options.length === 0) return `Every other ${tens}s number is already in Pool ${pick.pool}.`;
  const next = options[Math.floor(Math.random() * options.length)];
  return setTileValue(state, pick.pool, pick.id, next);
}

function rerollTile(state, [pick]) {
  const value = rerollValue(state.runConfig.pools[pick.pool], state[poolKey(pick.pool)]);
  if (value === null) return `Pool ${pick.pool} has no other numbers to draw.`;
  return setTileValue(state, pick.pool, pick.id, value);
}

function redrawPools(state, pools) {
  const patch = {};
  let nextTileId = state.nextTileId;
  for (const which of pools) {
    const result = redrawUnused(state.runConfig.pools[which], state[poolKey(which)], nextTileId);
    patch[poolKey(which)] = result.tiles;
    nextTileId = result.nextTileId;
  }
  return { ...patch, nextTileId };
}

export const ITEMS = [
  {
    id: 'digit-swap',
    label: 'Digit swap',
    desc: 'Swap the digits of one unused number (47 → 74).',
    price: 40,
    usableIn: ['round'],
    steps: oneTile('Choose a number to swap its digits'),
    apply: digitSwap,
  },
  {
    id: 'half-cost',
    label: 'Half cost',
    desc: 'Your next play costs half energy.',
    price: 40,
    usableIn: ['round'],
    steps: [],
    apply: effect('halfCost', 'Half cost is already active.'),
  },
  {
    id: 'lower-target-25',
    label: 'Target −25',
    desc: "Lower this round's target by 25.",
    price: 40,
    usableIn: ['round'],
    steps: [],
    apply: lowerTarget(25),
  },
  {
    id: 'energy-25',
    label: '+25 energy',
    desc: 'Gain 25 energy now (up to your max).',
    price: 60,
    usableIn: ['round', 'draft', 'shop'],
    steps: [],
    apply: (state) =>
      state.energy >= state.maxEnergy
        ? 'Your energy is already full.'
        : { energy: Math.min(state.maxEnergy, state.energy + 25) },
  },
  {
    id: 'free-play',
    label: 'Free play',
    desc: 'Your next play costs no energy.',
    price: 80,
    usableIn: ['round'],
    steps: [],
    apply: effect('freePlay', 'Free play is already active.'),
  },
  {
    id: 'reroll-pool',
    label: 'Reroll a pool',
    desc: 'Redraw every unused number in one pool.',
    price: 80,
    usableIn: ['round'],
    steps: [{ select: 'pool', prompt: 'Choose a pool to reroll' }],
    apply: (state, [pick]) => redrawPools(state, [pick.pool]),
  },
  {
    id: 'revive',
    label: 'Revive a factor',
    desc: 'Bring back a used number, and remove an unused one from the same pool.',
    price: 80,
    usableIn: ['round'],
    steps: [
      { select: 'tile', pool: 'any', used: true, prompt: 'Choose a used number to bring back' },
      { select: 'tile', pool: 'same', used: false, prompt: 'Choose an unused number in the same pool to remove' },
    ],
    apply: (state, [revive, remove]) => {
      const key = poolKey(revive.pool);
      return {
        [key]: state[key].map((t) => {
          if (t.id === revive.id) return { ...t, used: false };
          if (t.id === remove.id) return { ...t, used: true };
          return t;
        }),
      };
    },
  },
  {
    id: 'copy-tile',
    label: 'Copy a number',
    desc: 'Copy an unused number into the other pool, replacing a number there.',
    price: 80,
    usableIn: ['round'],
    steps: [
      { select: 'tile', pool: 'any', used: false, prompt: 'Choose a number to copy' },
      { select: 'tile', pool: 'other', used: false, prompt: 'Choose a number in the other pool to replace' },
    ],
    apply: (state, [source, dest]) =>
      setTileValue(state, dest.pool, dest.id, tileOf(state, source).value),
  },
  {
    id: 'double-points',
    label: 'Double points',
    desc: 'Your next play scores double points.',
    price: 120,
    usableIn: ['round'],
    steps: [],
    apply: effect('doublePoints', 'Double points is already active.'),
  },
  {
    id: 'board-refresh',
    label: 'Board refresh',
    desc: 'Redraw every unused number in both pools. Score and energy stay.',
    price: 120,
    usableIn: ['round'],
    steps: [],
    apply: (state) => redrawPools(state, ['A', 'B']),
  },
  {
    id: 'shopping-app',
    label: 'Shopping app',
    desc: 'Open a shop right now (items only, no relic).',
    price: 120,
    usableIn: ['round', 'draft'],
    steps: [],
    apply: () => ({ openShop: true }),
  },
  {
    id: 'discount-voucher',
    label: 'Discount voucher',
    desc: "This shop's items cost half.",
    price: 40,
    usableIn: ['shop'],
    steps: [],
    apply: (state) => {
      if (state.shop.voucher) return 'A voucher is already active in this shop.';
      if (state.shop.items.every((item) => item.sold)) return 'Nothing is left to buy.';
      return { shop: { ...state.shop, voucher: true } };
    },
  },
  {
    id: 'nudge-up',
    label: 'Nudge up',
    desc: 'Add 1 to an unused number (47 → 48).',
    price: 20,
    usableIn: ['round'],
    steps: oneTile('Choose a number to raise by 1'),
    apply: nudge(1),
  },
  {
    id: 'nudge-down',
    label: 'Nudge down',
    desc: 'Subtract 1 from an unused number (47 → 46).',
    price: 20,
    usableIn: ['round'],
    steps: oneTile('Choose a number to lower by 1'),
    apply: nudge(-1),
  },
  {
    id: 'reroll-ones',
    label: 'Reroll ones digit',
    desc: 'Give an unused number a new random ones digit in the same decade (never 0).',
    price: 40,
    usableIn: ['round'],
    steps: oneTile('Choose a number to reroll its ones digit'),
    apply: rerollOnes,
  },
  {
    id: 'trade',
    label: 'Trade',
    desc: 'Swap an unused number in Pool A with one in Pool B.',
    price: 40,
    usableIn: ['round'],
    steps: [
      { select: 'tile', pool: 'A', used: false, prompt: 'Choose a number in Pool A' },
      { select: 'tile', pool: 'B', used: false, prompt: 'Choose a number in Pool B' },
    ],
    apply: (state, [fromA, fromB]) => {
      const a = tileOf(state, fromA).value;
      const b = tileOf(state, fromB).value;
      if (a === b) return 'Those numbers are the same.';
      const first = setTileValue(state, 'A', fromA.id, b);
      if (typeof first === 'string') return first;
      const second = setTileValue({ ...state, ...first }, 'B', fromB.id, a);
      if (typeof second === 'string') return second;
      return { ...first, ...second };
    },
  },
  {
    id: 'flip',
    label: 'Flip',
    desc: "Your next play's high digits score points and its low digits cost energy (4321: +43 pts, −21 energy).",
    price: 80,
    usableIn: ['round'],
    steps: [],
    apply: effect('flip', 'Flip is already active.'),
  },
  {
    id: 'high-word-bonus',
    label: 'High digits bonus',
    desc: 'Your next play also scores its high digits as points. Cost is unchanged.',
    price: 80,
    usableIn: ['round'],
    steps: [],
    apply: effect('highWordBonus', 'High digits bonus is already active.'),
  },
  {
    id: 'lower-target-60',
    label: 'Target −60',
    desc: "Lower this round's target by 60.",
    price: 100,
    usableIn: ['round'],
    steps: [],
    apply: lowerTarget(60),
  },
  {
    id: 'double-refund',
    label: 'Double refund',
    desc: "Double this round's energy refund for leftover turns.",
    price: 60,
    usableIn: ['round'],
    steps: [],
    apply: effect('doubleRefund', 'Double refund is already active this round.'),
  },
  {
    id: 'safety-net',
    label: 'Safety net',
    desc: 'This round, the first play that would overspend leaves you at 1 energy instead of losing.',
    price: 120,
    usableIn: ['round'],
    steps: [],
    apply: effect('safetyNet', 'A safety net is already active this round.'),
  },
  {
    id: 'twin-draw',
    label: 'Twin draw',
    desc: 'Next round, both pools share at least one number.',
    price: 60,
    usableIn: ['round', 'draft', 'shop'],
    steps: [],
    apply: effect('twinDraw', 'Twin draw is already active.'),
  },
  {
    id: 'draft-reroll',
    label: 'Draft reroll',
    desc: 'Replace the cards in this draft with new ones.',
    price: 40,
    usableIn: ['draft'],
    steps: [],
    apply: (state) => {
      const offers = buildDraft(state.runConfig, state.draftOffers);
      if (offers.length === 0) return 'No other cards are available.';
      return { draftOffers: offers, pendingPoolPick: null };
    },
  },
  {
    id: 'extra-pick',
    label: 'Extra pick',
    desc: 'Take 2 cards from your next draft.',
    price: 120,
    usableIn: ['round', 'draft', 'shop'],
    steps: [],
    apply: effect('extraPick', 'Extra pick is already active.'),
  },
  // Charges from upgrades and relics, never sold.
  {
    id: 'reroll-tile',
    label: 'Reroll',
    desc: 'Replace an unused number with a new draw.',
    shop: false,
    usableIn: ['round'],
    steps: oneTile('Choose a number to reroll'),
    apply: rerollTile,
  },
];

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item]));
export const SHOP_ITEMS = ITEMS.filter((item) => item.shop !== false);

// Where the player is, for usableIn: null when no item can be used.
export function itemContext(phase) {
  if (phase === 'selecting') return 'round';
  if (phase === 'draft' || phase === 'shop') return phase;
  return null;
}

// Whether a tile can be picked for the current targeting step.
export function tileMatchesStep(targeting, which, tile) {
  const step = ITEMS_BY_ID[targeting.itemId].steps[targeting.step];
  if (!step || step.select !== 'tile') return false;
  if (tile.used !== step.used) return false;
  const first = targeting.picks[0]?.pool;
  if (step.pool === 'same') return which === first;
  if (step.pool === 'other') return which === otherPool(first);
  return step.pool === 'any' || step.pool === which;
}
