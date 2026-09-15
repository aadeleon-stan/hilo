# Roguelike Upgrades Research, Round 2

Continues `upgrades-research.md` for the three directions added to `upgrades.txt` on 2026-09-14: ones-digit pair upgrades, odds-shifting upgrades, and a constrained start with decade unlocks. Plan and step numbering (S1/S2/S3) are in `research/sim-plan-2.md`; read that first for what each step is for and the expectations being checked. **Nothing here is implemented** — this is still research only.

## 0. Harness changes

Before any of this, `research/sims/upgrade-sim.mjs` needed: weighted draws (`weightsA`/`weightsB`), per-pool range guarantees (`guaranteesA`/`guaranteesB`), a `targetScale` multiplier, `startConfig(range)` presets, and multi-core sharding (`runShardAware` + `research/sims/parallel.mjs`). Done and validated: `research/sims/harness-selftest.mjs` passes (weighted-draw frequencies, guarantee enforcement, `startConfig`), and `baseline.mjs` still reproduces the original win rates (average 66.0% ±2.7 / planner 99.0% ±0.6 on 300 runs, both within noise of the round-1 numbers).

Fixes from reviewing that commit: rerolls now draw using the pool's weights (they had ignored them), `parallel.mjs` merges every `runShardAware` call a script makes instead of silently keeping only the last one, and a self-test that passed for the wrong reason now checks for the error it means to test.

## S1. Ones-digit pair upgrades

### S1a. Single-round cost screen

`research/sims/s1a-pair-screen.mjs`. Same method as round 1's pool-restriction screen: one-move-at-a-time skilled player (best of several cost weights), target 300, 9 turns. 20,000 boards per variant — 145 variants (45 unordered pairs removed from both pools, 100 ordered per-pool assignments including the same digit in both). Baseline (10-99, no removal): mean energy 41.9 ±0.13. Sampling error on energy-saved% is about ±0.4 per variant (1 SE); a variant needs to clear about ±0.8 to be more than noise, and about half of the 145 variants don't.

**Both-pools pairs (45), real effects only, strongest to weakest:**

| Pair | Energy saved | Mean energy |
|---|---|---|
| 5 & 8 | 4.8% | 39.9 |
| 6 & 8 | 4.8% | 39.9 |
| 7 & 8 | 4.5% | 40.0 |
| 8 & 9 | 4.3% | 40.1 |
| 5 & 9 | 4.2% | 40.1 |
| 5 & 7 | 3.8% | 40.3 |
| 6 & 9 | 3.8% | 40.3 |
| 7 & 9 | 3.4% | 40.5 |
| 5 & 6 | 3.3% | 40.5 |
| 6 & 7 | 3.3% | 40.5 |
| 4 & 8 | 2.1% | 41.0 |
| 4 & 9 | 2.0% | 41.1 |
| 4 & 7 | 1.5% | 41.3 |
| 0 & 8 | 1.5% | 41.3 |
| 4 & 6 | 1.4% | 41.3 |
| 0 & 9 | 1.3% | 41.3 |
| 2 & 8 | 1.2% | 41.4 |

...down through 15 pairs within noise (0.0% ± noise), to the weakest, which cost *more* energy than doing nothing:

| Pair | Energy saved |
|---|---|
| 1 & 2 | -5.2% |
| 1 & 3 | -5.1% |
| 0 & 1 | -4.7% |
| 2 & 3 | -4.4% |
| 0 & 2 | -3.8% |
| 1 & 4 | -3.3% |

Full table and heat map in the script's output (not committed — rerun `N=20000 node s1a-pair-screen.mjs` from `research/sims/`, ~36s single-threaded).

**Findings:**
- **The value comes from high digits, not from 5 and 7 specifically.** Round 1 found 5 and 7 the strongest single digits and measured removing both at +9 win-rate points. Here, all top 10 pairs use two digits from 5–9, and 5 & 7 (3.8%) sits mid-pack among them. The leaders (5 & 8, 6 & 8 at 4.8%) are only about 1 point ahead of 5 & 7, roughly 2 SE for a difference between two variants, so the order within the top 10 is unsettled. This is single-round energy, not win rate; S1b found it only partly carries through to full runs.
- **Pairs of low digits (0–4) cost more energy.** All 10 low-low pairs cost more energy than baseline, beyond noise; the worst three (1 & 2, 1 & 3, 0 & 1) cost 4.7–5.2% more. This echoes round 1's finding that removing the 10s costs energy. The likely reason, not measured here, is that numbers ending in 0–4 supply many of the cheap, useful moves.
- **Base rarities on S1b's win rates, not on this table.** By energy, 17 pairs help, 15 are within noise and 13 hurt, but full runs move several pairs a long way, most of all the pairs containing 0.
- **Ordered (per-pool) assignments follow the same pattern** as the both-pools case — high digit removed from either pool helps, low digit removed from either pool hurts — with rough symmetry between (dA, dB) and (dB, dA) in the heat map (e.g. A:8,B:9 saved 3.3%, A:9,B:8 saved 2.6%, both far from the low-digit cells). This is consistent with the plan's expectation that pool assignment shouldn't matter on its own; S1c should confirm this formally with matched-pair runs rather than reading it off two single cells.

### S1b. Full-run win rates

`research/sims/s1b-pair-winrate.mjs`. Each pair removed from both pools after round 1, average player. The plan called for 15 pairs at 300 runs; a first pass did that, but two of its median pairs moved far from their single-round ranking (3 & 9 at −10.8, 0 & 6 at +9.2). A re-check at 1,200 runs confirmed both (−8.7 ±1.7, +6.1 ±1.6). Because drafting (S1d) needs a value for every pair it offers, all 45 pairs were then run at 1,200 runs each against a 4,800-run baseline of 67.0% ±0.7. The error on each change is about ±1.5, so changes under about ±3.0 are noise. The table below uses the 1,200-run numbers.

| Helps (17) | Change | Within noise (11) | Change | Hurts (17) | Change |
|---|---|---|---|---|---|
| 5 & 8 | +11.7 | 4 & 7 | +2.4 | 2 & 7 | −3.2 |
| 5 & 6 | +10.0 | 2 & 8 | +1.4 | 0 & 1 | −3.3 |
| 0 & 9 | +9.7 | 1 & 5 | +1.4 | 3 & 8 | −3.8 |
| 4 & 8 | +9.3 | 4 & 6 | +0.9 | 1 & 7 | −4.3 |
| 5 & 7 | +8.5 | 8 & 9 | +0.6 | 3 & 7 | −4.5 |
| 0 & 5 | +8.3 | 4 & 9 | −0.2 | 1 & 6 | −4.7 |
| 0 & 8 | +8.1 | 7 & 9 | −0.3 | 2 & 9 | −4.8 |
| 6 & 8 | +8.0 | 0 & 2 | −0.7 | 2 & 4 | −4.8 |
| 7 & 8 | +7.4 | 2 & 5 | −1.2 | 2 & 6 | −4.9 |
| 0 & 7 | +6.3 | 1 & 8 | −2.5 | 3 & 6 | −5.6 |
| 5 & 9 | +5.7 | 0 & 3 | −2.7 | 1 & 9 | −7.3 |
| 3 & 5 | +5.5 | | | 3 & 9 | −8.0 |
| 0 & 6 | +5.5 | | | 3 & 4 | −8.7 |
| 4 & 5 | +4.3 | | | 2 & 3 | −12.7 |
| 6 & 7 | +3.9 | | | 1 & 4 | −12.8 |
| 0 & 4 | +3.5 | | | 1 & 2 | −15.5 |
| 6 & 9 | +3.2 | | | 1 & 3 | −17.5 |

Borderline (within 0.5 of the noise line): 6 & 9, 0 & 4, 2 & 7 and 0 & 1.

Average change of the 9 pairs containing each digit: 0 **+3.9**, 1 −7.3, 2 −5.1, 3 −6.4, 4 −0.6, 5 **+6.1**, 6 +1.9, 7 +1.8, 8 **+4.5**, 9 −0.1.

**Findings:**
- **The single-round screen is a rough guide, not a substitute.** Rank correlation between S1a's energy saved and full-run win rate is 0.73 across all 45 pairs, and 0.86 without the pairs containing 0.
- **Digit 0 is the big miss.** Pairs with 0 looked neutral or slightly costly on energy but are among the best in full runs (0 & 9 +9.7, 0 & 5 +8.3, 0 & 8 +8.1). The reason isn't measured here. A likely suspect is what the screen leaves out: the Optimal bonus, refunds and energy carrying across rounds.
- **8 & 9 contradicts S1a:** fourth-best on energy, but +0.6 ±1.5 in full runs. Its 300-run value (+6.8) was noise. 9 is the most mixed digit: 0 & 9 is +9.7 while 3 & 9 is −8.0.
- **5, 8 and 0 are the digits to remove; 1, 2 and 3 are the ones to keep.** Round 1's 5 & 7 (+9) is confirmed at +8.5 but isn't the best: 5 & 8 (+11.7) is.
- **Proposed split:** the 8 pairs at +8 or more as rare, the 9 pairs from +3 to +8 as common or uncommon, and don't offer the other 28 as upgrades (the 17 harmful ones would only work as trade-offs). The family's range, from −17.5 to +11.7, means a drafting player who knows which pairs are good gains a lot. S1d measures whether that adds skill.

### S1c. Does it matter which pool loses which digit?

`research/sims/s1c-pair-symmetry.mjs`. Removes digit x from pool A and y from pool B after round 1, against the swap. Average player, 600 runs per assignment, baseline 64.9% ±1.4 (1,200 runs).

| Pair | x in A, y in B | y in A, x in B | Difference |
|---|---|---|---|
| 8 & 9 | 70.2% ±1.9 (+5.3) | 70.8% ±1.9 (+5.9) | −0.7 ±2.6, noise |
| 1 & 8 | 64.2% ±2.0 (−0.8) | 68.5% ±1.9 (+3.6) | −4.3 ±2.7, noise |
| 2 & 3 | 57.0% ±2.0 (−7.9) | 59.3% ±2.0 (−5.6) | −2.3 ±2.8, noise |

**Finding:** no pair shows a difference beyond noise; the largest, 1 & 8, is 1.6 SE. As the plan expected, the two pools follow identical rules, so which pool loses which digit doesn't matter on its own. Recommendation from the plan stands: offer unordered pairs, or give the order meaning through pool-specific mechanics (for example, an upgrade that narrows only pool A).

**Not yet done:** S1d (drafting re-run with the pair family added).

## S2. Shifting the odds toward better numbers

### S2a. Guarantees

`research/sims/s2a-guarantees.mjs`. "At least N numbers from 10–19" in pool A only or in both pools, granted after round 1. Average player, 300 runs per cell, baseline 66.4% ±1.4 (1,200 runs).

| At least N tens | Pool A only | Both pools |
|---|---|---|
| 1 | 95.3% ±1.2 (+28.9) | 100.0% (+33.6) |
| 2 | 99.3% ±0.5 (+32.9) | 100.0% (+33.6) |
| 3 | 100.0% (+33.6) | 100.0% (+33.6) |
| 4 | 100.0% (+33.6) | 100.0% (+33.6) |

**Findings:**
- **Guarantees are too strong at today's difficulty, even at the smallest step.** One guaranteed 10s value in one pool lifts the average player from 66% to 95%. Everything above that hits the 100% ceiling. The plan expected N ≥ 2 to be too strong; N = 1 in one pool already is.
- **N = 1 in both pools reproduces round 1's +33** for "guaranteed 10s value per pool", a check that the new guarantee code matches the old boolean.
- **This difficulty can't tell the step sizes apart.** S2c measures stacking at a harder target instead.

### S2b. Odds weights

`research/sims/s2b-weights.mjs`. Reweights the 10s up and/or the 90s down in pool A only or both pools, granted after round 1. Average player, 300 runs per cell, baseline 64.3% ±1.4 (1,200 runs). Every change below is beyond noise.

| Setting | Pool A only | Both pools | P(≥1 ten) in an affected pool (S2e) |
|---|---|---|---|
| 10s ×1.5 | 84.0% (+19.8 ±2.5) | 91.7% (+27.4 ±2.1) | 80.3% |
| 10s ×2 | 94.0% (+29.8 ±1.9) | 96.3% (+32.1 ±1.8) | 87.8% |
| 10s ×3 | 98.7% (+34.4 ±1.5) | 100.0% (+35.8 ±1.4) | 95.0% |
| 90s ×0.5 | 74.3% (+10.1 ±2.9) | 82.0% (+17.8 ±2.6) | 69.4% |
| 90s ×0.25 | 78.7% (+14.4 ±2.7) | 87.0% (+22.8 ±2.4) | 70.7% |
| 10s ×2 + 90s ×0.5 | 95.7% (+31.4 ±1.8) | 98.7% (+34.4 ±1.5) | 89.3% |

**Findings:**
- **Only the 90s-down settings in one pool land in the plan's target range** of +8 to +15 per step: 90s ×0.5 (+10.1) and 90s ×0.25 (+14.4). Every 10s-up setting adds at least +19.8, even ×1.5 in one pool.
- **Fewer 90s matters in itself, not through the 10s.** 90s ×0.5 raises the chance of a 10s value by only 2.3 points (S2e) yet adds +10 win-rate points. This matches round 1, where removing a high decade was worth +24–28. The S2e write-up below originally called the 90s setting weak; that was true only of its effect on the 10s.
- **Both pools adds 30–80% more than one pool** for the weaker settings (90s ×0.5: +10.1 → +17.8; 10s ×1.5: +19.8 → +27.4), less for the strong ones because of the ceiling.
- **10s ×2 in one pool (+29.8) matches a guaranteed 10s value in one pool (+28.9)**, and their expected counts of 10s are close (1.74 vs about 1.81). For the average player, the expected number of 10s seems to matter more than a hard guarantee.

### S2c. Stacking

`research/sims/s2c-stacking.mjs`. One upgrade stacked in pool A, granted after rounds 1, 3, 5 and 7; "k stacks" means the first k of those grants. Weights compound per stack (×1.5, ×2.25, ×3.4, ×5.1). This runs at `targetScale` 1.062, where the average player wins 33.8% ±2.4 with no upgrades (planner 93.0% ±2.6, 100 runs), because at today's targets a single 10s upgrade already reaches 95–100% (S2a–b) and later stacks would be invisible. Average player, 300 runs per level, 1,200 with no upgrade.

| Stacks | Guarantee: at least k tens | 10s ×1.5 per stack | 90s ×0.5 per stack |
|---|---|---|---|
| 0 | 32.3% ±1.4 | 34.2% ±1.4 | 33.0% ±1.4 |
| 1 | 78.0% (+45.7) | 50.0% (+15.8) | 39.7% (+6.7) |
| 2 | 95.0% (+17.0) | 74.7% (+24.7) | 45.3% (+5.7, noise) |
| 3 | 99.3% (+4.3) | 85.3% (+10.7) | 51.3% (+6.0, noise) |
| 4 | 100.0% (+0.7, noise) | 89.3% (+4.0, noise) | 45.3% (−6.0, noise) |

Parentheses show the step from the previous level. Step errors are about ±3–4 points, and ±0.5–1.3 near the ceiling.

**Findings:**
- **Later stacks help fewer rounds.** A stack granted after round 7 only affects rounds 8–10, so these steps mix diminishing returns with shrinking time. Read them as the value of the kth pick on this schedule, not the pure value of a kth unit of odds.
- **Guarantees: one stack is worth +46,** far beyond the plan's +8 to +15 per step, and three stacks reach the ceiling. Not a good stackable upgrade; at most a rare, one-time pick.
- **10s ×1.5: the second stack is worth at least as much as the first** (+24.7 vs +15.8; the gap is within about 2 SE), then it falls off. One possible reason: ×2.25 sits between ×2 and ×3, where S2e puts the chance of a 10s value at 88–95%. Too strong per stack for a common.
- **90s ×0.5 is the only one in range, and shows no clear diminishing returns:** about +6 per stack through three stacks (+18.3 total), though each single step is within noise, and the fourth stack's drop back to +12.3 is noise too. It's the best candidate for a stackable common, to be tested in drafting (S2d).
- **Design question for the user** (from the plan): whether a visible odds chart makes these upgrades easier to understand. The sims can't answer it; S2e has the data for a mock-up.

### S2e. Chart data

`research/sims/s2e-odds-chart.mjs`. Exact calculation (no simulation) via a forward DP over a 9-draw weighted-sampling-without-replacement process, treating the 10s, 90s and "everything else" as three exchangeable weight classes. Self-checks the baseline (all weights 1) against the closed-form hypergeometric distribution before printing anything — both the mean and the zero-count probability matched to 1e-9.

| Setting | E[10s count] | E[90s count] | E[per other decade] | P(≥1 ten) |
|---|---|---|---|---|
| baseline | 1.000 | 1.000 | 1.000 | 67.16% |
| 10s ×1.5 | 1.395 | 0.951 | 0.951 | 80.26% |
| 10s ×2 | 1.740 | 0.908 | 0.908 | 87.81% |
| 10s ×3 | 2.318 | 0.835 | 0.835 | 95.01% |
| 90s ×0.5 | 1.057 | 0.542 | 1.057 | 69.43% |
| 90s ×0.25 | 1.090 | 0.283 | 1.090 | 70.66% |
| 10s ×2 + 90s ×0.5 | 1.827 | 0.488 | 0.955 | 89.27% |

Steps in P(≥1 ten) as the 10s weight climbs: ×1→×1.5 is +13.1pp, ×1.5→×2 is +7.6pp, ×2→×3 is +7.2pp. The steps differ in size, so per +1 of weight that's +26.2, +15.1 and +7.2pp: strongly diminishing, as the plan expected. How much that matters for tuning depends on the full-run stacking curve (S2c), not on this chart alone.

**Findings:**
- **Weighting 90s down barely changes the chance of a 10s value** (90s ×0.25 lifts P(≥1 ten) by only 3.5pp); its effect is fewer 90s. That doesn't make it weak: S2b measured 90s ×0.5 in one pool at +10 win-rate points, a better-sized step than any 10s setting.
- **The combined setting (10s ×2 + 90s ×0.5) stacks slightly more than additively** on E[10s]. 10s ×2 alone adds +0.740 and 90s ×0.5 alone adds +0.057 (sum +0.797); together they add +0.827. Cutting the 90s' weight frees probability that flows to other values in proportion to their weight, so the doubled 10s get an outsized share. The effect is small: the 10s weight does almost all the work.
- **This data is a candidate for the in-game distribution chart** the user proposed (dicebuilder-style): the per-decade expected-count table is exactly what such a chart would show, and it's cheap to compute for any weight setting at runtime (no simulation needed).

**Not yet done:** S2d (drafting re-run).

## S3. Constrained start with decade unlocks

### S3a. Retune

`research/sims/s3a-retune.mjs`. Binary-searches `targetScale` (today's targets scaled by a single multiplier, no max-energy change) until the average player's win rate lands near today's baseline (~65–67%), then confirms the planner at that point. 200 average runs per search point, 100 planner runs at the chosen point.

| Starting range | Retuned `targetScale` | Average win% | Planner win% |
|---|---|---|---|
| 40–79 | 0.564 | 67.5% ±3.3 (n=200) | 100.0% ±0.0 (n=100) |
| 30–69 | 0.848 | 65.0% ±3.4 (n=200) | 100.0% ±0.0 (n=100) |
| 20–59 | 1.173 | 65.5% ±3.4 (n=200) | 100.0% ±0.0 (n=100) |

**Findings:**
- **`targetScale` alone was enough** for all three ranges — no max-energy change needed. That's a simpler retune than the plan allowed for.
- **The scale needed follows single-round cost.** From the plan's preliminary single-round numbers (target 300): 40–79 costs 99.7 energy vs 41.9 for 10–99 and needed targets cut to 56%; 30–69 costs 62.0 and needed 85%; 20–59 costs 34.0, *less* than today's game because it drops the expensive 60s–90s, and needed targets raised 17%. A constrained range isn't automatically harder; it depends on which end it cuts.
- **A 40–79 start is more sensitive to target changes than today's game.** During the 40–79 search, moving `targetScale` from 0.544 to 0.584 (about ±3.5% around the chosen point) swung the average player from 89.0% to 43.5% (n=200 each). The same ±3.5% on 10–99 moved the average player from 81.0% ±2.3 to 50.3% ±2.9 (n=300 each). Both are steep, but 40–79 is about 1.5× as steep, so its real targets would need careful rounding.
- **Each chosen scale rests on one 200-run sample** that landed within 2 points of 66% with ±3.4 error, so the true average win rate at these points is roughly 60–73%. Good enough to build S3b–c on; re-measure with more runs before quoting it as final.
- **Targets aren't whole numbers at these scales** (for example 240 × 0.564 = 135.4). The harness compares scores against the fractional target, which acts like rounding up. A real design would pick round numbers.
- **Planner win rate landed at 100% for all three, slightly above the ≈99% target** — within 1 SE of it at n=100 (stderr ≈1.0pt), so not a real miss, but worth another look with a bigger n before finalizing a starting range, since a planner ceiling this close to 100% leaves little room to confirm "skilled players should almost always win" against "average players win near half" simultaneously once unlocks are layered on top.
- **S3b–e will use 40–79** (`targetScale` 0.564), the user's choice on 2026-09-14.

**Not yet done:** S3b (unlock values), S3c (unlock order), S3d (drafting with unlocks), S3e (board variety along the unlock path).

## Next

S1a–c, S2a–c, S2e and S3a are done. Next per `sim-plan-2.md`: **S3b–c** on the 40–79 start, then the drafting re-runs (S1d, S2d, S3d).
