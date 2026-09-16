# Roguelike Upgrades Research, Round 3

Research for the user's 2026-09-15 notes in `upgrades.txt`, following `research/sim-plan-3.md` (read its principles and decisions first). **Nothing here is implemented.** Everything runs on the 40–79 start with decade unlocks and a pick after every round won.

## Summary

- **Target schedule.** The user chose 135 + 6.484375 × (r − 1)²: 135 in round 1, 239 in round 5, 660 in round 10. There, an average player drafting well wins 93%, the planner 99%, and a random draft 59%, with losses mostly in the last rounds. No schedule shape made the game less knife-edge: raising every target 5% costs a well-drafting average player 12–20 points on all 15 schedules tested (P2).
- **What offers are worth on the 40–79 start.** Unlocking a low decade dominates (10s > 20s > 30s). "Keep smallest", one of round 1's strongest upgrades, is weak here (P2a).
- **Synergies.** 300,000 random drafts turned up candidates that replicated on held-out runs (P3c), but controlled tests with a good draft kept only two kinds (P3d):
  - **Redundancies:** two low unlocks, or limiting pool A plus the 10s, are worth far less together.
  - **Player-dependent effects:** "products over 4000 score double" wrecks the average player and helps a skilled one.
  The build-around synergies found under random drafting didn't survive a good draft.
- **High decades** (P5):
  - **As an ascension modifier,** one decade is a gentle step (−5 to −8 points for an average player drafting well; noise for the planner), and both are a real one (−19 and −6).
  - **As a curse that comes with a bonus,** an energy-regain bonus of about ×1.5 on refunds makes it a close call for a random build.
  - **With "over 4000 double",** high decades become a winning build for a skilled player (99–100%) and a trap for the average player (24%): the skill-expression shape the 9/15 notes asked for.
- **Money** (P4):
  - **Skilled players earn the most** once players value money at all. Round 1's "overshoot money rewards weak play" came from players that ignored money.
  - **At 0.1–0.25 per overshoot point,** money is free for skilled players.
  - **At about 0.5–1 per point it becomes a real trade-off:** chasing it spends the energy buffer, and at 2 per point it starts costing runs.
- **Not run:**
  - **P1:** a schedule met the goals, so the forgiveness levers weren't needed.
  - **P4b:** trade-off curves by build.
  - **The P2 follow-ups on skilled-player losses:** deferred by the user.
- **Model limits.** The average player looks one move ahead, so it can't chase money or change strategy for a build. The planner plays rounds well but drafts by a table of solo values. Everything here is a candidate for playtesting, not a verdict.

## 0. Harness changes

In `research/sims/`:
- **Target schedules:** `cfg.targets` takes an array of 10 round targets or a function of the round, reaching the best-play check, the round-end check and overshoot. `powerTargets(T1, c, p)` builds T1 + c × (r − 1)^p and `geometricTargets(T1, g)` builds T1 × g^(r − 1). `targetExtra` and `targetScale` still apply on top.
- **Per-run draft records:** every run returns a `draft` log of what was offered and picked each round.
- **Offer pool for the 40–79 start** (`draft-pool-3.mjs`): the 10s, 20s and 30s as unlocks, plus round 1's upgrades adapted to this start. "Guaranteed 10s" is offered only once the 10s are unlocked, "remove a high decade" starts from the 70s, and no offer may shrink a pool's allowed numbers below the pool size.
- **Metrics:** mean rounds cleared (with its error), and each winning run's tightest round (the least energy left at any round end).
- **`calibrate`:** one shared search for "the knob where win rate hits X%".
- **A fix:** a reroll no longer crashes when a narrowed pool has no other numbers to draw.

**Validation:** `harness-selftest.mjs` passes all 16 checks. The new ones cover target schedules, the offer pool's eligibility rules, a stress test of 3,000 random pick sequences that never leaves a pool undrawable, draft records and `calibrate`. `baseline.mjs` reproduces the average player at 65.3% ±2.7 and the planner at 98.7% ±0.7 (300 runs each; expected 65–67% and 97–99%).

**Money (added for P4):** money rates per round won, per leftover turn, per overshoot point and per Optimal play, and a `moneyWeight` that makes both players value money in energy terms. New checks confirm that `moneyWeight` 0 leaves both players' choices unchanged on the same boards, and that a money-aware planner overshoots more (10.4 → 92.5 on the same boards). The money-aware average player only looks one move ahead, so it can't wait for a bigger overshoot; instead it finishes sooner (5.55 → 5.86 turns left). After these changes the baseline still gives 64.7% ±2.8 and 98.0% ±0.8.

## P2a. What each offer is worth on its own

`research/sims/p2a-values-4079.mjs`, writing `research/sims/values-4079.json`. P2b–c's "drafting well" policy picks by this table.

**Method.** Each offer is granted once, after round 1, to the average player on a provisional schedule: 135 + c × (r − 1)^1.5. The plan said to calibrate c so runs with no picks win about 30%. Round 2 (S3b) showed that at that level every low unlock wins every run, so the unlocks would tie. Instead, c was calibrated so the strongest single offer, unlocking the 10s, wins about 50%. That gave c = 13.48 and targets of 135, 148, 173, 205, 243, 286, 333, 385, 440, 499. For the same reason, value is the change in **mean rounds cleared** (a win counts as 10), which has no ceiling at either end. Win rate is shown alongside.

Calibration: unlocking the 10s wins 54.5% ±2.5 (400 runs). With no pick: 0.0% wins, 5.64 ±0.02 rounds cleared (1,200 runs). 600 runs per offer.

| Offer | Value (rounds cleared) | Win% | Rounds cleared |
|---|---|---|---|
| Unlock the 10s | +3.71 ±0.03 | 48.0 ±2.0 | 9.36 |
| Unlock the 20s | +2.70 ±0.03 | 2.8 ±0.7 | 8.35 |
| Unlock the 30s | +1.82 ±0.03 | 0.0 | 7.46 |
| Squares (a × a) cost 0 | +1.06 ±0.03 | 0.0 | 6.71 |
| Pool A limited to 10–49 | +0.86 ±0.03 | 0.0 | 6.51 |
| +40% round-end refund | +0.73 ±0.03 | 0.0 | 6.38 |
| +40 max energy | +0.63 ±0.03 | 0.0 | 6.27 |
| Guaranteed 10s (on top of the 10s unlock) | +0.58 ±0.03 | 94.2 ±1.0 | 9.94 |
| Remove the highest decade (the 70s) | +0.51 ±0.02 | 0.0 | 6.15 |
| +1 number per pool | +0.50 ±0.03 | 0.0 | 6.15 |
| Optimal bonus cap +4 | +0.40 ±0.03 | 0.0 | 6.04 |
| Keep smallest number into next round | +0.31 ±0.02 | 0.0 | 5.95 |
| +1 reroll | +0.12 ±0.03 | 0.0 | 5.76 |
| Remove ones digit 7 | +0.08 ±0.03 | 0.0 | 5.72 |
| Remove ones digit 5 | +0.00 ±0.03 (noise) | 0.0 | 5.64 |

**Findings:**
- **The unlocks dominate, in order of decade.** The 10s are worth +3.71 rounds, the 20s +2.70 and the 30s +1.82. Only the 10s unlock wins runs on its own at this schedule.
- **"Guaranteed 10s" is a strong follow-up once the 10s are in:** +0.58 rounds, taking the average player from 48% to 94% wins.
- **"Keep smallest" is weak on this start (+0.31),** though round 1 had it among the four upgrades that nearly won alone on 10–99 (+33 win-rate points). On 40–79 the smallest number is 40 or more until a low decade is unlocked, so carrying it forward saves little. Its value probably depends on the unlocks, which is the kind of interaction P3 looks for.
- **Removing a single ones digit is worth about nothing,** as on 10–99.
- **Caveats:** these are solo values at one provisional schedule, which principle 3 says not to tune against. They only stand in for "drafting well" in P2b–c. Values for offers that depend on other picks, like "guaranteed 10s", are conditional.

## P2b–c. Target schedules with drafting

`research/sims/p2-schedules.mjs`. 15 schedules: round 1 targets T1 = 90, 115 and 135, each with power schedules T1 + c × (r − 1)^p for p = 1, 1.5, 2 and 2.5, and a geometric schedule T1 × g^(r − 1). Each schedule's c (or g) is calibrated so the average player drafting well (picking by the P2a table) wins about 92% (400 runs per search point). Then every drafting policy runs at that setting: 600 average-player runs each (about ±1–2 points of error), and 200 planner runs drafting well.

**Average-player win rate by drafting policy.** Declining every offer won 0% on every schedule, so it's left out.

| Schedule | Targets, round 1 → 5 → 10 | Drafting well | Randomly | Worst-first | Random drafting's deaths |
|---|---|---|---|---|---|
| T1 90, linear | 90 → 325 → 619 | 92.5 | 36.5 | 0.0 | rounds 5–10 |
| T1 90, p 1.5 | 90 → 260 → 664 | 91.5 | 54.7 | 0.0 | rounds 7–10 |
| T1 90, p 2 | 90 → 205 → 672 | 90.8 | 69.7 | 0.5 | rounds 8–10 |
| T1 90, p 2.5 | 90 → 168 → 679 | 89.0 | 76.7 | 2.2 | rounds 9–10 |
| T1 90, geometric | 90 → 219 → 663 | 95.3 | 75.7 | 0.7 | rounds 8–10 |
| T1 115, linear | 115 → 335 → 610 | 89.2 | 32.8 | 0.0 | rounds 5–10 |
| T1 115, p 1.5 | 115 → 276 → 659 | 90.8 | 47.5 | 0.0 | rounds 7–10 |
| T1 115, p 2 | 115 → 225 → 672 | 90.3 | 61.2 | 0.2 | rounds 8–10 |
| T1 115, p 2.5 | 115 → 188 → 666 | 88.7 | 80.7 | 1.0 | rounds 9–10 |
| T1 115, geometric | 115 → 251 → 667 | 91.8 | 62.5 | 0.0 | rounds 7–10 |
| T1 135, linear | 135 → 335 → 585 | 91.2 | 33.0 | 0.0 | rounds 5–10 |
| T1 135, p 1.5 | 135 → 290 → 658 | 90.8 | 39.7 | 0.0 | rounds 6–10 |
| T1 135, p 2 | 135 → 239 → 660 | 93.2 | 59.3 | 0.0 | rounds 7–10 |
| T1 135, p 2.5 | 135 → 205 → 667 | 93.0 | 73.8 | 0.7 | rounds 8–10 |
| T1 135, geometric | 135 → 275 → 669 | 92.2 | 43.8 | 0.2 | rounds 6–10 |

"Random drafting's deaths" lists the rounds where at least 1% of random-drafting runs died.

**Planner, target sensitivity and tightest round.** Sensitivity reruns the average player drafting well with every target scaled ×0.95 or ×1.05 (600 runs each, ±0.3–1.8). The tightest round is the least energy a winning, well-drafted average-player run had left at any round end.

| Schedule | Planner drafting well | Average drafting well | Targets ×0.95 | Targets ×1.05 | Tightest round, median (p10) |
|---|---|---|---|---|---|
| T1 90, linear | 98.5 ±0.9 | 92.5 | 97.0 | 80.7 | 152 (82) |
| T1 90, p 1.5 | 97.5 ±1.1 | 91.5 | 97.0 | 78.3 | 157 (88) |
| T1 90, p 2 | 96.0 ±1.4 | 90.8 | 98.5 | 75.3 | 180 (124) |
| T1 90, p 2.5 | 95.5 ±1.5 | 89.0 | 98.0 | 73.0 | 184 (130) |
| T1 90, geometric | 97.0 ±1.2 | 95.3 | 99.3 | 77.2 | 185 (131) |
| T1 115, linear | 100.0 | 89.2 | 96.2 | 76.8 | 154 (78) |
| T1 115, p 1.5 | 99.0 ±0.7 | 90.8 | 98.0 | 79.0 | 159 (92) |
| T1 115, p 2 | 99.0 ±0.7 | 90.3 | 98.3 | 75.2 | 172 (120) |
| T1 115, p 2.5 | 97.0 ±1.2 | 88.7 | 97.8 | 80.2 | 186 (139) |
| T1 115, geometric | 97.5 ±1.1 | 91.8 | 97.8 | 76.7 | 176 (115) |
| T1 135, linear | 99.5 ±0.5 | 91.2 | 96.7 | 76.0 | 162 (82) |
| T1 135, p 1.5 | 98.0 ±1.0 | 90.8 | 97.8 | 74.7 | 153 (82) |
| T1 135, p 2 | 99.0 ±0.7 | 93.2 | 98.5 | 80.7 | 171 (113) |
| T1 135, p 2.5 | 98.5 ±0.9 | 93.0 | 98.8 | 80.2 | 182 (133) |
| T1 135, geometric | 96.5 ±1.3 | 92.2 | 97.5 | 72.5 | 160 (99) |

**Findings:**
- **The final target barely depends on the schedule's shape.** Every super-linear schedule calibrates to a round 10 target of about 660–680, which is what a well-drafted build handles. The shape decides how early the pressure starts; linear schedules end lower (585–619) because they press in the middle rounds too.
- **The steeper the ramp, the less drafting skill matters.** Drafting well beats drafting randomly by about 56–59 points on linear schedules, 32–51 at p = 1.5, 21–34 at p = 2, and only 8–19 at p = 2.5. With gentle early rounds, even a random draft gathers enough picks before the late rounds arrive.
- **Steeper ramps move losses late, as intended.** Runs drafted well lose only in round 10 at p ≥ 2; random drafts start dying in round 5 on linear schedules but only in rounds 9–10 at p = 2.5.
- **A lower round 1 target also helps random drafting** (at p = 1.5: 54.7% at T1 90, 47.5% at 115, 39.7% at 135), for the same reason: more rounds to collect picks.
- **Winners keep more energy on steep schedules.** A well-drafted run's tightest round leaves a median of about 150–160 energy on linear schedules and 170–186 at p ≥ 2 (10th percentile about 80 vs 115–140).
- **Declining every offer never wins, and worst-first drafting almost never does (0–2%),** so drafting is always required.
- **A planner who drafts well wins 95.5–100%** (200 runs), losing almost only in round 10. The lowest results are the steep schedules starting at 90 (95.5–97%).
- **The schedule's shape doesn't make the game less knife-edge.** Raising every target 5% costs the well-drafting average player 12–20 points on every schedule, with no clear pattern by shape or starting target; lowering them 5% lifts it to 96–99%. So forgiveness has to come from somewhere else: P1's energy and refund levers, or the upgrade pool.
- **"Drafting well" leans on stackable energy picks.** On every schedule the average player drafting well took +40% refund (830–900 picks per 600 runs) and +40 max energy (620–720) more often than any unlock (530–570), because each unlock can be taken only once while those stack. +40 max energy has no stacking limit, so P3 should check whether stacking energy is a dominant strategy.

**The main trade-off:** a steep late ramp (principle 2) makes the late rounds the real test, but at the goal of 90% for an average player drafting well, it also makes random drafting nearly as good. There is no goal for random drafting yet, and it's now the deciding question.

**Do skilled players still lose?** Yes, occasionally, but these numbers probably overstate it for a truly skilled player.
- **What was measured.** The planner drafting well won 95.5–100% (200 runs each, about ±0.5–1.5), losing almost only in round 10. Its winning runs weren't close calls: their tightest round left a median of about 190 energy.
- **Calibration targeted the average player.** Each schedule was tuned so an average player drafting well wins about 92%. The planner's rate is whatever resulted, only 5–7 points above.
- **The planner isn't a skilled drafter.** It plays each round well but picks by P2a's solo-value table. It ignores what it has already drafted, synergies, and what round 10 will demand. A skilled human should draft better.
- **Round 10 is a big jump on every super-linear schedule** (about +110–130 points in the last round), so an unlucky final board can still sink a good run.
- **200 planner runs can't tell 99% from 100%** reliably.

**Follow-ups, not run yet:**
1. Calibrate on the skilled player instead: schedules where the planner drafting well wins at least 99.5% over about 1,000 runs, then check that the average player drafting well still clears 90%.
2. Give the planner a draft policy that considers its current build and the rounds ahead.
3. Test a softer final round (a cap on the last jump, or a gentler round 10) to see whether round 10 losses go away without making random drafts win.

**Decision (2026-09-15):** the user chose **power p = 2 from T1 135** for P3–P5: 135 + 6.484375 × (r − 1)², so 135, 141, 161, 193, 239, 297, 368, 453, 550, 660. The follow-ups above are deferred.

## P3. Random-draft synergy discovery

### P3a–b. Runs

`research/sims/p3-random-drafts.mjs`. The pilot ran 1,000 random-draft runs in about a second, so P3b ran **300,000** (6 processes × 50,000): the average player drafting at random from `P3_OFFERS` at the chosen schedule. That pool is the P2 pool plus:
- **The ones-digit pair family:** all 45 pairs, weighted to count as 2 offers in total.
- **Odds upgrades for pool A:** 10s ×1.5 per stack, 70s ×0.5 per stack (the 70s stand in for high numbers until P5), and one more guaranteed 10s value.
- **Two relics:** "products over 4000 score double", and "factors of 70 or more cost 25% less" (adapted from round 1's 80s/90s relic).

Random drafting from this pool wins **32.1%**, against 59.3% from the smaller P2 pool at the same schedule: the bigger pool is full of weak offers.

### P3c. Main effects and interactions

`research/sims/p3-synergy.mjs`.

**Method:**
- **Landmark round 5.** Only runs that cleared round 5 count (299,890 of 300,000), and a run "holds" whatever it picked after rounds 1–5. This keeps early deaths, which make fewer picks, from looking like bad picks.
- **Interaction.** A difference in differences, (both − A only) − (B only − neither), on rounds cleared, win rate and win log-odds. Rounds cleared and win rate both have ceilings that can make two strong picks look redundant; log-odds doesn't.
- **Hold-out.** Pairs were ranked on half the runs and re-measured on the other half (149,945 each). 889 pairs had at least 300 runs in every cell.

**How to read main effects:** in random drafting, holding an offer means that pick wasn't spent on something else. So a main effect compares the offer with an average other pick, not with nothing. Offers that need another pick first (the 10s odds and guarantees need the 10s unlocked) also carry part of that pick's effect.

**Main effects** (all landmark runs; errors ±0.01 rounds and ±0.2 points for common offers, ±0.03 and ±0.7 for single digit pairs):

| Offer | Rounds cleared | Win points |
|---|---|---|
| Unlock the 10s | +1.55 | +50.7 |
| Guaranteed 10s (both pools)* | +1.29 | +43.1 |
| 10s ×1.5 in pool A* | +1.21 | +38.7 |
| One more guaranteed 10s in pool A* | +1.21 | +38.6 |
| Unlock the 20s | +1.00 | +21.0 |
| Pool A limited to 10–49 | +0.90 | +27.1 |
| Unlock the 30s | +0.55 | +4.9 |
| Squares cost 0 | +0.24 | −1.1 |
| Remove the highest decade | +0.22 | +6.2 |
| +40 max energy / +40% refund / +1 number per pool | +0.08 / +0.07 / +0.02 | −2.5 / −1.6 / +5.0 |
| Keep smallest / 70s+ factors cheaper / bonus cap +4 | −0.30 / −0.31 / −0.33 | −6.4 / −10.5 / −8.6 |
| Remove digit 5 / remove digit 7 | −0.37 / −0.37 | −8.7 / −9.9 |
| +1 reroll | −0.43 | −10.2 |
| 70s ×0.5 in pool A | −0.61 | −15.3 |
| Products over 4000 score double | −1.09 | −24.8 |
| Ones-digit pairs | −0.16 (0 & 7) to −0.65 (2 & 3) | −2.2 to −12.6 |

\* Only offered once the 10s are unlocked.

The digit pairs keep round 2's order (S1b): pairs with 0 are the least costly (−0.16 to −0.26), and pairs of 1–4 the most (−0.53 to −0.65). All of them are below an average pick here.

**Strongest interactions** (discovery half, then the hold-out half; errors ±0.01–0.02 rounds, ±0.5–0.7 points, ±0.03–0.05 log-odds):

| Pair | Both held (discovery) | Rounds cleared | Win points | Win log-odds | Hold-out rounds cleared |
|---|---|---|---|---|---|
| Pool A limited to 10–49 + over 4000 double | 7,506 | +0.61 | +6.2 | +1.01 | +0.60 |
| 70s+ factors cheaper + over 4000 double | 7,446 | +0.55 | +7.9 | +0.06 | +0.54 |
| 70s ×0.5 in pool A + unlock the 10s | 6,275 | +0.45 | +2.3 | +0.54 | +0.46 |
| +1 reroll + unlock the 10s | 7,646 | +0.39 | +4.3 | +0.37 | +0.35 |
| Over 4000 double + remove the highest decade | 8,736 | +0.38 | +3.8 | +0.42 | +0.35 |
| +1 reroll + unlock the 20s | 8,299 | +0.35 | +2.6 | +0.24 | +0.31 |
| 70s+ factors cheaper + unlock the 10s | 7,134 | +0.30 | +4.4 | +0.43 | +0.29 |
| Keep smallest + unlock the 10s | 7,784 | +0.30 | +5.5 | +0.34 | +0.27 |
| Keep smallest + unlock the 20s | 8,308 | +0.28 | +3.2 | +0.21 | +0.31 |
| Remove digit 7 + unlock the 10s | 7,726 | +0.25 | +0.5 | +0.21 | +0.25 |
| Unlock the 10s + unlock the 20s | 7,799 | −1.25 | −22.1 | −1.37 | −1.24 |
| Unlock the 10s + unlock the 30s | 7,809 | −0.72 | −6.2 | −0.43 | −0.74 |
| Pool A limited to 10–49 + squares cost 0 | 7,524 | −0.54 | −10.5 | −0.44 | −0.55 |
| Unlock the 20s + unlock the 30s | 8,263 | −0.53 | −0.4 | −0.08 | −0.52 |
| Pool A limited to 10–49 + unlock the 10s | 8,053 | −0.46 | +3.6 | **+0.64** | −0.47 |

**Controls:** "70s+ factors cheaper" + "remove the highest decade" came out as an anti-synergy, as expected (−0.34 ±0.02 rounds, −0.26 ±0.03 log-odds). "70s ×0.5" + "remove the highest decade" was only −0.07 ±0.02 rounds and noise on log-odds. The odds upgrade already hurts on its own, so wasting it costs little.

**Findings:**
- **Every one of the 15 pairs replicated on the hold-out half,** at nearly the same size.
- **Several of the strongest "synergies" defuse a trap rather than build around it.** "Products over 4000 score double" is the worst offer for the average player (−1.09 rounds), because it chases expensive products. Pairs that neutralize it score well:
  - Limiting pool A to 10–49 switches it off (no product can exceed 49 × 79 = 3,871).
  - Removing the 70s leaves far fewer products over 4000.
  - Cheaper 70s+ factors make those products cost less.
  That's a real effect for this player, but not the build-around synergy the 9/15 notes mean. Whether a skilled player can turn "over 4000" into a strength is what the planner runs in P3d test.
- **Genuine-looking synergies cluster around the 10s unlock.** With the 10s in, several picks gain:
  - **Rerolls (+0.39):** replacing the largest number is likelier to land a cheap one.
  - **Keep smallest (+0.30):** P2a predicted this; it can now carry a 10s value forward.
  - **Fewer 70s in pool A (+0.45)** and **cheaper 70s+ factors (+0.30).**
  - **Removing digit 7 (+0.25).**
  Rerolls and keep smallest also gain with the 20s.
- **The low unlocks are redundant with each other.** The 10s plus the 20s cost 1.25 rounds (22 win points) against the sum of their separate effects, and the 10s with the 30s cost 0.72. Once one low decade is in, the next adds much less (round 2 S3c found the same).
- **Pool A limited to 10–49 + unlock the 10s is unresolved.** Rounds cleared calls it an anti-synergy (−0.46) and log-odds a synergy (+0.64). Both picks are strong, so rounds cleared is likely hitting its ceiling.
- **Pool A limited to 10–49 + squares cost 0 is an anti-synergy (−0.54 rounds).** A likely reason, not measured: squares save the most energy on large shared numbers, and narrowing pool A caps shared numbers at 49.
- **Caveat:** this is the average player, who never changes strategy for a build. P3d re-tests these pairs with the planner in controlled runs.

### P3d. Controlled checks

`research/sims/p3d-confirm.mjs`. For each pair, four cells at the chosen schedule: neither, A only (granted after round 1), B only (granted after round 2), and both. From round 3 on, every cell drafts well from the P2 pool with A and B never offered, so the pair is the only difference between cells. 600 average-player runs per cell (about ±2 points) and 200 planner runs per cell.

**Design note:** each pair's "neither" cell differs, because A and B are removed from its drafting. For two strong picks, such as two low unlocks, "neither" is very weak (3.5% when both the 10s and 20s are withheld). That makes the redundancy look larger than it would when either pick could be drafted later.

**Average player** (cells are win %; interaction = (both − A only) − (B only − neither)):

| Pair (A + B) | Neither | A only | B only | Both | Rounds cleared | Win points | Win log-odds | P3c said |
|---|---|---|---|---|---|---|---|---|
| Pool A limited to 10–49 + over 4000 double | 53.8 | 90.2 | 10.0 | 89.3 | **+1.88** ±0.08 | +43.0 ±3.0 | +2.25 ±0.25 | +0.61 |
| Over 4000 double + remove the highest decade | 71.2 | 30.0 | 85.5 | 74.5 | **+1.25** ±0.08 | +30.2 ±3.5 | +1.05 ±0.20 | +0.38 |
| 70s+ factors cheaper + over 4000 double | 67.2 | 65.0 | 32.5 | 51.8 | **+0.94** ±0.09 | +21.5 ±3.9 | +0.90 ±0.17 | +0.55 |
| 70s ×0.5 in pool A + unlock the 10s | 27.0 | 33.3 | 93.0 | 91.5 | −0.17 ±0.07 | −7.8 ±3.1 | −0.51 ±0.25 | +0.45 |
| +1 reroll + unlock the 10s | 28.2 | 43.2 | 92.0 | 92.5 | −0.29 ±0.06 | −14.5 ±3.1 | −0.59 ±0.25 | +0.39 |
| +1 reroll + unlock the 20s | 64.2 | 69.8 | 91.2 | 92.3 | −0.07 ±0.06 (noise) | −4.5 ±3.1 | −0.10 ±0.24 | +0.35 |
| 70s+ factors cheaper + unlock the 10s | 29.0 | 31.7 | 92.7 | 92.3 | −0.09 ±0.07 (noise) | −3.0 ±3.1 | −0.17 ±0.25 | +0.30 |
| Keep smallest + unlock the 10s | 30.3 | 48.7 | 92.7 | 90.2 | −0.36 ±0.06 | −20.8 ±3.2 | −1.09 ±0.24 | +0.30 |
| Keep smallest + unlock the 20s | 62.0 | 74.7 | 89.8 | 90.3 | −0.29 ±0.06 | −12.2 ±3.2 | −0.53 ±0.23 | +0.28 |
| Remove digit 7 + unlock the 10s | 30.5 | 41.0 | 88.3 | 90.5 | −0.20 ±0.06 | −8.3 ±3.3 | −0.23 ±0.22 | +0.25 |
| Unlock the 10s + unlock the 20s | 3.5 | 95.5 | 80.8 | 92.7 | **−2.03** ±0.05 | −80.2 ±2.2 | −5.24 ±0.35 | −1.25 |
| Unlock the 10s + unlock the 30s | 24.3 | 93.3 | 74.2 | 93.5 | **−1.23** ±0.06 | −49.7 ±2.9 | −2.16 ±0.27 | −0.72 |
| Unlock the 20s + unlock the 30s | 63.5 | 91.3 | 87.0 | 94.3 | −0.67 ±0.06 | −20.5 ±2.8 | −0.89 ±0.27 | −0.53 |
| Pool A limited to 10–49 + unlock the 10s | 13.0 | 69.3 | 89.7 | 96.0 | **−1.08** ±0.05 | −50.0 ±2.8 | −1.71 ±0.29 | −0.46 (log-odds +0.64) |
| Pool A limited to 10–49 + squares cost 0 | 60.2 | 95.0 | 76.8 | 92.3 | −0.35 ±0.05 | −19.3 ±3.0 | −1.23 ±0.27 | −0.54 |
| Control: 70s+ factors cheaper + remove the highest decade | 67.8 | 74.5 | 88.0 | 83.2 | −0.19 ±0.05 | −11.5 ±3.3 | −0.72 ±0.21 | −0.34 |

**Findings (average player):**
- **The trap-cancellation pairs replicate, and they're larger in controlled runs.** On its own, "over 4000 double" drops the average player to 10–33%. Limiting pool A to 10–49 cancels it completely (89.3% with both vs 90.2% with the limit alone). Removing the highest decade and cheaper 70s+ factors cancel it partly. In every case the relic still does no good; the partner only removes its harm.
- **Every redundancy replicates.** Two low unlocks, or limiting pool A plus the 10s, are worth far less together than their separate effects. Once one of them is in, the other adds little.
- **P3c's ambiguous pair is an anti-synergy.** "Pool A limited to 10–49 + unlock the 10s" is negative on log-odds too (−1.71 ±0.29), so the ceiling wasn't the explanation.
- **The control replicates** (−0.19 rounds, −0.72 log-odds).
- **The synergies P3c found around the 10s unlock don't survive a good draft.** "Keep smallest", rerolls, fewer 70s and removing digit 7 each looked good with the 10s under random drafting. In controlled runs where the rest of the build drafts well, they're neutral or slightly negative. The likely reason is that a good draft already supplies what they add, and a well-drafted run with the 10s is near 90% anyway.
- **So synergies depend on the rest of the build.** Random-draft discovery (principle 6) finds real interactions for weak, random builds, but they need re-checking in the builds players will actually make. The redundancies and trap cancellations held in both settings; the build-around synergies didn't.

**Planner** (cells are win %; 200 runs each; interaction in win points and win log-odds). Rounds-cleared interactions are all within ±0.4, because the planner nearly always reaches round 10.

| Pair (A + B) | Neither | A only | B only | Both | Win points | Win log-odds |
|---|---|---|---|---|---|---|
| Pool A limited to 10–49 + over 4000 double | 92.0 | 99.0 | 99.0 | 98.0 | **−8.0 ±2.4** | −2.56 ±1.05 |
| Over 4000 double + remove the highest decade | 98.0 | 99.0 | 99.5 | 98.0 | −2.5 ±1.6 (noise) | −1.71 ±1.24 |
| 70s+ factors cheaper + over 4000 double | 92.0 | 95.0 | 97.0 | 99.5 | −0.5 ±2.8 (noise) | +1.01 ±1.00 |
| 70s ×0.5 in pool A + unlock the 10s | 90.0 | 93.5 | 97.5 | 97.0 | −4.0 ±3.2 (noise) | −0.63 ±0.69 |
| +1 reroll + unlock the 10s | 88.0 | 96.0 | 97.0 | 97.0 | −8.0 ±3.2 | −1.15 ±0.70 |
| +1 reroll + unlock the 20s | 93.5 | 96.5 | 97.0 | 95.5 | −4.5 ±2.9 (noise) | −1.01 ±0.70 |
| 70s+ factors cheaper + unlock the 10s | 85.5 | 90.0 | 98.5 | 98.0 | −5.0 ±3.5 (noise) | −0.67 ±0.78 |
| Keep smallest + unlock the 10s | 91.5 | 95.5 | 96.0 | 96.5 | −3.5 ±3.1 (noise) | −0.52 ±0.66 |
| Keep smallest + unlock the 20s | 96.0 | 96.0 | 98.0 | 96.0 | −2.0 ±2.6 (noise) | −0.66 ±0.77 |
| Remove digit 7 + unlock the 10s | 92.0 | 90.5 | 98.0 | 98.0 | +1.5 ±3.2 (noise) | +0.18 ±0.76 |
| Unlock the 10s + unlock the 20s | 63.5 | 99.0 | 98.5 | 98.5 | **−35.5 ±3.7** | −3.82 ±1.00 |
| Unlock the 10s + unlock the 30s | 79.0 | 97.5 | 98.5 | 98.5 | **−18.5 ±3.3** | −2.25 ±0.89 |
| Unlock the 20s + unlock the 30s | 85.0 | 97.0 | 99.5 | 97.5 | **−14.0 ±3.0** | −3.00 ±1.03 |
| Pool A limited to 10–49 + unlock the 10s | 73.0 | 97.0 | 97.5 | 100.0 | **−21.5 ±3.5** | (100% cell) |
| Pool A limited to 10–49 + squares cost 0 | 94.0 | 98.5 | 96.5 | 96.5 | −4.5 ±2.6 (noise) | −1.32 ±0.81 |
| Control: 70s+ factors cheaper + remove the highest decade | 96.0 | 97.0 | 99.0 | 96.5 | −3.5 ±2.4 (noise) | −1.40 ±0.91 |

**Findings (planner):**
- **Most cells are at 90–100%, so the planner leaves little room to measure interactions.** Most results, including the control, are within noise.
- **The low-unlock redundancies replicate for the skilled player too.** Two low unlocks, or limiting pool A plus the 10s, are worth far less together than their separate effects. Once a skilled player has one, the other adds little.
- **The same pair flips sign with skill.** "Over 4000 double" alone helps the planner (92.0% → 99.0%) but wrecks the average player (53.8% → 10.0%). So limiting pool A, which switches the relic off, is a big synergy for the average player (+43 points) and an anti-synergy for the planner (−8.0 ±2.4). This matches P5c: the relic is a skill-expression pick.
- **None of the build-around pairs from P3c is a synergy for the planner either.** Rerolls with the 10s is slightly negative (−8.0 ±3.2); the rest are noise.
- **Overall for this pool:** the interactions that hold up in controlled tests are redundancies, plus "over 4000 double" rewarding skilled players and punishing others. No positive build-around synergy among these offers survived for either player. That may say more about this pool, and about players who can't draft for synergy, than about the game; new offers designed to combine would need their own tests.

## P4. Money as a real choice

### P4a. Money-seeking players

`research/sims/p4-money.mjs`. Both players draft well (P2a's table) at the chosen schedule and value money at μ energy per unit. Money is reported as its own output; nothing converts it back into power. Provisional rates: **5 per round won, 2 per leftover turn, 0.1 per overshoot point, 2 per Optimal play**. 600 average-player runs and 200 planner runs per μ.

| Player | μ | Win% | Money per run | Per cleared round: money, turns left, overshoot, Optimal plays |
|---|---|---|---|---|
| Average | 0 | 90.8 ±1.2 | 262.4 ±0.6 | 26.5, 5.17, 45.6, 3.29 |
| Average | 0.1 | 94.3 ±0.9 | 261.2 ±0.5 | 26.3, 5.14, 44.2, 3.29 |
| Average | 0.25 | 93.2 ±1.0 | 259.8 ±0.5 | 26.2, 5.17, 42.7, 3.28 |
| Average | 0.5 | 92.3 ±1.1 | 258.7 ±0.5 | 26.1, 5.17, 42.6, 3.23 |
| Average | 1 | 92.3 ±1.1 | 257.3 ±0.5 | 25.9, 5.19, 41.3, 3.21 |
| Average | 2 | 94.3 ±0.9 | 256.2 ±0.5 | 25.8, 5.21, 40.4, 3.16 |
| Planner | 0 | 98.5 ±0.9 | 236.6 ±0.7 | 23.7, 5.24, 20.6, 3.08 |
| Planner | 0.1 | 99.0 ±0.7 | 280.4 ±0.9 | 28.1, 4.83, 55.3, 3.94 |
| Planner | 0.25 | 98.5 ±0.9 | 281.1 ±0.8 | 28.1, 4.76, 56.6, 3.98 |
| Planner | 0.5 | 97.5 ±1.1 | 281.8 ±0.9 | 28.3, 4.79, 57.2, 3.98 |
| Planner | 1 | 97.5 ±1.1 | 285.9 ±1.0 | 28.7, 4.80, 60.3, 4.01 |
| Planner | 2 | 99.5 ±0.5 | 287.8 ±0.7 | 28.8, 4.72, 62.4, 4.06 |

**Findings:**
- **Round 1's "overshoot rewards weaker play" doesn't hold once players value money.** With μ = 0 the planner earns less than the average player (236.6 vs 262.4 per run) because it finishes rounds efficiently, which is round 1's pattern. At any μ from 0.1 up it earns the most: 280–288 per run, with bigger overshoots (55–62 per round) and more Optimal plays (3.9–4.1 vs 3.2–3.3).
- **At these rates, money is nearly free for a skilled player.** The planner's win rate stays at 97.5–99.5% for every μ, within noise of 98.5% at μ = 0, while its money jumps 19% at the smallest weight. So overshoot money at 0.1 per point rewards skill, but isn't yet a real trade-off; the price shows up only as fewer leftover turns (5.24 → 4.8). Energy margins weren't measured here.
- **The average player model can't chase money.** As μ rises its money slightly falls (262.4 → 256.2) and its win rate doesn't drop (90.8–94.3%). It looks one move ahead, so valuing money just makes it finish rounds sooner, shrinking its overshoot (45.6 → 40.4). This model can't show the trade-off for average players; that needs a player that plans a whole round.

### P4c. Raising the overshoot rate

The same script, with the overshoot rate raised from 0.1 to 0.25, 0.5, 1 and 2 money per point; the other rates stay at 5 per round won, 2 per leftover turn and 2 per Optimal play. Both players draft well at the chosen schedule. The planner values money at μ = 0.25 or 1, and the average player at 0 or 1. 600 average-player runs and 200 planner runs per cell. "Tightest round" is the least energy a winning run had left at any round end, median (10th percentile).

| Overshoot rate | Player, μ | Win% | Money per run | Overshoot per round | Tightest round |
|---|---|---|---|---|---|
| 0.25 | Average, 0 | 94.7 ±0.9 | 329 | 45.1 | 171 (113) |
| 0.25 | Average, 1 | 93.8 ±1.0 | 321 | 42.2 | 169 (111) |
| 0.25 | Planner, 0.25 | 98.0 ±1.0 | 373 | 60.7 | 197 (161) |
| 0.25 | Planner, 1 | 97.5 ±1.1 | 390 | 67.3 | 188 (150) |
| 0.5 | Average, 0 | 94.8 ±0.9 | 442 | 45.2 | 172 (119) |
| 0.5 | Average, 1 | 93.2 ±1.0 | 428 | 42.9 | 168 (119) |
| 0.5 | Planner, 0.25 | 98.0 ±1.0 | 533 | 62.9 | 194 (154) |
| 0.5 | Planner, 1 | 97.0 ±1.2 | 595 | 75.6 | 168 (118) |
| 1 | Average, 0 | 94.3 ±0.9 | 663 | 44.8 | 172 (108) |
| 1 | Average, 1 | 91.8 ±1.1 | 640 | 43.1 | 164 (100) |
| 1 | Planner, 0.25 | 99.0 ±0.7 | 909 | 69.2 | 187 (146) |
| 1 | Planner, 1 | 96.5 ±1.3 | 1,059 | 85.3 | 134 (68) |
| 2 | Average, 0 | 95.0 ±0.9 | 1,116 | 45.1 | 170 (119) |
| 2 | Average, 1 | 92.5 ±1.1 | 1,091 | 44.4 | 158 (95) |
| 2 | Planner, 0.25 | 98.5 ±0.9 | 1,751 | 77.0 | 169 (116) |
| 2 | Planner, 1 | **88.5 ±2.3** | 1,966 | 89.4 | **111 (38)** |

**Findings:**
- **Money's cost shows up first in energy margins, then in wins.** For a planner valuing money at μ = 1, the tightest round falls from a median of 188 to 168, 134 and 111 as the rate rises from 0.25 to 2 (10th percentile: 150 → 38). Its win rate holds at 96.5–97.5% through a rate of 1, then drops to 88.5% at 2.
- **A planner that values money less (μ = 0.25) keeps winning 98–99% at every rate,** and its margin only shrinks at 2 per point.
- **So overshoot money becomes a real choice at roughly 0.5–1 per point.** A skilled player can take noticeably more money by spending its energy buffer; at 2 per point, chasing money starts costing runs. At 0.1–0.25 per point it's nearly free. A spendable buffer also fits the "a little more forgiving" note: the buffer becomes something to trade.
- **Skilled players earn more money at every rate:** the planner earns 1.1–1.8× what the average player does.
- **The average player model still can't show the trade-off.** Valuing money slightly lowers its money and trims its margins, because it looks only one move ahead.
- **Scale:** money's worth (μ) is undefined until items and relics have prices. The rate only means something relative to the other sources. At 1 per point, overshoot supplies 45–85 of each round's money, against 5 for clearing the round, about 10 from leftover turns and about 7 from Optimal plays.
- **A correction to P4a:** its average player at μ = 0 (90.8%) was probably low by chance. P2c gives 93.2% and the four μ = 0 runs here give 94.3–95.0% for the same play. P4a's point stands: that player's win rate doesn't fall as μ rises.

**Not yet done:** P4b, trade-off curves by build.

## P5. High decades as a challenge

### P5a. Ascension-style modifiers

`research/sims/p5a-ascension.mjs`. The 80s, the 90s or both are in both pools from round 1, locked so "remove the highest decade" can't take them out. Both players draft well (P2a's table) with a pick after every round, at the chosen schedule. 600 average-player runs and 200 planner runs per level.

| Ascension level | Average drafting well | Planner drafting well | Average's deaths by round (9 / 10) |
|---|---|---|---|
| none | 94.3% ±0.9 | 98.5% ±0.9 | 0 / 6% |
| + the 80s | 88.8% ±1.3 (−5.5 ±1.6) | 97.0% ±1.2 (−1.5, noise) | 1 / 10% |
| + the 90s | 86.8% ±1.4 (−7.5 ±1.7) | 98.5% ±0.9 (0.0) | 1 / 12% |
| + the 80s and 90s | 75.2% ±1.8 (−19.2 ±2.0) | 92.5% ±1.9 (−6.0 ±2.1) | 5 / 19% |

**Findings:**
- **One high decade is a gentle ascension step:** about −5 to −8 points for an average player drafting well, and within noise for the planner.
- **Both high decades is a real step:** −19 points for the average player and −6 for the planner. A skilled player still wins 92.5%.
- **Losses stay late.** The extra deaths land in rounds 9 and 10, which fits the "late rounds test the build" schedule.
- **Drafting well absorbs most of the cost.** The same decades granted as a curse to a random build cost 19–22 points each (P5b). Picks like the low unlocks, taken all run, soften them a lot.
- **As an ascension ladder, this suggests three rungs:** the 80s, then the 90s, then both. The first two are nearly the same difficulty, so they could be one rung.

### P5b. Curses that come with a bonus

`research/sims/p5-grants.mjs`. After round 1, a run is granted a curse (the 80s or 90s added to both pools, locked so it can't be removed), optionally with an energy-regain bonus that multiplies the round-end refund. After that it drafts randomly from the P2 pool, as the plan's "random build" check calls for. Average player, 600 runs per cell (about ±2 points). Every cell spends round 1's pick on the grant, so the "none" cell has one pick fewer than a normal run. That's why its win rate (41–44%) is below P2c's random drafting (59%).

| Grant after round 1 | 80s | 90s |
|---|---|---|
| none | 44.0% | 41.0% |
| curse alone | 24.7% (−19.3) | 19.2% (−21.8) |
| curse + refund ×1.25 | 34.7% (−9.3) | 30.8% (−10.2) |
| curse + refund ×1.5 | 41.7% (−2.3, noise) | 38.0% (−3.0, noise) |
| curse + refund ×2 | 52.8% (+8.8) | 51.5% (+10.5) |
| curse + refund ×3 | 73.3% (+29.3) | 66.5% (+25.5) |
| refund ×1.5 alone | 58.8% (+14.8) | — |
| refund ×2 alone | 77.7% (+33.7) | — |

Changes are against the "none" cell in the same column, with errors of about ±2.7.

**Findings:**
- **A curse alone is a clear penalty for a random build:** −19 points for the 80s and −22 for the 90s. The gap between the two is within noise.
- **An energy-regain bonus of about ×1.5 on refunds makes taking the curse a close call** against taking nothing (−2 to −3 points, within noise). At ×2 the cursed offer becomes a good pick (+9 to +11).
- **The curse costs about the same whatever the bonus.** Compared with the same bonus alone, the 80s cost about 17 points with ×1.5 and 25 with ×2. So if the cursed offer sits next to ordinary upgrades, the close call is against their value, not against nothing. A plain refund ×1.5 relic (+14.8) would beat "80s + refund ×1.5" by about 17 points.
- **Not tested:** a cash bonus. Without a shop, money can't be weighed against energy (the user's decision on money); it can only be reported as its own output, as in P4.
- **The player caveat applies.** These are random builds with the average player; P5c tests whether builds holding high-product enablers want the curse.

### P5c. Enablers with high decades in play

`research/sims/p5-grants.mjs`. After round 1 a run gets the 80s and 90s as locked curses, optionally with an enabler: "products over 4000 score double", "factors of 70 or more cost 25% less", or both. Two references: no high decades, and "over 4000 double" without high decades. It then drafts well from the P2 pool. 600 average-player runs per cell (about ±2 points) and 200 planner runs per cell.

Every cell spends round 1's pick on the grant, so the no-grant reference (85.3%) is below P5a's 94.3%, which had all 9 picks.

| Cell | Average player | vs 80s + 90s alone | Planner | vs 80s + 90s alone |
|---|---|---|---|---|
| no high decades | 85.3% ±1.4 | — | 98.0% ±1.0 | — |
| 80s + 90s | 51.7% ±2.0 | — | 83.5% ±2.6 | — |
| 80s + 90s + over 4000 double | 23.8% ±1.7 | −27.9 ±2.6 | 99.0% ±0.7 | **+15.5 ±2.7** |
| 80s + 90s + 70s+ factors cheaper | 57.7% ±2.0 | +6.0 ±2.8 | 92.0% ±1.9 | +8.5 ±3.2 |
| 80s + 90s + both enablers | 44.0% ±2.0 | −7.7 ±2.8 | 100.0% | **+16.5 ±2.6** |
| over 4000 double, no high decades | 61.3% ±2.0 | (−24.0 vs no high decades) | 100.0% | (+2.0 ±1.0 vs no high decades) |

**Findings:**
- **For a skilled player, high decades plus "over 4000 double" is a winning build.** The 80s and 90s cost the planner 14.5 points (98.0% → 83.5%). Adding "over 4000 double" brings it back to 99.0%, and both enablers to 100%. The average player with the very same build falls to 23.8%.
- **This is the shape the 9/15 notes describe:** a curse plus an enabler that ruins players who chase big products without planning, and rewards players who plan around them. It's also polarizing enough (99–100% vs 24%) to be a trap for real players who aren't that skilled, which needs playtesting.
- **"70s+ factors cheaper" is a safer, weaker enabler.** It helps both players (+6 average, +8.5 planner) without the downside.
- **For the average player, high decades don't rescue "over 4000 double."** It costs 28 points with the 80s and 90s in play and 24 without. More big numbers just give this player more expensive products to chase.
- **Limits:**
  - The enablers were granted, not drafted, so this doesn't show whether a drafting player would pick them. The planner also still drafts by a solo-value table that doesn't value them.
  - Planner win rates near 100% can't show how much the curses add on top of "over 4000 double" (100% with or without them).
