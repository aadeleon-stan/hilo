// Validates the round-2 harness changes to upgrade-sim.mjs before trusting any
// results built on them: weighted draws, per-pool guarantees, and targetScale.
// Run with: node harness-selftest.mjs
import {
  baseConfig, startConfig, drawPool, ALL_VALUES, roundTarget, powerTargets, geometricTargets,
  getRunTarget, simulateRun, players, calibrate, RUN_ROUNDS, greedyRound, plannerRound, roundMoney,
} from './upgrade-sim.mjs';
import { OFFERS, P3_OFFERS, byId, offer, policies, draftHook } from './draft-pool-3.mjs';

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. Weighted draws: isolate pickWeighted from without-replacement effects with
// poolSize 1, half the domain at weight 1 and half at weight 3 (expect ~75% high).
{
  const N = 100000;
  const weights = ALL_VALUES.map((v) => (v < 55 ? 1 : 3));
  const cfg = { ...baseConfig(), poolSize: 1, weightsA: weights };
  let highCount = 0;
  for (let i = 0; i < N; i++) {
    const [v] = drawPool(cfg, 'A', cfg.domainA);
    if (v >= 55) highCount++;
  }
  const observed = highCount / N;
  const expected = 0.75; // 45 values at weight 1 (10-54), 45 at weight 3 (55-99): 135/180
  const se = Math.sqrt(expected * (1 - expected) / N);
  check('weighted draw frequency matches weights', Math.abs(observed - expected) < 5 * se,
    `observed ${(observed * 100).toFixed(2)}%, expected ${(expected * 100).toFixed(2)}% ±${(5 * se * 100).toFixed(2)}`);
}

// 2. Function-form weights work the same as array-form.
{
  const N = 20000;
  const fn = (v) => (v < 20 ? 5 : 1);
  const cfg = { ...baseConfig(), poolSize: 1, weightsA: fn };
  let tensCount = 0;
  for (let i = 0; i < N; i++) {
    const [v] = drawPool(cfg, 'A', cfg.domainA);
    if (v < 20) tensCount++;
  }
  const observed = tensCount / N;
  const expected = (10 * 5) / (10 * 5 + 80 * 1); // 50/130
  const se = Math.sqrt(expected * (1 - expected) / N);
  check('function-form weights match array-form behavior', Math.abs(observed - expected) < 5 * se,
    `observed ${(observed * 100).toFixed(2)}%, expected ${(expected * 100).toFixed(2)}% ±${(5 * se * 100).toFixed(2)}`);
}

// 3. Per-pool guarantees are always met, including multiple ranges and repeats interaction.
{
  const cfg = {
    ...baseConfig(),
    guaranteesA: [{ min: 10, max: 19, count: 2 }, { min: 90, max: 99, count: 1 }],
  };
  let ok = true;
  for (let i = 0; i < 2000; i++) {
    const pool = drawPool(cfg, 'A', cfg.domainA);
    const tens = pool.filter((v) => v >= 10 && v <= 19).length;
    const nineties = pool.filter((v) => v >= 90 && v <= 99).length;
    const unique = new Set(pool).size === pool.length;
    if (tens < 2 || nineties < 1 || !unique || pool.length !== cfg.poolSize) { ok = false; break; }
  }
  check('multi-range guarantees always satisfied', ok);
}

// 4. guaranteeTens shorthand still behaves like the round-1 boolean.
{
  const cfg = { ...baseConfig(), guaranteeTens: true };
  let ok = true;
  for (let i = 0; i < 1000; i++) {
    const pool = drawPool(cfg, 'A', cfg.domainA);
    if (!pool.some((v) => v >= 10 && v <= 19)) { ok = false; break; }
  }
  check('guaranteeTens shorthand still guarantees a 10-19 value', ok);
}

// 5. Guarantees that ask for more than poolSize throw, rather than silently failing.
{
  const cfg = { ...baseConfig(), poolSize: 9, guaranteesA: [{ min: 10, max: 19, count: 10 }] };
  let threw = false;
  try { drawPool(cfg, 'A', cfg.domainA); } catch { threw = true; }
  check('over-budget guarantee total throws', threw);
}

// 6. A guarantee the (narrowed) domain can't supply throws, for that reason.
{
  const cfg = { ...baseConfig(), ...startConfig([20, 59]), guaranteesA: [{ min: 10, max: 19, count: 1 }] };
  let msg = '';
  try { drawPool(cfg, 'A', cfg.domainA); } catch (e) { msg = e.message; }
  check('guarantee the narrowed domain cannot supply throws', msg.includes('domain has only 0'), msg || 'did not throw');
}

// 7. startConfig narrows both domains to the given inclusive range.
{
  const cfg = startConfig([40, 79]);
  check('startConfig narrows domainA/B to the range', cfg.domainA.length === 40 && cfg.domainA[0] === 40 &&
    cfg.domainA[cfg.domainA.length - 1] === 79 && cfg.domainB.length === 40);
}

// 8. Target schedules: the shipped formula as an array or a function matches
// the default, and targetExtra / targetScale still apply on top.
{
  const shipped = Array.from({ length: RUN_ROUNDS }, (_, i) => getRunTarget(i + 1));
  const rounds = Array.from({ length: RUN_ROUNDS }, (_, i) => i + 1);
  const def = baseConfig();
  const asArray = { ...baseConfig(), targets: shipped };
  const asFn = { ...baseConfig(), targets: (r) => getRunTarget(r) };
  check('target schedule array and function match the shipped default',
    rounds.every((r) => roundTarget(asArray, r) === roundTarget(def, r) && roundTarget(asFn, r) === roundTarget(def, r)));
  const composed = { ...baseConfig(), targets: () => 100, targetExtra: 20, targetScale: 0.5 };
  check('targetExtra and targetScale compose with a schedule', roundTarget(composed, 3) === 60);
  check('powerTargets and geometricTargets follow their formulas',
    powerTargets(135, 10, 2)[3] === 225 && Math.abs(geometricTargets(100, 1.1)[2] - 121) < 1e-9);
}

// 9. Round 3 offer pool on the 40-79 start: guaranteed 10s needs the 10s,
// and an unlock stops being offered once taken.
{
  const start = { ...baseConfig(), ...startConfig([40, 79]) };
  const unlocked = byId['unlock-10s'].apply(start);
  check('guarantee-10s is offered only after the 10s are unlocked',
    !byId['guarantee-10s'].eligible(start) && byId['guarantee-10s'].eligible(unlocked));
  check('an unlock is not offered again once taken', !byId['unlock-10s'].eligible(unlocked));
  check('every offer id is unique', new Set(OFFERS.map((o) => o.id)).size === OFFERS.length);
}

// 10. Stress: 3,000 random pick sequences through all 9 picks never leave a
// pool undrawable, and every draw has poolSize distinct values.
{
  let problem = '';
  for (let run = 0; run < 3000 && !problem; run++) {
    let c = { ...baseConfig(), ...startConfig([40, 79]) };
    for (let pick = 0; pick < 9 && !problem; pick++) {
      const offers = offer(c);
      if (offers.length) c = offers[Math.floor(Math.random() * offers.length)].apply(c);
      try {
        for (const which of ['A', 'B']) {
          const pool = drawPool(c, which, which === 'A' ? c.domainA : c.domainB);
          if (pool.length !== c.poolSize || new Set(pool).size !== pool.length || pool.some((v) => typeof v !== 'number')) {
            problem = `bad pool ${JSON.stringify(pool)} at poolSize ${c.poolSize}`;
          }
        }
      } catch (e) { problem = e.message; }
    }
  }
  check('random pick sequences on 40-79 always leave drawable pools', !problem, problem);
}

// 11. Draft records: a full run with random drafting logs one offer per
// round won (up to 9), each pick taken from its own offer.
{
  let ok = true;
  for (let i = 0; i < 40 && ok; i++) {
    const res = simulateRun(players.average, { ...baseConfig(), ...startConfig([40, 79]), targetScale: 0.3 }, { onRoundWin: draftHook(policies.random()) });
    const expected = Math.min(res.rounds.length, RUN_ROUNDS - 1);
    ok = res.draft.length === expected
      && res.draft.every((d, k) => d.round === k + 1 && (d.picked === null || d.offered.includes(d.picked)));
  }
  check('runs record one draft entry per round won, picks drawn from their offers', ok);
}

// 12. calibrate finds a known crossing on a monotone function.
{
  const fake = (knob) => ({ winPct: Math.max(0, 100 - knob), stderr: 0 });
  const r = calibrate(fake, { lo: 0, hi: 20, target: 50, tol: 0.5 });
  check('calibrate brackets and bisects to the target', Math.abs(r.result.winPct - 50) < 0.5 && r.reachable, `knob ${r.knob}`);
}

// 13. Money: roundMoney adds its rates, moneyWeight 0 leaves both players'
// choices unchanged even with rates set, and money-aware players chase money.
// The planner overshoots more. The greedy player sees one move ahead, so it
// can't wait for a bigger overshoot; it finishes sooner, leaving more turns.
{
  const cfg = { ...baseConfig(), moneyPerRound: 5, moneyPerTurnLeft: 2, moneyPerOvershoot: 0.5, moneyPerOptimal: 3 };
  const st = { s: roundTarget(cfg, 1) + 10, t: 4, f: { bestPlays: 2 } };
  check('roundMoney adds its rates', roundMoney(cfg, st, 1) === 5 + 2 * 5 + 0.5 * 10 + 3 * 2);

  let same = true;
  const plain = baseConfig();
  for (let i = 0; i < 40 && same; i++) {
    const A = drawPool(plain, 'A', plain.domainA), B = drawPool(plain, 'B', plain.domainB);
    const pairs = [
      [greedyRound(plain, A, B, 200, 3, 1.5), greedyRound(cfg, A, B, 200, 3, 1.5)],
      [plannerRound(plain, A, B, 200, 3), plannerRound(cfg, A, B, 200, 3)],
    ];
    same = pairs.every(([x, y]) => x.e === y.e && x.s === y.s && x.t === y.t && x.outcome === y.outcome);
  }
  check('moneyWeight 0 leaves greedy and planner choices unchanged', same);

  const boards = Array.from({ length: 400 }, () => [drawPool(plain, 'A', plain.domainA), drawPool(plain, 'B', plain.domainB)]);
  const onWins = (play, rates, weight, count) => {
    const c = { ...baseConfig(), ...rates, moneyWeight: weight };
    let overshoot = 0, turnsLeft = 0, wins = 0;
    for (const [A, B] of boards.slice(0, count)) {
      const x = play(c, A, B);
      if (x.outcome !== 'win') continue;
      overshoot += x.s - roundTarget(c, 3);
      turnsLeft += c.poolSize - x.t;
      wins++;
    }
    return { overshoot: overshoot / wins, turnsLeft: turnsLeft / wins };
  };
  const planner = (c, A, B) => plannerRound(c, A, B, 200, 3);
  const greedy = (c, A, B) => greedyRound(c, A, B, 200, 3, 1.5);
  const p0 = onWins(planner, { moneyPerOvershoot: 1 }, 0, 80), p3 = onWins(planner, { moneyPerOvershoot: 1 }, 3, 80);
  check('a money-aware planner overshoots more', p3.overshoot > p0.overshoot, `mean overshoot ${p0.overshoot.toFixed(1)} -> ${p3.overshoot.toFixed(1)} on the same boards`);
  const g0 = onWins(greedy, { moneyPerTurnLeft: 5 }, 0, 400), g3 = onWins(greedy, { moneyPerTurnLeft: 5 }, 3, 400);
  check('a money-aware greedy player finishes with more turns left', g3.turnsLeft > g0.turnsLeft, `turns left ${g0.turnsLeft.toFixed(2)} -> ${g3.turnsLeft.toFixed(2)} on the same boards`);
}

// 14. The full P3 pool keeps pools drawable too (digit pairs, guarantees and
// odds together), and offers are drawn by weight.
{
  let problem = '';
  for (let run = 0; run < 3000 && !problem; run++) {
    let c = { ...baseConfig(), ...startConfig([40, 79]) };
    for (let pick = 0; pick < 9 && !problem; pick++) {
      const offers = offer(c, 3, P3_OFFERS);
      if (offers.length) c = offers[Math.floor(Math.random() * offers.length)].apply(c);
      try {
        for (const which of ['A', 'B']) {
          const pool = drawPool(c, which, which === 'A' ? c.domainA : c.domainB);
          if (pool.length !== c.poolSize || new Set(pool).size !== pool.length || pool.some((v) => typeof v !== 'number')) {
            problem = `bad pool ${JSON.stringify(pool)} at poolSize ${c.poolSize}`;
          }
        }
      } catch (e) { problem = e.message; }
    }
  }
  check('random pick sequences from the P3 pool always leave drawable pools', !problem, problem);

  const start = { ...baseConfig(), ...startConfig([40, 79]) };
  const eligible = P3_OFFERS.filter((o) => o.eligible(start));
  const total = eligible.reduce((t, o) => t + (o.weight ?? 1), 0);
  const isPair = (o) => o.id.startsWith('remove-digits-');
  const expected = eligible.filter(isPair).reduce((t, o) => t + o.weight, 0) / total;
  const N = 20000;
  let hits = 0;
  for (let i = 0; i < N; i++) if (isPair(offer(start, 1, P3_OFFERS)[0])) hits++;
  const se = Math.sqrt(expected * (1 - expected) / N);
  check('offers are drawn by weight (pair family share of first offers)', Math.abs(hits / N - expected) < 5 * se,
    `${((hits / N) * 100).toFixed(2)}% vs ${(expected * 100).toFixed(2)}% expected`);
  check('P2 pool is unchanged by the P3 additions', OFFERS.length === 15 && OFFERS.every((o) => !o.weight));
}

// 15. Locked decades (ascension modifiers) are never removed by "remove the highest decade".
{
  const c = { ...baseConfig(), ...startConfig([40, 99]), lockedDecades: [80, 90] };
  const next = byId['remove-high-decade'].apply(c);
  const has = (lo) => next.domainA.some((v) => v >= lo && v < lo + 10);
  check('remove-high-decade skips locked decades', has(90) && has(80) && !has(70));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
