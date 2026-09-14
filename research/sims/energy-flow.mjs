// Where does run energy go under each best-play rule?
// Usage: VARIANT=original|all|cheapest|limit N=300 node energy-flow.mjs
// limit = cheapest finishing move(s) plus finishing moves costing no more than
// the priciest scored best play (the shipped rule).
import {
  generatePool, computeProduct, getBestPlayBonus, getRunTarget, checkRoundEnd,
  RUN_ROUNDS, RUN_MAX_ENERGY, RUN_TURN_REFUND, BEST_PLAY_TOLERANCE, BEST_PLAY_MIN_SCORE,
} from '../../src/store/gameLogic.js';

const VARIANT = process.env.VARIANT;
const N = Number(process.env.N || 300);
if (!['original', 'all', 'cheapest', 'limit'].includes(VARIANT)) throw new Error('VARIANT must be original|all|cheapest|limit');

const poolsFrom = (vals, mask) => vals.map((value, id) => ({ id, value, used: !!((mask >> id) & 1) }));

// Original scored rule (copy), plus the finishing-move addition for the chosen variant.
// Returns the best set and which keys are best ONLY because they finish the round.
function bestPlays(poolA, poolB, score, target, energy, roundsLeft) {
  const openA = poolA.filter((n) => !n.used), openB = poolB.filter((n) => !n.used);
  const turnsLeft = Math.min(openA.length, openB.length);
  const best = new Set(), finishOnly = new Set();
  if (!turnsLeft) return { best, finishOnly };
  const sp = Math.max(1, (target - score) / turnsLeft), bp = Math.max(1, energy / roundsLeft / turnsLeft);
  const moves = []; let max = -Infinity;
  for (const a of openA) for (const b of openB) {
    const { highWord: h, lowWord: l } = computeProduct(a.value, b.value);
    const v = l / sp - h / bp;
    moves.push({ key: `${a.id}:${b.id}`, h, l, v });
    if (l >= BEST_PLAY_MIN_SCORE && v > max) max = v;
  }
  for (const m of moves) {
    if (m.l < BEST_PLAY_MIN_SCORE || m.v < max - BEST_PLAY_TOLERANCE) continue;
    if (moves.some((o) => o.h <= m.h && o.l >= m.l && (o.h < m.h || o.l > m.l))) continue;
    best.add(m.key);
  }
  if (VARIANT !== 'original') {
    const finishing = moves.filter((m) => m.l >= target - score);
    const cheapest = finishing.length ? Math.min(...finishing.map((m) => m.h)) : Infinity;
    const limit = Math.max(...moves.filter((m) => best.has(m.key)).map((m) => m.h));
    for (const m of finishing) {
      if (VARIANT === 'all' || m.h === cheapest || (VARIANT === 'limit' && m.h <= limit)) {
        if (!best.has(m.key)) finishOnly.add(m.key);
        best.add(m.key);
      }
    }
  }
  return { best, finishOnly };
}

// Mirrors useGameStore.confirmSelection in run mode, tracking where energy comes from and where it's lost.
function applyMove(st, A, B, i, j, round) {
  const target = getRunTarget(round);
  const key = `${i}:${j}`;
  const { best, finishOnly } = bestPlays(poolsFrom(A, st.ua), poolsFrom(B, st.ub), st.s, target, st.e, RUN_ROUNDS - round + 1);
  const { highWord: h, lowWord: l } = computeProduct(A[i], B[j]);
  const ua = st.ua | (1 << i), ub = st.ub | (1 << j);
  const s = st.s + l; let e = st.e - h;
  const outcome = checkRoundEnd(s, target, e, poolsFrom(A, ua), poolsFrom(B, ub));
  const f = { ...st.f };
  f.gross += h;
  if (best.has(key) && outcome !== 'loss') {
    const raw = getBestPlayBonus(h), got = Math.min(raw, RUN_MAX_ENERGY - e);
    e += got; f.bonusGot += got; f.bonusLost += raw - got; f.bestPlays++;
    if (finishOnly.has(key)) { f.finishBonusGot += got; f.finishBonusLost += raw - got; }
  }
  if (outcome === 'win') {
    const raw = (9 - st.t - 1) * RUN_TURN_REFUND, got = Math.min(raw, RUN_MAX_ENERGY - e);
    e += got; f.refundGot += got; f.refundLost += raw - got;
  }
  return { ua, ub, s, e, t: st.t + 1, outcome, f };
}

const zero = () => ({ gross: 0, bonusGot: 0, bonusLost: 0, finishBonusGot: 0, finishBonusLost: 0, refundGot: 0, refundLost: 0, bestPlays: 0 });
const fresh = (E) => ({ ua: 0, ub: 0, s: 0, e: E, t: 0, outcome: null, f: zero() });
const openMoves = (st) => { const m = []; for (let i = 0; i < 9; i++) if (!((st.ua >> i) & 1)) for (let j = 0; j < 9; j++) if (!((st.ub >> j) & 1)) m.push([i, j]); return m; };

function greedyRound(A, B, E, round, lam) {
  let st = fresh(E);
  while (!st.outcome) {
    let pick = null, bv = -Infinity;
    for (const [i, j] of openMoves(st)) { const { highWord: h, lowWord: l } = computeProduct(A[i], B[j]); const v = l - lam * h; if (v > bv) { bv = v; pick = [i, j]; } }
    st = applyMove(st, A, B, pick[0], pick[1], round);
  }
  return st;
}

function plannerRound(A, B, E, round) {
  let bestEnd = null;
  for (const lam of [0.5, 1.5, 3, 6]) {
    let states = [fresh(E)];
    while (states.length) {
      const next = [];
      for (const st of states) for (const [i, j] of openMoves(st)) {
        const ns = applyMove(st, A, B, i, j, round);
        if (ns.outcome === 'win') { if (!bestEnd || ns.e > bestEnd.e) bestEnd = ns; }
        else if (!ns.outcome) next.push(ns);
      }
      next.sort((x, y) => (y.s - lam * (E - y.e)) - (x.s - lam * (E - x.e)));
      states = next.slice(0, 30);
    }
  }
  return bestEnd || greedyRound(A, B, E, round, 0);
}

const players = {
  planner: plannerRound,
  average: (A, B, E, r) => { const x = greedyRound(A, B, E, r, 1.5); return x.outcome === 'win' ? x : greedyRound(A, B, E, r, 0); },
};
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(0.5 * (s.length - 1))]; };

for (const [name, play] of Object.entries(players)) {
  let wins = 0;
  const deaths = Array(RUN_ROUNDS + 1).fill(0);
  const gross = Array.from({ length: RUN_ROUNDS + 1 }, () => []), net = Array.from({ length: RUN_ROUNDS + 1 }, () => []);
  const totals = { early: { rounds: 0, ...zero() }, late: { rounds: 0, ...zero() } };
  let energyAtDeath = [];
  for (let n = 0; n < N; n++) {
    let E = RUN_MAX_ENERGY, dead = 0;
    for (let r = 1; r <= RUN_ROUNDS; r++) {
      const x = play(generatePool().map((c) => c.value), generatePool().map((c) => c.value), E, r);
      if (x.outcome !== 'win') { dead = r; energyAtDeath.push(E); break; }
      gross[r].push(x.f.gross); net[r].push(E - x.e);
      const bucket = totals[r <= 5 ? 'early' : 'late'];
      bucket.rounds++;
      for (const k of Object.keys(x.f)) bucket[k] += x.f[k];
      E = x.e;
    }
    if (dead) deaths[dead]++; else wins++;
  }
  console.log(`== ${VARIANT} / ${name}: win ${(wins / N * 100).toFixed(1)}% | deaths% by round ${deaths.slice(1).map((d) => (d / N * 100).toFixed(0)).join('/')} | median energy entering the fatal round ${energyAtDeath.length ? median(energyAtDeath) : '-'}`);
  for (const [label, b] of Object.entries(totals)) {
    const per = (k) => (b[k] / b.rounds).toFixed(1);
    console.log(`   ${label} rounds (${b.rounds} cleared), per round: spent ${per('gross')} | bonus got ${per('bonusGot')} (lost to cap ${per('bonusLost')}; from finish-only plays got ${per('finishBonusGot')}, lost ${per('finishBonusLost')}) | refund got ${per('refundGot')} (lost to cap ${per('refundLost')}) | best plays ${per('bestPlays')}`);
  }
  if (name === 'planner') {
    console.log(`   median gross by round: [${gross.slice(1).map(median).join(', ')}]`);
    console.log(`   median net by round:   [${net.slice(1).map(median).join(', ')}]`);
  }
}
