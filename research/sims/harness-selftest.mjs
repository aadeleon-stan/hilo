// Validates the round-2 harness changes to upgrade-sim.mjs before trusting any
// results built on them: weighted draws, per-pool guarantees, and targetScale.
// Run with: node harness-selftest.mjs
import { baseConfig, startConfig, drawPool, ALL_VALUES } from './upgrade-sim.mjs';

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

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
