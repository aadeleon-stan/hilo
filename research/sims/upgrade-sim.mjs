// Upgrade research harness for HiLo Run mode.
// Mirrors useGameStore.confirmSelection (best plays judged before the move,
// cost applied, round-end check, then bonus and refund capped at max energy),
// with the pool generator, energy rules and round-end rules made configurable.
import {
  computeProduct,
  getBestPlays,
  getBestPlayBonus,
  getRunTarget,
  checkRoundEnd,
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
  RUN_TURN_REFUND,
} from '../../src/store/gameLogic.js';

export { RUN_ROUNDS, getRunTarget };
export const ALL_VALUES = Array.from({ length: 90 }, (_, i) => i + 10);

export function baseConfig() {
  return {
    domainA: ALL_VALUES,
    domainB: ALL_VALUES,
    poolSize: 9,
    targetExtra: 0, // added to every round target (harder difficulty for planner tests)
    targets: null, // round targets: array of RUN_ROUNDS values or (round) => target; default is the shipped formula
    targetScale: 1, // (target + targetExtra) * targetScale — for constrained-start retunes
    allowRepeats: false,
    guaranteeTens: false, // shorthand for guaranteesA/B += {min:10, max:19, count:1} in both pools
    guaranteesA: [], // list of { min, max, count }: pool A always has at least `count` values in [min, max]
    guaranteesB: [],
    weightsA: null, // (value) => relative weight, or a 90-entry array indexed by value-10; default uniform
    weightsB: null,
    maxEnergy: RUN_MAX_ENERGY,
    refundPerTurn: RUN_TURN_REFUND,
    refundMultiplier: 1, // e.g. 1.4 for a "+40% round-end refund" relic
    bonusCap: 6, // Optimal bonus cap (getBestPlayBonus caps at 6)
    rerollsPerRound: 0, // before a round: reroll the largest number on the board
    keepSmallest: false, // carry each pool's smallest number into the next round
    energyMod: null, // (a, b, highWord) => highWord
    pointsMod: null, // (a, b, lowWord) => lowWord
    moneyPerRound: 0, // money rates, summed for each round won by roundMoney
    moneyPerTurnLeft: 0,
    moneyPerOvershoot: 0,
    moneyPerOptimal: 0,
    moneyWeight: 0, // how much energy one unit of money is worth to the player (0 = ignores money)
  };
}

// A starting-range preset, e.g. startConfig([40, 79]) for a constrained-start upgrade.
// Spread over baseConfig(): { ...baseConfig(), ...startConfig([40, 79]) }.
export function startConfig([lo, hi]) {
  const domain = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return { domainA: domain, domainB: domain };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function weightOf(cfg, which) {
  const w = which === 'A' ? cfg.weightsA : cfg.weightsB;
  if (!w) return () => 1;
  return typeof w === 'function' ? w : (v) => w[v - 10] ?? 0;
}

// Weighted pick without replacement: proportional to weight among `candidates`.
function pickWeighted(candidates, wf) {
  if (candidates.length === 1) return candidates[0];
  const weights = candidates.map(wf);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(candidates);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function effectiveGuarantees(cfg, which) {
  const explicit = (which === 'A' ? cfg.guaranteesA : cfg.guaranteesB) || [];
  return cfg.guaranteeTens ? [...explicit, { min: 10, max: 19, count: 1 }] : explicit;
}

function assertGuaranteesFit(cfg, which, domain, guarantees) {
  const total = guarantees.reduce((a, g) => a + g.count, 0);
  if (total > cfg.poolSize) throw new Error(`pool ${which}: guarantees ask for ${total} values but poolSize is ${cfg.poolSize}`);
  for (const g of guarantees) {
    const avail = domain.filter((v) => v >= g.min && v <= g.max).length;
    if (avail < g.count) throw new Error(`pool ${which}: guarantee needs ${g.count} values in [${g.min},${g.max}] but domain has only ${avail}`);
  }
}

export function drawPool(cfg, which, domain, kept) {
  const guarantees = effectiveGuarantees(cfg, which);
  if (guarantees.length) assertGuaranteesFit(cfg, which, domain, guarantees);
  const wf = weightOf(cfg, which);
  const values = [];
  if (kept !== undefined) values.push(kept);
  for (const g of guarantees) {
    let have = values.filter((v) => v >= g.min && v <= g.max).length;
    while (have < g.count && values.length < cfg.poolSize) {
      const candidates = domain.filter((v) => v >= g.min && v <= g.max && (cfg.allowRepeats || !values.includes(v)));
      if (!candidates.length) break;
      values.push(pickWeighted(candidates, wf));
      have++;
    }
  }
  while (values.length < cfg.poolSize) {
    const candidates = cfg.allowRepeats ? domain : domain.filter((v) => !values.includes(v));
    values.push(pickWeighted(candidates, wf));
  }
  for (const v of values) {
    if (v !== kept && !domain.includes(v)) throw new Error(`drew ${v} outside the pool's allowed values`);
  }
  return values;
}

// One reroll replaces the single largest number on the board with a fresh draw.
function applyRerolls(cfg, A, B) {
  for (let r = 0; r < cfg.rerollsPerRound; r++) {
    const maxA = Math.max(...A), maxB = Math.max(...B);
    const [pool, domain] = maxA >= maxB ? [A, cfg.domainA] : [B, cfg.domainB];
    const idx = pool.indexOf(Math.max(...pool));
    const candidates = cfg.allowRepeats ? domain : domain.filter((v) => !pool.includes(v));
    if (!candidates.length) continue;
    pool[idx] = pickWeighted(candidates, weightOf(cfg, pool === A ? 'A' : 'B'));
  }
}

const poolsFrom = (vals, mask) => vals.map((value, id) => ({ id, value, used: !!((mask >> id) & 1) }));

export function moveCost(cfg, a, b) {
  const p = computeProduct(a, b);
  const h = cfg.energyMod ? cfg.energyMod(a, b, p.highWord) : p.highWord;
  const l = cfg.pointsMod ? cfg.pointsMod(a, b, p.lowWord) : p.lowWord;
  return { h, l, product: p.product };
}

const zeroStats = () => ({ gross: 0, bonus: 0, bonusLost: 0, refund: 0, refundLost: 0, bestPlays: 0 });

export function roundTarget(cfg, round) {
  const t = cfg.targets;
  const base = !t ? getRunTarget(round) : typeof t === 'function' ? t(round) : t[round - 1];
  return (base + cfg.targetExtra) * cfg.targetScale;
}

// Schedules for cfg.targets: T1 + c * (r - 1)^p, and T1 * g^(r - 1).
export const powerTargets = (T1, c, p) => Array.from({ length: RUN_ROUNDS }, (_, i) => T1 + c * i ** p);
export const geometricTargets = (T1, g) => Array.from({ length: RUN_ROUNDS }, (_, i) => T1 * g ** i);

// Money a round earns if it ends in state st (score s, turns used t, Optimal plays in f).
export function roundMoney(cfg, st, round) {
  return cfg.moneyPerRound
    + cfg.moneyPerTurnLeft * (cfg.poolSize - st.t)
    + cfg.moneyPerOvershoot * Math.max(0, st.s - roundTarget(cfg, round))
    + cfg.moneyPerOptimal * st.f.bestPlays;
}

export function applyMove(cfg, st, A, B, i, j, round) {
  const target = roundTarget(cfg, round);
  // Best plays use the shipped rule on raw products.
  const wasBest = getBestPlays(poolsFrom(A, st.ua), poolsFrom(B, st.ub), st.s, target, st.e, RUN_ROUNDS - round + 1).has(`${i}:${j}`);
  const { h, l } = moveCost(cfg, A[i], B[j]);
  const ua = st.ua | (1 << i), ub = st.ub | (1 << j);
  const s = st.s + l;
  let e = st.e - h;
  const outcome = checkRoundEnd(s, target, e, poolsFrom(A, ua), poolsFrom(B, ub));
  const f = { ...st.f, gross: st.f.gross + h };
  if (wasBest && outcome !== 'loss') {
    const raw = Math.min(cfg.bonusCap, Math.ceil(h / 2));
    const got = Math.max(0, Math.min(raw, cfg.maxEnergy - e));
    e += got; f.bonus += got; f.bonusLost += raw - got; f.bestPlays++;
  }
  if (outcome === 'win') {
    const raw = Math.round((cfg.poolSize - st.t - 1) * cfg.refundPerTurn * cfg.refundMultiplier);
    const got = Math.max(0, Math.min(raw, cfg.maxEnergy - e));
    e += got; f.refund += got; f.refundLost += raw - got;
  }
  return { ua, ub, s, e, t: st.t + 1, outcome, f };
}

const fresh = (E) => ({ ua: 0, ub: 0, s: 0, e: E, t: 0, outcome: null, f: zeroStats() });

function openMoves(cfg, st) {
  const moves = [];
  for (let i = 0; i < cfg.poolSize; i++) if (!((st.ua >> i) & 1))
    for (let j = 0; j < cfg.poolSize; j++) if (!((st.ub >> j) & 1)) moves.push([i, j]);
  return moves;
}

export function greedyRound(cfg, A, B, E, round, lam) {
  const target = roundTarget(cfg, round);
  let st = fresh(E);
  while (!st.outcome) {
    let best = null, bv = -Infinity;
    for (const [i, j] of openMoves(cfg, st)) {
      const { h, l } = moveCost(cfg, A[i], B[j]);
      let v = l - lam * h;
      // Money only comes from finishing: the overshoot and the turns left over.
      if (cfg.moneyWeight && st.s + l >= target) {
        v += lam * cfg.moneyWeight * (cfg.moneyPerOvershoot * (st.s + l - target) + cfg.moneyPerTurnLeft * (cfg.poolSize - st.t - 1));
      }
      if (v > bv) { bv = v; best = [i, j]; }
    }
    st = applyMove(cfg, st, A, B, best[0], best[1], round);
  }
  return st;
}

export function plannerRound(cfg, A, B, E, round) {
  const worth = cfg.moneyWeight ? (st) => st.e + cfg.moneyWeight * roundMoney(cfg, st, round) : (st) => st.e;
  let bestEnd = null;
  for (const lam of [0.5, 1.5, 3, 6]) {
    let states = [fresh(E)];
    while (states.length) {
      const next = [];
      for (const st of states) for (const [i, j] of openMoves(cfg, st)) {
        const ns = applyMove(cfg, st, A, B, i, j, round);
        if (ns.outcome === 'win') { if (!bestEnd || worth(ns) > worth(bestEnd)) bestEnd = ns; }
        else if (!ns.outcome) next.push(ns);
      }
      next.sort((x, y) => (y.s - lam * (E - y.e)) - (x.s - lam * (E - x.e)));
      states = next.slice(0, 30);
    }
  }
  return bestEnd || greedyRound(cfg, A, B, E, round, 0);
}

export const players = {
  average: (cfg, A, B, E, r) => {
    const x = greedyRound(cfg, A, B, E, r, 1.5);
    return x.outcome === 'win' ? x : greedyRound(cfg, A, B, E, r, 0);
  },
  planner: plannerRound,
};

// Simulates one run. onRoundWin(cfg, round, energy, draft) may return a new
// config (an upgrade) and may push a record of its offer onto draft, which the
// run returns; raising maxEnergy also adds the difference to current energy.
export function simulateRun(player, startCfg, { onRoundWin } = {}) {
  let cfg = startCfg;
  let E = cfg.maxEnergy;
  let keptA, keptB;
  const rounds = [];
  const draft = [];
  for (let r = 1; r <= RUN_ROUNDS; r++) {
    const A = drawPool(cfg, 'A', cfg.domainA, keptA);
    const B = drawPool(cfg, 'B', cfg.domainB, keptB);
    applyRerolls(cfg, A, B);
    const x = player(cfg, A, B, E, r);
    if (x.outcome !== 'win') return { won: false, deathRound: r, energyAtDeath: E, rounds, cfg, draft };
    rounds.push({ round: r, startEnergy: E, endEnergy: x.e, turnsLeft: cfg.poolSize - x.t, overshoot: x.s - roundTarget(cfg, r), money: roundMoney(cfg, x, r), ...x.f });
    E = x.e;
    if (cfg.keepSmallest) { keptA = Math.min(...A); keptB = Math.min(...B); }
    if (onRoundWin && r < RUN_ROUNDS) {
      const next = onRoundWin(cfg, r, E, draft);
      if (next !== cfg) {
        if (next.maxEnergy > cfg.maxEnergy) E += next.maxEnergy - cfg.maxEnergy;
        cfg = next;
      }
    }
  }
  return { won: true, rounds, cfg, draft };
}

const quantile = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(p * (s.length - 1))];
};
const median = (arr) => quantile(arr, 0.5);

export function summarize(results) {
  const n = results.length;
  const wins = results.filter((r) => r.won).length;
  const deaths = Array(RUN_ROUNDS + 1).fill(0);
  results.forEach((r) => { if (!r.won) deaths[r.deathRound]++; });
  const byRound = Array.from({ length: RUN_ROUNDS + 1 }, () => []);
  results.forEach((r) => r.rounds.forEach((rd) => byRound[rd.round].push(rd)));
  const mean = (arr, k) => (arr.length ? arr.reduce((t, x) => t + x[k], 0) / arr.length : 0);
  const cleared = results.flatMap((r) => r.rounds);
  const roundsCleared = results.map((r) => r.rounds.length);
  const meanCleared = roundsCleared.reduce((t, x) => t + x, 0) / n;
  const clearedVar = roundsCleared.reduce((t, x) => t + (x - meanCleared) ** 2, 0) / Math.max(1, n - 1);
  // A winning run's tightest round: the least energy it had left at any round end.
  const tightest = results.filter((r) => r.won).map((r) => Math.min(...r.rounds.map((rd) => rd.endEnergy)));
  return {
    n,
    meanRoundsCleared: meanCleared,
    moneyPerRun: results.reduce((t, r) => t + r.rounds.reduce((u, rd) => u + rd.money, 0), 0) / n,
    roundsClearedSE: Math.sqrt(clearedVar / n),
    tightestRound: { median: median(tightest), p10: quantile(tightest, 0.1) },
    winPct: (wins / n) * 100,
    stderr: Math.sqrt((wins / n) * (1 - wins / n) / n) * 100,
    deathsPct: deaths.slice(1).map((d) => (d / n) * 100),
    medianEnergyAtDeath: median(results.filter((r) => !r.won).map((r) => r.energyAtDeath)),
    medianGross: byRound.slice(1).map((rs) => median(rs.map((x) => x.gross))),
    medianNet: byRound.slice(1).map((rs) => median(rs.map((x) => x.startEnergy - x.endEnergy))),
    perRound: {
      gross: mean(cleared, 'gross'),
      bonus: mean(cleared, 'bonus'),
      refund: mean(cleared, 'refund'),
      refundLost: mean(cleared, 'refundLost'),
      turnsLeft: mean(cleared, 'turnsLeft'),
      overshoot: mean(cleared, 'overshoot'),
      money: mean(cleared, 'money'),
    },
  };
}

export function runManyRaw(playerName, cfgFactory, n, options) {
  const results = [];
  for (let k = 0; k < n; k++) results.push(simulateRun(players[playerName], cfgFactory(), options));
  return results;
}

export function runMany(playerName, cfgFactory, n, options) {
  return summarize(runManyRaw(playerName, cfgFactory, n, options));
}

// Searches for the knob where evalAt(knob).winPct is closest to `target`,
// assuming win rate falls as the knob rises. Doubles `hi` until it brackets
// the target, then bisects. `reachable` is false if even `lo` is below target.
export function calibrate(evalAt, { lo, hi, target, tol = 2, iters = 8 }) {
  const trace = [];
  const at = (knob) => {
    const result = evalAt(knob);
    trace.push({ knob, winPct: result.winPct, stderr: result.stderr });
    return result;
  };
  const rLo = at(lo);
  let rHi = at(hi);
  while (rHi.winPct > target && hi < 1e6) { hi = hi * 2 || 1; rHi = at(hi); }
  let best = Math.abs(rLo.winPct - target) <= Math.abs(rHi.winPct - target) ? { knob: lo, result: rLo } : { knob: hi, result: rHi };
  let a = lo, b = hi;
  for (let i = 0; i < iters && Math.abs(best.result.winPct - target) >= tol; i++) {
    const mid = (a + b) / 2;
    const r = at(mid);
    if (Math.abs(r.winPct - target) < Math.abs(best.result.winPct - target)) best = { knob: mid, result: r };
    if (r.winPct > target) a = mid; else b = mid;
  }
  return { ...best, trace, reachable: rLo.winPct >= target };
}

// This process's share of `n` total runs, from SHARD (0-based) / SHARDS env vars.
// Unset or SHARDS=1 gives the whole n back, so scripts work unchanged single-process.
export function myShare(n) {
  const shards = Number(process.env.SHARDS) || 1;
  const shard = Number(process.env.SHARD) || 0;
  if (shard < 0 || shard >= shards) throw new Error(`SHARD=${shard} out of range for SHARDS=${shards}`);
  const base = Math.floor(n / shards), rem = n % shards;
  return base + (shard < rem ? 1 : 0);
}

// Drop-in for runMany that, under a parallel.mjs launch (SHARDS>1), runs only
// this shard's share and sends the raw results to the parent over IPC instead
// of returning a summary. Scripts should skip their normal printing when this
// returns null — the launcher merges and prints instead. Single-process
// (no SHARDS set) behaves exactly like runMany.
export function runShardAware(playerName, cfgFactory, n, options) {
  if ((Number(process.env.SHARDS) || 1) <= 1) return runMany(playerName, cfgFactory, n, options);
  const results = runManyRaw(playerName, cfgFactory, myShare(n), options);
  if (process.send) process.send(results);
  return null;
}
