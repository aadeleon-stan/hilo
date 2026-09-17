import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generatePool,
  computeProduct,
  getRoundBonus,
  checkRoundEnd,
  RUN_ROUNDS,
  RUN_TURN_REFUND,
  getBestPlays,
  getBestPlayBonus,
} from './gameLogic';
import { MODES } from './modes';
import { PRACTICE_DEFAULT_MAX_ENERGY, PRACTICE_DEFAULT_TARGET } from './practice';
import {
  MONEY_PER_OPTIMAL,
  MONEY_PER_OVERSHOOT,
  MONEY_PER_ROUND,
  MONEY_PER_TURN_LEFT,
  SHOP_ROUNDS,
} from './roguelike/constants';
import { defaultRunConfig } from './roguelike/runConfig';
import { drawBoard } from './roguelike/pools';
import { moveCost, emptyEffects, clearNextPlayEffects } from './roguelike/effects';
import { UPGRADES_BY_ID, applyUpgrade, buildDraft } from './roguelike/upgrades';
import { ITEMS_BY_ID, itemContext, tileMatchesStep } from './roguelike/items';
import { RELICS_BY_ID } from './roguelike/relics';
import { buildShop, itemPrice } from './roguelike/shop';

let confirmTimer = null;

function scheduleConfirm(get) {
  clearTimeout(confirmTimer);
  confirmTimer = setTimeout(() => get().confirmSelection(), 150);
}

// Every action that changes the board cancels a pending auto-confirm, so it
// can't fire on tiles that no longer exist.
export function cancelConfirm() {
  clearTimeout(confirmTimer);
  confirmTimer = null;
}

const turnsLeftOf = (poolA, poolB) =>
  Math.min(poolA.filter((n) => !n.used).length, poolB.filter((n) => !n.used).length);

function baseState() {
  return {
    screen: 'menu',
    mode: 'run',
    round: 1,
    score: 0,
    energy: 0,
    maxEnergy: 0,
    roundTarget: 0,
    roundStartEnergy: 0,
    roundSpent: 0,
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
    // Every play of the current round, oldest first, for end-of-round stats.
    moveLog: [],

    // Practice only: the player's chosen round settings.
    practiceTarget: PRACTICE_DEFAULT_TARGET,
    practiceMaxEnergy: PRACTICE_DEFAULT_MAX_ENERGY,

    // Roguelike only.
    runConfig: null,
    money: 0,
    moneyEarned: 0,
    refundUncapped: 0,
    inventory: [],
    relics: [],
    draftOffers: [],
    draftPicks: 0,
    pendingPoolPick: null,
    shop: null,
    roundOptimals: 0,
    tempEffects: emptyEffects(),
    rerollsLeft: 0,
    freeSwapsLeft: 0,
    nextTileId: 0,
    // { itemId, source: { kind: 'item', slot } | { kind: 'charge', charge }, step, picks, error }
    targeting: null,
    // A message about the last item that couldn't be used.
    notice: null,
    runLog: [],
  };
}

// `overrides` lets a mode set its own target and energy (practice's settings,
// the daily puzzle) and carry extra state through the reset in baseState().
function startMode(mode, overrides = {}) {
  const rules = MODES[mode];
  const energy = overrides.maxEnergy ?? rules.maxEnergy(1);
  return {
    ...baseState(),
    screen: 'game',
    mode,
    energy,
    maxEnergy: energy,
    roundStartEnergy: energy,
    roundTarget: overrides.roundTarget ?? rules.target(1),
    poolA: overrides.poolA ?? generatePool(),
    poolB: overrides.poolB ?? generatePool(),
    ...(overrides.state ?? {}),
  };
}

// Round-end payout in the roguelike: refund for leftover turns (capped at
// max energy) and money. `s` is the state after the winning play.
function settleRoguelikeWin(s) {
  const cfg = s.runConfig;
  const turnsLeft = turnsLeftOf(s.poolA, s.poolB);
  const refundUncapped = Math.round(
    turnsLeft * cfg.refundPerTurn * cfg.refundMultiplier * (s.tempEffects.doubleRefund ? 2 : 1)
  );
  const refund = Math.max(0, Math.min(refundUncapped, s.maxEnergy - s.energy));
  const overshoot = Math.max(0, s.score - s.roundTarget);
  const earned =
    Math.floor(
      (MONEY_PER_ROUND +
        MONEY_PER_TURN_LEFT * turnsLeft +
        MONEY_PER_OPTIMAL * s.roundOptimals +
        Math.floor(MONEY_PER_OVERSHOOT * overshoot)) *
        cfg.moneyMultiplier
    ) + cfg.cashPerRound;

  return {
    energy: s.energy + refund,
    roundBonus: refund,
    refundUncapped,
    turnsAtEnd: turnsLeft,
    money: s.money + earned,
    moneyEarned: earned,
    targeting: null,
    phase: s.round === RUN_ROUNDS ? 'runWon' : 'win',
  };
}

const logEntry = (s, kind, id, extra = {}) => [...s.runLog, { round: s.round, kind, id, ...extra }];

const useGameStore = create(
  persist(
    (set, get) => {
      // Applies a finished item or charge: its patch, or its refusal message.
      function resolveTargetingResult(state, itemId, source, picks, result) {
        if (typeof result === 'string') {
          if (source.kind === 'item' && ITEMS_BY_ID[itemId].steps.length === 0) {
            set({ notice: result });
          } else {
            set({ targeting: { itemId, source, step: 0, picks: [], error: result } });
          }
          return;
        }

        const { openShop, ...patch } = result;
        const next = { ...patch, targeting: null, notice: null, selectedA: null, selectedB: null };
        if (source.kind === 'item') {
          next.inventory = state.inventory.filter((_, i) => i !== source.slot);
          next.runLog = logEntry(state, 'use', itemId);
        } else if (source.charge === 'reroll') {
          next.rerollsLeft = state.rerollsLeft - 1;
        } else {
          next.freeSwapsLeft = state.freeSwapsLeft - 1;
        }
        if (openShop) {
          next.shop = buildShop(state.runConfig, state.relics, {
            withRelics: false,
            returnTo: state.phase,
          });
          next.phase = 'shop';
        }
        cancelConfirm();
        set(next);

        // An item can finish the round (a lowered target).
        const after = get();
        if (after.phase === 'selecting' && after.score >= after.roundTarget) {
          set(settleRoguelikeWin(after));
        }
      }

      function finishDraft() {
        const state = get();
        const tempEffects = { ...state.tempEffects, extraPick: false };
        if (SHOP_ROUNDS.includes(state.round)) {
          set({
            tempEffects,
            draftOffers: [],
            pendingPoolPick: null,
            phase: 'shop',
            shop: buildShop(state.runConfig, state.relics, { withRelics: true }),
          });
        } else {
          set({ tempEffects, draftOffers: [], pendingPoolPick: null });
          get().nextRoguelikeRound();
        }
      }

      function takeUpgrade(index, pool) {
        const state = get();
        const card = UPGRADES_BY_ID[state.draftOffers[index]];
        const runConfig = applyUpgrade(state.runConfig, card, pool);
        const draftPicks = state.draftPicks + 1;
        const grant = card.grantsEnergy ?? 0;
        set({
          runConfig,
          maxEnergy: runConfig.maxEnergy,
          energy: Math.min(runConfig.maxEnergy, state.energy + grant),
          draftPicks,
          pendingPoolPick: null,
          runLog: logEntry(state, 'upgrade', card.id, pool ? { pool } : {}),
        });

        const allowed = state.tempEffects.extraPick ? 2 : 1;
        if (draftPicks < allowed) {
          const rest = state.draftOffers.filter((_, i) => i !== index);
          const stillEligible = rest.filter((id) => {
            const c = UPGRADES_BY_ID[id];
            return c.needsPool
              ? c.eligible(runConfig, 'A') || c.eligible(runConfig, 'B')
              : c.eligible(runConfig);
          });
          if (stillEligible.length > 0) {
            set({ draftOffers: stillEligible });
            return;
          }
        }
        finishDraft();
      }

      return {
        ...baseState(),

        startRun: () => {
          cancelConfirm();
          set(startMode('run'));
        },

        startClassic: () => {
          cancelConfirm();
          set(startMode('classic'));
        },

        // --- Practice ---

        startPractice: () => {
          cancelConfirm();
          const { practiceTarget, practiceMaxEnergy } = get();
          set(
            startMode('practice', {
              roundTarget: practiceTarget,
              maxEnergy: practiceMaxEnergy,
              state: { practiceTarget, practiceMaxEnergy },
            })
          );
        },

        // A fresh board with the current settings; also how the setters apply,
        // so a mid-round change can't leave an unreachable target.
        resetPracticeRound: () => get().startPractice(),

        setPracticeTarget: (target) => {
          set({ practiceTarget: target });
          get().startPractice();
        },

        setPracticeMaxEnergy: (maxEnergy) => {
          set({ practiceMaxEnergy: maxEnergy });
          get().startPractice();
        },

        startRoguelike: () => {
          cancelConfirm();
          const runConfig = defaultRunConfig();
          const board = drawBoard(runConfig, 0);
          const rules = MODES.roguelike;
          set({
            ...baseState(),
            screen: 'game',
            mode: 'roguelike',
            runConfig,
            energy: runConfig.maxEnergy,
            maxEnergy: runConfig.maxEnergy,
            roundStartEnergy: runConfig.maxEnergy,
            roundTarget: rules.target(1),
            ...board,
          });
        },

        selectFromPoolA: (id) => get().selectTile('A', id),
        selectFromPoolB: (id) => get().selectTile('B', id),

        selectTile: (which, id) => {
          const state = get();
          if (state.phase !== 'selecting') return;
          if (state.targeting) {
            get().targetTile(which, id);
            return;
          }
          const pool = which === 'A' ? state.poolA : state.poolB;
          const item = pool.find((n) => n.id === id);
          if (!item || item.used) return;
          set(which === 'A' ? { selectedA: id, notice: null } : { selectedB: id, notice: null });

          const other = which === 'A' ? state.selectedB : state.selectedA;
          if (other !== null) scheduleConfirm(get);
        },

        confirmSelection: () => {
          const state = get();
          if (state.selectedA === null || state.selectedB === null) return;
          if (state.phase !== 'selecting' || state.targeting) return;

          const a = state.poolA.find((n) => n.id === state.selectedA);
          const b = state.poolB.find((n) => n.id === state.selectedB);
          if (!a || !b) return;

          const rules = MODES[state.mode];
          const isRoguelike = state.mode === 'roguelike';
          const target = state.roundTarget;

          // Best plays are judged against the board as it was before this
          // move, on raw products. Energy is paced over the rounds this mode
          // has left: a single round spends its own budget, a run spreads it.
          const roundsLeft = rules.rounds ? rules.rounds - state.round + 1 : 1;
          const wasBest =
            rules.optimal &&
            getBestPlays(
              state.poolA,
              state.poolB,
              state.score,
              target,
              state.energy,
              roundsLeft
            ).has(`${a.id}:${b.id}`);

          const result = computeProduct(a.value, b.value);
          const { cost, points } = isRoguelike
            ? moveCost(state.runConfig, state.tempEffects, a.value, b.value, state.turn === 0)
            : { cost: result.highWord, points: result.lowWord };

          const newPoolA = state.poolA.map((n) =>
            n.id === state.selectedA ? { ...n, used: true } : n
          );
          const newPoolB = state.poolB.map((n) =>
            n.id === state.selectedB ? { ...n, used: true } : n
          );
          const newScore = state.score + points;
          let newEnergy = state.energy - cost;

          let tempEffects = state.tempEffects;
          let savedByNet = false;
          if (isRoguelike) {
            tempEffects = clearNextPlayEffects(tempEffects);
            if (newEnergy < 0 && tempEffects.safetyNet) {
              newEnergy = 1;
              tempEffects.safetyNet = false;
              savedByNet = true;
            }
          }

          const outcome = checkRoundEnd(newScore, target, newEnergy, newPoolA, newPoolB);
          const turnsRemaining = turnsLeftOf(newPoolA, newPoolB);

          const moveState = {
            poolA: newPoolA,
            poolB: newPoolB,
            selectedA: null,
            selectedB: null,
            turn: state.turn + 1,
            score: newScore,
            roundSpent: state.roundSpent + cost,
            turnsAtEnd: outcome === 'win' ? turnsRemaining : 0,
            moveLog: [
              ...state.moveLog,
              { a: a.value, b: b.value, product: result.product, cost, points, isBest: wasBest },
            ],
          };

          if (rules.bank) {
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

          // Recovery is applied after the round-end check, so it can't rescue
          // an overspend. Both sources are capped at max energy.
          const isBest = wasBest && outcome !== 'loss';
          const rawBonus = isRoguelike
            ? Math.min(state.runConfig.bonusCap, Math.ceil(cost / 2))
            : getBestPlayBonus(result.highWord);
          const bestBonus = isBest
            ? Math.max(0, Math.min(rawBonus, state.maxEnergy - newEnergy))
            : 0;

          if (isRoguelike) {
            const next = {
              ...moveState,
              lastResult: { ...result, cost, points, isBest, bonus: bestBonus, savedByNet },
              energy: newEnergy + bestBonus,
              tempEffects,
              roundOptimals: state.roundOptimals + (isBest ? 1 : 0),
              roundBonus: 0,
              moneyEarned: 0,
              notice: null,
              phase: outcome || 'selecting',
            };
            if (outcome === 'win') Object.assign(next, settleRoguelikeWin({ ...state, ...next }));
            set(next);
            return;
          }

          // Only modes that carry energy between rounds refund leftover turns.
          const refund =
            outcome === 'win' && rules.carryEnergy
              ? Math.min(turnsRemaining * RUN_TURN_REFUND, state.maxEnergy - newEnergy - bestBonus)
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
          const rules = MODES[state.mode];
          const newRound = state.round + 1;
          const maxEnergy = rules.maxEnergy(newRound);
          const energy = rules.carryEnergy ? state.energy : maxEnergy;
          set({
            round: newRound,
            score: 0,
            energy,
            maxEnergy,
            roundTarget: rules.target(newRound),
            roundStartEnergy: energy,
            roundSpent: 0,
            phase: 'selecting',
            poolA: generatePool(),
            poolB: generatePool(),
            selectedA: null,
            selectedB: null,
            lastResult: null,
            roundBonus: 0,
            turnsAtEnd: 0,
            turn: 0,
            moveLog: [],
          });
        },

        // --- Roguelike: rounds, draft and shop ---

        nextRoguelikeRound: () => {
          cancelConfirm();
          const state = get();
          const cfg = state.runConfig;
          const newRound = state.round + 1;
          const board = drawBoard(cfg, state.nextTileId, state.tempEffects.twinDraw);
          set({
            ...board,
            round: newRound,
            score: 0,
            roundTarget: MODES.roguelike.target(newRound),
            maxEnergy: cfg.maxEnergy,
            roundStartEnergy: state.energy,
            roundSpent: 0,
            phase: 'selecting',
            selectedA: null,
            selectedB: null,
            lastResult: null,
            roundBonus: 0,
            refundUncapped: 0,
            moneyEarned: 0,
            turnsAtEnd: 0,
            turn: 0,
            moveLog: [],
            roundOptimals: 0,
            tempEffects: { ...emptyEffects(), extraPick: state.tempEffects.extraPick },
            rerollsLeft: cfg.rerollsPerRound,
            freeSwapsLeft: cfg.freeSwapsPerRound,
            draftOffers: [],
            draftPicks: 0,
            pendingPoolPick: null,
            shop: null,
            targeting: null,
            notice: null,
          });
        },

        continueAfterWin: () => {
          cancelConfirm();
          const state = get();
          if (state.phase !== 'win') return;
          const draftOffers = buildDraft(state.runConfig);
          set({
            phase: 'draft',
            draftOffers,
            draftPicks: 0,
            pendingPoolPick: null,
            notice: null,
          });
          if (draftOffers.length === 0) finishDraft();
        },

        pickUpgrade: (index) => {
          const state = get();
          if (state.phase !== 'draft') return;
          const card = UPGRADES_BY_ID[state.draftOffers[index]];
          if (!card) return;
          if (card.needsPool) set({ pendingPoolPick: index, notice: null });
          else takeUpgrade(index, null);
        },

        choosePool: (pool) => {
          const state = get();
          if (state.phase !== 'draft' || state.pendingPoolPick === null) return;
          const card = UPGRADES_BY_ID[state.draftOffers[state.pendingPoolPick]];
          if (!card.eligible(state.runConfig, pool)) return;
          takeUpgrade(state.pendingPoolPick, pool);
        },

        cancelPoolPick: () => set({ pendingPoolPick: null }),

        declineDraft: () => {
          if (get().phase !== 'draft') return;
          finishDraft();
        },

        takeRelic: (index) => {
          const state = get();
          const { shop } = state;
          if (state.phase !== 'shop' || !shop || shop.relicTaken) return;
          const relic = RELICS_BY_ID[shop.relicChoice[index]];
          if (!relic) return;
          const runConfig = relic.apply(state.runConfig);
          set({
            runConfig,
            maxEnergy: runConfig.maxEnergy,
            energy: Math.min(runConfig.maxEnergy, state.energy + (relic.grantsEnergy ?? 0)),
            relics: [...state.relics, relic.id],
            shop: { ...shop, relicTaken: true },
            runLog: logEntry(state, 'relic', relic.id),
          });
        },

        buyItem: (index) => {
          const state = get();
          const { shop } = state;
          if (state.phase !== 'shop' || !shop) return;
          const offer = shop.items[index];
          if (!offer || offer.sold) return;
          const price = itemPrice(state.runConfig, shop, offer.id);
          if (state.money < price) return;
          if (state.inventory.length >= state.runConfig.inventorySize) return;
          set({
            money: state.money - price,
            inventory: [...state.inventory, offer.id],
            shop: {
              ...shop,
              items: shop.items.map((item, i) => (i === index ? { ...item, sold: true } : item)),
            },
            runLog: logEntry(state, 'buy', offer.id, { price }),
          });
        },

        leaveShop: () => {
          const state = get();
          if (state.phase !== 'shop' || !state.shop) return;
          if (state.shop.returnTo) {
            set({ phase: state.shop.returnTo, shop: null, notice: null });
          } else {
            get().nextRoguelikeRound();
          }
        },

        // --- Roguelike: items and charges ---

        activateItem: (slot) => {
          cancelConfirm();
          const state = get();
          const itemId = state.inventory[slot];
          const item = ITEMS_BY_ID[itemId];
          if (!item || !item.usableIn.includes(itemContext(state.phase))) return;
          if (state.phase === 'selecting' && state.targeting) {
            set({ targeting: null });
          }

          const source = { kind: 'item', slot };
          if (item.steps.length === 0) {
            resolveTargetingResult(get(), itemId, source, [], item.apply(get(), []));
          } else {
            set({
              selectedA: null,
              selectedB: null,
              notice: null,
              targeting: { itemId, source, step: 0, picks: [], error: null },
            });
          }
        },

        startCharge: (charge) => {
          cancelConfirm();
          const state = get();
          if (state.phase !== 'selecting') return;
          const left = charge === 'reroll' ? state.rerollsLeft : state.freeSwapsLeft;
          if (left <= 0) return;
          set({
            selectedA: null,
            selectedB: null,
            notice: null,
            targeting: {
              itemId: charge === 'reroll' ? 'reroll-tile' : 'digit-swap',
              source: { kind: 'charge', charge },
              step: 0,
              picks: [],
              error: null,
            },
          });
        },

        targetTile: (which, id) => {
          const state = get();
          const { targeting } = state;
          if (!targeting || state.phase !== 'selecting') return;
          const tile = (which === 'A' ? state.poolA : state.poolB).find((t) => t.id === id);
          if (!tile || !tileMatchesStep(targeting, which, tile)) return;
          get().advanceTargeting({ pool: which, id });
        },

        targetPool: (which) => {
          const { targeting } = get();
          if (!targeting) return;
          const step = ITEMS_BY_ID[targeting.itemId].steps[targeting.step];
          if (step?.select !== 'pool') return;
          get().advanceTargeting({ pool: which });
        },

        advanceTargeting: (pick) => {
          const state = get();
          const { targeting } = state;
          const item = ITEMS_BY_ID[targeting.itemId];
          const picks = [...targeting.picks, pick];
          if (picks.length < item.steps.length) {
            set({ targeting: { ...targeting, step: targeting.step + 1, picks, error: null } });
            return;
          }
          resolveTargetingResult(
            state,
            targeting.itemId,
            targeting.source,
            picks,
            item.apply(state, picks)
          );
        },

        cancelTargeting: () => set({ targeting: null }),

        discardItem: (slot) => {
          const state = get();
          if (state.targeting?.source.kind === 'item') set({ targeting: null });
          set({
            inventory: state.inventory.filter((_, i) => i !== slot),
            notice: null,
            runLog: logEntry(state, 'discard', state.inventory[slot]),
          });
        },

        dismissNotice: () => set({ notice: null }),

        resetGame: () => {
          cancelConfirm();
          set(baseState());
          useGameStore.persist.clearStorage();
        },
      };
    },
    {
      name: 'hilo-roguelike-run',
      version: 1,
      // Only a roguelike run in progress is saved; selections, targeting and
      // the last move's reveal are not.
      partialize: (s) => {
        if (s.mode !== 'roguelike' || s.screen !== 'game') return {};
        const {
          selectedA,
          selectedB,
          targeting,
          notice,
          lastResult,
          ...rest
        } = s;
        return Object.fromEntries(
          Object.entries(rest).filter(([, value]) => typeof value !== 'function')
        );
      },
    }
  )
);

export default useGameStore;
