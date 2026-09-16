# Simulation Plan: Upgrades Research Round 3

**Status (2026-09-15):** the harness changes, P2, P3, P4a, P4c and P5 are done; findings are in `feature-docs/upgrades-research-3.md`. P1 wasn't needed, because a schedule met the difficulty goals. P4b hasn't been run.

Draft, 2026-09-15, updated the same day with the user's answers. Responds to the user's notes of 2026-09-15 in `feature-docs/upgrades.txt` ("Notes on 9/15/2026 morning"), written after reading `upgrades-research.md` (round 1) and `upgrades-research-2.md` (round 2). Scripts live in `research/sims/`; see `research/README.md` for how to run them. This plan replaces the unfinished steps of `sim-plan-2.md` (S1d, S2d, S3d, S3e).

**Deliverable:** findings in `feature-docs/upgrades-research-3.md`, plus corrections to the round 1 and round 2 docs wherever this plan withdraws a conclusion. Still research only; no game code.

## Principles from the 9/15 notes

These change what the simulations are for, not just what they measure.

1. **Difficulty never responds to draft choices.** Targets follow a fixed schedule, and a good or lucky draft should make the run easier. This rules out everything in round 2 that tied targets to unlocks: the S3b–c headroom as a tuning rule, and every S3d prep option except a plain ramp.
2. **Lower early targets, super-linear later.** Late rounds should test the build the player drafted.
3. **Upgrades don't need individual balance.** A weak upgrade that becomes strong alongside others is a feature, and a challenge for skilled players. Solo values are still useful measurements, but they aren't tuning targets.
4. **Winning shouldn't take a solver and luck.** Round 2 measured how knife-edge the game is today: a ±3.5% target change swings the average player from 81% to 50%. The difficulty goals below are meant to fix that.
5. **High decades are a challenge to offer, not a penalty to avoid:** as curses that come with a bonus, as ascension-style difficulty modifiers, or alongside upgrades and relics that reward high products.
6. **Simulated players miss synergies, and synergy is what skilled roguelike players exploit.** Look for synergies at scale with random-drafting simulators, treat what they find as candidates for playtesting, and keep the player-model caveats in front.
7. **Money findings from money-blind players don't count.** The simulated players ignored money, so overshoot looked random. A real player chooses between plays that earn more money and plays that save energy.

## Decisions (2026-09-15)

- **Difficulty goals with drafting:** a skilled player (the planner) who drafts well wins easily, and an average player who drafts well wins **over 90%** of runs.
- **Start:** the 40–79 start with decade unlocks.
- **Picks:** one pick-one-of-three after every round won.
- **Target schedule** (chosen after P2): power, T(r) = 135 + 6.484375 × (r − 1)², giving 135, 141, 161, 193, 239, 297, 368, 453, 550, 660. Stored in `research/sims/round3-config.mjs`. The P2 follow-ups about skilled-player losses are noted in `upgrades-research-3.md` and not run for now.
- **Money:** tracked as its own weighted output of a player's performance, not converted into power through a shop. Revisit what money buys once items and relics are tuned.

## Re-examining earlier findings

| Finding | Where | What it rested on | Status | Next |
|---|---|---|---|---|
| Drafting difficulty: targets climb a linear +30 per round on top of today's +15 | Round 1 §4 | Linear ramp; value-table drafting; 10–99 start | Superseded (principle 2) | P2 |
| Single-upgrade values; recommended upgrade set and rarities | Round 1 §3, §5 | One upgrade granted after round 1 at today's targets, on 10–99; no synergy | Values stand as solo measurements on 10–99. Rarities withdrawn as a balancing result | P2a re-measures on 40–79 |
| Hold back guaranteed 10s, pool A limited to 10–49 and keep smallest as too strong | Round 1 §5 | Solo value at today's targets | Open: a harder late game may make them fine | P2, P3 pools |
| Overshoot money is noisy and rewards weaker play; leftover turns are a flat payment | Round 1 §6 | Players that ignore money | **Withdrawn** (principle 7) | P4 |
| "Products over 4000 score double" is a skill trap; "80s/90s cost less" is weak | Round 1 §6 | No builds that reward high products; players that don't change strategy | Open | P3, P5 |
| The "no 10s" risk-reward trades need a reward worth about 50 points | Round 1 §3 | Solo value | Open: may work as curses in the right build | P5 |
| Single-round energy by pool restriction and by digit pair | Round 1 §2, round 2 S1a | Board arithmetic | Stands | — |
| Pair win-rate values; don't offer the 28 pairs that aren't clearly helpful | Round 2 S1b | Solo grant after round 1 at today's targets, on 10–99 | Values stand. **"Don't offer" withdrawn** (principle 3) | P3 pool |
| Which pool loses which digit doesn't matter | Round 2 S1c | Symmetric pool rules | Stands | — |
| Guarantees too strong; only 90s ×0.5 lands in a "+8 to +15 per stack" range | Round 2 S2a–c | Individual balance target | Measurements stand. **The per-step target is withdrawn** | P3 pool |
| Odds chart data | Round 2 S2e | Exact calculation | Stands | — |
| 40–79 start retuned so runs with no upgrades win about 66% | Round 2 S3a | Calibrating on a run with no upgrades | Superseded: P2 calibrates on drafted runs | P2 |
| Unlock headroom values and unlock order | Round 2 S3b–c | Measured strength of each unlock | Stand as measurements. **"Targets must climb as unlocks arrive" withdrawn** | — |
| S3d target-scaling options | Round 2 S3d prep | Targets tied to unlocks | **Withdrawn** (principle 1); a plain ramp survives only as a shape | P2 |
| Constrained starts are knife-edge (40–79 about 1.5× as sensitive to targets as 10–99) | Round 2 S3a | Measurement | Stands; P2 tracks it | P2 |

## Harness changes

In `research/sims/`:
1. **Target schedules.** A `targets` config, either an array of 10 round targets or a function of the round. It has to reach the same three places `targetScale` does (the best-play call, the round-end check and overshoot). `targetExtra` and `targetScale` keep working.
2. **Per-run draft records.** Each run returns what was offered and what was picked each round, instead of pushing picks into a shared array.
3. **An offer pool for the 40–79 start** (`draft-pool-3.mjs`):
   - **Low decade unlocks:** the 10s, 20s and 30s.
   - **Round 1's upgrades, adapted to this start.** For example, "guaranteed 10s" is offered only once the 10s are unlocked (the guarantee code throws otherwise), and "remove a high decade" starts from the 70s.
   - **Later families:** the ones-digit pair family, the odds upgrades and relic-style effects, for P3.
   - **Held for P5:** the 80s and 90s as offers.
   - **Offer weights:** uniform at first, with configurable rarity weights.
4. **Money as an output.** Configurable rates per round cleared, per leftover turn, per overshoot point and per Optimal play, tracked per round and summarized next to win rate. No shop.
5. **Money-aware players.** The average player scores moves as points − λ × energy + μ × money earned; the planner keeps the finished round with the most energy + μ × money. μ = 0 must reproduce today's players exactly.
6. **Metrics** in `summarize`:
   - **Deaths by round** (already there).
   - **Luck losses:** how often the planner drafting well loses anyway, and in which rounds.
   - **Tightest round:** each winning run's lowest energy left at any round end.
   - **Target sensitivity:** the win-rate change when targets are scaled ×0.95 and ×1.05, from paired runs. A diagnostic for principle 4.
7. **Large random-draft runs.** Each process writes its run records to a JSON-lines file for a separate analysis script. `parallel.mjs` only merges summaries, so it can't do this.
8. **Checks.** `harness-selftest.mjs` covers target schedules, the adapted offer pool's eligibility rules and money accounting, and `baseline.mjs` still reproduces average ≈ 65–67% and planner ≈ 97–99%.

## P1. Forgiveness levers (only if P2 needs them)

Run only if no schedule in P2 meets the difficulty goals. Levers: max energy 240 and 280, 7 and 10 energy refunded per leftover turn. Each is re-run through P2's calibration so it's compared at the same difficulty, and judged on luck losses, tightest round and target sensitivity. 1,200 average runs and 300 planner runs per point.

## P2. Super-linear ramp with drafting, on the 40–79 start

**Question:** which target schedule makes the late rounds test the build while meeting the difficulty goals?

Schedule families, where T1 is the round 1 target (S3a's retune put it at 135):
- **Power:** T(r) = T1 + c × (r − 1)^p, with p = 1 (the linear reference), 1.5, 2 and 2.5
- **Geometric:** T(r) = T1 × g^(r − 1)

| Step | What | Size |
|---|---|---|
| P2a | Value table for this start: each offer in the pool granted after round 1, average player, at a provisional schedule (power, p = 1.5, T1 = 135). Calibrated so unlocking the 10s, the strongest single offer, wins about 50%; calibrating on runs with no picks would make every low unlock win every run, so they'd tie. Value is the change in mean rounds cleared, which has no ceiling. "Drafting well" in P2b means picking by this table | 600 runs per offer |
| P2b | For T1 = 90, 115 and 135 and each family, calibrate c (or g) so the average player drafting well wins about 92% | 400 runs per search point |
| P2c | At each calibrated schedule: planner drafting well; average player drafting well, randomly, worst-first and declining every offer; deaths by round; luck losses; tightest round; target sensitivity | 600 average runs per policy, 200 planner |

**Expectations to check:**
- The planner drafting well should be at or near 100%, and its rare losses should look like bad luck (offers or boards), not a steady trickle.
- Steeper schedules (higher p) move deaths into rounds 8–10 and cut early deaths.
- A lower T1 makes early rounds safe, but with a steep late ramp, declining offers should fail hard.
- The gap between drafting well and drafting randomly shows how much skill the draft carries. There's no goal for random drafting yet (see open questions).
- "Drafting well" still means a solo-value table, which ignores synergy. Re-check the chosen schedule with the P3 pool.

**Stop and ask** the user to choose a schedule before P3–P5. If no schedule meets the goals, run P1 first.

## P3. Random-draft synergy discovery

**Question:** which combinations are stronger, or weaker, than their parts?

| Step | What | Size |
|---|---|---|
| P3a | Pilot: time 1,000 random-draft runs with the full pool, to size P3b | 1,000 runs |
| P3b | Average player picking at random from the full pool, at the chosen schedule, writing run records | On the order of 100,000–200,000 runs across 6 processes |
| P3c | Analysis: each upgrade's main effect, then each pair's interaction (how runs holding both do vs a model with no interaction) | Analysis only |
| P3d | Confirm the 10 strongest positive and 5 strongest negative interactions in controlled runs: A alone, B alone and A + B, granted at matching rounds | 600 average and 200 planner runs per cell |

**Analysis rules:**
- **Survivorship.** Runs that die early make fewer picks. Compare the picks made by a landmark round (say round 5) against outcomes for runs still alive at that round, not whole-run pick lists.
- **Ceiling.** Use rounds survived and the tightest round as outcomes, not just win or loss.
- **Multiple comparisons.** There are hundreds of pairs. Find candidates on half the runs and confirm them on the other half before P3d.
- **A control.** The method must flag a known anti-synergy, such as removing a decade making an upgrade that only affects that decade worthless. If it can't see that, don't trust its positive findings.
- **Player caveat.** The average player's move choice does account for modified costs and points, but it never changes strategy for a build (for example, chasing products over 4000). Synergies that need a new strategy will be missed or understated. The planner runs in P3d catch some; playtests have to catch the rest.

## P4. Money as a real choice

**Question:** once players value money, does overshoot (and leftover-turn) money create a real trade-off against energy?

| Step | What | Size |
|---|---|---|
| P4a | μ = 0, 0.1, 0.25, 0.5, 1 and 2 for the average player and the planner, at the chosen schedule, drafting well: win rate and money earned per round and per run | 600 average and 200 planner runs per point |
| P4b | The trade-off curve for each player: how much win rate each extra unit of money costs. A real choice means a meaningful amount of money can be earned for a small loss in win rate, and that the curve differs by player and build | Analysis of P4a, plus builds from P3 |
| P4c | Candidate money rates (per round cleared, per leftover turn, per overshoot point, per Optimal play) that keep that choice meaningful | 600 average runs per candidate |

**Expectation to check:** round 1's "overshoot rewards weak play" was an artifact. With μ above 0, skilled players should earn more money than average players, not less.

## P5. High decades as a challenge

On the 40–79 start, the 80s and 90s are offers.

| Step | What | Size |
|---|---|---|
| P5a | Ascension-style modifiers (the 80s, the 90s, or both, added from the start) at the chosen schedule: how much each raises difficulty for average and planner players who draft well | 600 average and 200 planner runs per level |
| P5b | Curses with a bonus (cash, or an energy-regain passive): the bonus size at which taking the curse is a close call for a random build | 600 average runs per point |
| P5c | Enablers ("products over 4000 score double" or "cost half", "80s/90s cost less", and new high-product ideas): with high decades in play, do builds holding enablers win more, and does the curse become a good pick for them? | Controlled runs, plus P3's run records filtered to those builds |

## Order and acceptance

1. Harness changes 1–3, 6 and 8, then the baseline check.
2. **P2a–c.** **Stop and ask** for a schedule. Run P1 first if no schedule meets the goals.
3. Harness changes 4, 5 and 7, then **P3** and **P4** in parallel.
4. **P5.**
5. Write-up in `upgrades-research-3.md`, plus corrections to the round 1 and round 2 docs for every withdrawn conclusion above.

**Acceptance:**
- Every table states run counts and sampling error, and differences within about 2× the error are labelled as noise.
- No step adjusts targets in response to what a run drafted.
- A synergy is reported only after hold-out confirmation and a controlled A / B / A + B test, and always with the player-model caveat.
- Findings describe trade-offs and interactions; they don't rank upgrades for individual balance.
- **Stop and ask the user before** recommending a target schedule, money rates, or changes to shipped tuning.

## Still open

1. **A goal for random drafting.** Round 1 aimed for about 40–60%. With average players drafting well above 90%, a lower number may be fine; P2c will show what each schedule gives.
2. **What money buys.** Deferred until items and relics are tuned; P4 treats money as its own output until then.
