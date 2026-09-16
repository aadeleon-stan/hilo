# Simulation Plan: Upgrades Research Round 2

**Status (2026-09-15):** S1a–c, S2a–c, S2e and S3a–c are done (`feature-docs/upgrades-research-2.md`). The remaining steps (S1d, S2d, S3d, S3e) are replaced by `research/sim-plan-3.md`.

Plans the next simulations for the notes added to `feature-docs/upgrades.txt` on 2026-09-14 ("Updates after first research round"). Round 1 results are in `feature-docs/upgrades-research.md`. Scripts are in `research/sims/`; see `research/README.md` for how to run them.

**Deliverable when done:** add the findings to `feature-docs/upgrades-research.md` as new sections, or put them in `feature-docs/upgrades-research-2.md` if they grow large. Don't change game code; this is still research.

## The three new directions

1. **Two-ones-digit removals as a family of upgrades.** Each pair of removed digits is a separate upgrade, for variety. Explore giving each digit to a specific pool, so "remove 5 and 9" (5 from pool A, 9 from pool B) differs from "remove 9 and 5".
2. **Shifting the odds toward better numbers.** Upgrades that make good numbers more likely: a visible, dicebuilder-style chart of how likely each number is, and/or stackable "guarantee at least N numbers from 10–19 in pool A" upgrades.
3. **Starting with fewer decades and unlocking more.** For example, start with pools of 40–79 and have the player earn or buy the other decades, possibly as trade-offs like "unlock the 10s, but also the 90s". The starting game has a much smaller set of possible products.

## Preliminary numbers (already measured)

**Single-round cost by starting range.** Target 300, 9 turns, 1,200 boards per range, skilled one-move-at-a-time player using the best cost weight per board (same method as `single-round-restrictions.mjs`).

| Range | Values | Distinct products | Distinct low words | Energy to clear (mean) | Cheapest possible move | Cheap high-scoring moves per board (lo ≥ 80, hi ≤ 15) |
|---|---|---|---|---|---|---|
| 10–99 (today) | 90 | 2,621 | 100 | 41.9 | 1 | 5.6 |
| 20–59 | 40 | 683 | 100 | 34.0 | 4 | 9.6 |
| 30–69 | 40 | 720 | 98 | 62.0 | 9 | 3.1 |
| 40–79 | 40 | 748 | 100 | **99.7** | 16 | **0.0** |
| 50–89 | 40 | 767 | 100 | 147.1 | 25 | 0.0 |
| 60–99 | 40 | 768 | 100 | 193.9 | 36 | 0.0 |
| 10–49 | 40 | 620 | 100 | 13.8 | 1 | 15.2 |

What this means:
- **A 40–79 start makes a round cost about 2.4× as much energy,** and cheap high-scoring moves disappear entirely.
- **It can't use today's targets or energy.** It needs a retune before unlocks can be evaluated.
- **Your "much smaller set of possible products" is real:** about 3.5× fewer distinct products. But every low word from 00 to 99 is still reachable, so scoring variety survives.

**Round 1 results** these directions build on (`upgrades-research.md`):
- Removing one ones digit: within noise.
- Removing digits 5 and 7 from both pools: +9 win-rate points for the average player.
- Guaranteed 10s value per pool: +33, nearly always a win on its own.
- Pool A limited to 10–49: +33.
- Recommended drafting difficulty: targets climb an extra +30 per round (k = 30). There, the planner won 100%, and the average player won 88% drafting well and 38% drafting randomly.

## Harness changes needed first

In `research/sims/upgrade-sim.mjs`:

1. **Weighted draws.** Add `weightsA` / `weightsB`: a function from value to relative weight, or a 90-entry array, defaulting to uniform. `drawPool` samples without replacement, proportional to weight. **Assert:** drawn frequencies match the weights within sampling error on 100,000 draws.
2. **Per-pool range guarantees.** Replace the boolean `guaranteeTens` with `guaranteesA` / `guaranteesB`: lists of `{ min, max, count }` (e.g. `{ min: 10, max: 19, count: 2 }`). Map `guaranteeTens: true` to `{10, 19, 1}` in both pools, so the round 1 results stay reproducible. **Assert:** every generated pool meets its guarantees, and total guarantees never exceed the pool size.
3. **Target multiplier.** Add `targetScale` (default 1), so round targets are `(shipped + targetExtra) × targetScale`, for constrained starts that need much lower targets. It has to apply everywhere the target is used: the best-play call, the round-end check and the overshoot figure.
4. **Starting energy and range presets.** A `startConfig(range)` helper, e.g. `startConfig([40, 79])`.
5. **Parallel runs.** The harness is single-threaded, so run one process per core. Add a `SHARD` / `SHARDS` env pair (or a tiny launcher that spawns `SHARDS` child processes and merges the JSON they print) so a 6-core machine can run 6 at once. Each process peaks at about 120 MB.
6. **Unchanged:** `baseline.mjs` must still reproduce average ≈ 65–67% and planner ≈ 97–99% after these changes. Check this before trusting new results.

**Run-time reference** (Apple A18 Pro performance core): planner about 0.5 s per run, so 300 planner runs take about 2.5 minutes; average-player runs are much faster. A Ryzen 5 7600 has 6 full-speed cores and 12 threads, so plan on about 6–10 processes at once.

## S1. Ones-digit pair upgrades

**Questions:**
- How strong is each digit pair?
- How much do the pairs differ from each other (enough to give them different rarities)?
- Does which pool gets which digit matter?

| Step | What | Size | Players |
|---|---|---|---|
| S1a | Screen: single-round cost for all 45 unordered pairs removed from both pools, plus all 100 ordered (pool A digit, pool B digit) assignments, including the same digit in both | 1,000 boards per variant (~145 variants) | Single-round skilled |
| S1b | Full-run win-rate change, granted after round 1: the 5 strongest, 5 weakest and 5 median variants from S1a | 300 runs each | Average |
| S1c | Symmetry check: 3 digit pairs as (x in A, y in B) vs (y in A, x in B), 600 runs each | — | Average |
| S1d | Add the pair family to the drafting offer pool (each pair a separate offer, values from S1b), then re-run drafting at k = 25, 30, 35 | 200 runs per cell | Average (best / random / worst); planner best at k = 30 |

**Expectations to verify:**
- **Which pool gets which digit shouldn't matter by itself,** because the two pools follow identical rules. If S1c confirms this, "5 and 9" and "9 and 5" differ only in how they combine with pool-specific upgrades (like limiting pool A). In that case, recommend offering unordered pairs, or making the order meaningful through other pool-specific mechanics.
- **Pairs including 5 or 7** were the strongest single digits in round 1. Check whether pair values roughly add up or interact.

**Output:**
- a heat map of all 100 ordered pairs, ranked by energy saved
- win-rate changes for the selected pairs
- a proposed rarity split (for example, weakest third common, middle uncommon, strongest rare)
- whether the family adds drafting skill or just variety

## S2. Shifting the odds toward better numbers

**Questions:**
- How much win rate does each step of an odds-shifting upgrade add?
- Which step sizes keep the upgrade from being as dominant as a guaranteed 10s value per pool (+33)?

| Step | What | Size |
|---|---|---|
| S2a | "Guarantee at least N numbers from 10–19 in pool A" for N = 1, 2, 3, 4; also one-pool vs both-pools versions; granted after round 1 | 300 average-player runs each |
| S2b | Weight upgrades for 10s: ×1.5, ×2, ×3. For 90s: ×0.5, ×0.25. Then combined (10s ×2 with 90s ×0.5), one pool and both pools | 300 average-player runs each |
| S2c | Stacking: grant the same upgrade after rounds 1, 3, 5 and 7 (4 stacks), and record the win rate after each stack to get the marginal-value curve | 300 runs per stack level |
| S2d | Best step sizes (win-rate change of about +8 to +15 per stack, comparable to common or uncommon upgrades): add them to the drafting offer pool and re-run drafting at k = 25, 30, 35 | 200 runs per cell, plus planner best at k = 30 |
| S2e | Chart data: for each odds setting, the expected count of each decade in a 9-number pool, and the chance of at least one 10s value, so the UI can show a distribution chart | Exact calculation |

**Expectations to verify:**
- **Guarantees vs weights:** guarantees may be too strong at N ≥ 2 (round 1 showed one 10s value in both pools already gives +33). Weights spread the effect out, so they should be easier to tune.
- **Diminishing returns:** there should be clear diminishing returns once pools reliably contain a low value.

**Output:**
- a marginal-value table per stack
- recommended step sizes and rarities
- chart data
- a note on whether the chart makes the upgrade easier to understand, as a design question for the user

## S3. Constrained start with decade unlocks

**Questions:**
- What targets and energy make a constrained start playable?
- What is each unlock worth?
- Do paired trade-offs like "unlock 10s + 90s" create real choices?

| Step | What | Size |
|---|---|---|
| S3a | Retune: for starting ranges 40–79, 30–69 and 20–59 with no unlocks, sweep `targetScale` (and optionally max energy) until the planner wins ≈ 99% and the average player ≈ 65% (today's baseline difficulty) | Average: 200 runs per point; planner: 100 at the chosen point |
| S3b | At the retuned difficulty, grant each unlock after round 1: +30s, +20s, +10s, +80s, +90s, and the pairs +10s & +90s, +20s & +80s, +30s & +80s | 300 average-player runs each |
| S3c | Unlock order: fixed paths (low-first: 30s → 20s → 10s; high-first; alternating) granted after rounds 2, 4 and 6 | 300 runs per path |
| S3d | Drafting with unlocks in the offer pool alongside the round 1 upgrades. Find the k where random drafting lands near 40–60% and the planner, drafting well, stays ≥ 97% | Average 200 runs per cell; planner 100 at the chosen k |
| S3e | Board variety: distinct products, low-word entropy, and best-play set size / Optimal bonus per board, for each unlock state along the typical path | 4,000 boards per state |

**Expectations to verify:**
- **Low unlocks will be worth far more than high unlocks.** Round 1 found that removing the 10s costs about +53% energy. So "unlock 10s + 90s" is probably still a strong pick, and the 90s may need to cost more to make it a real trade-off.
- **A constrained start mostly delays the game's normal shape**, since unlocking the 10s–30s brings back cheap moves. Check whether the early game feels meaningfully different (S3e), not just harder.

**Output:**
- retuned targets per starting range
- unlock values
- trade-off pairs that are close calls
- recommended starting range and unlock set
- how the constrained start interacts with Optimal indicators and the smallest-number heuristic

## Order and acceptance

1. Harness changes 1–6, then the baseline check.
2. **S1a and S2e** first (fast, no full runs).
3. **S3a** next. Every other S3 step depends on its retuned targets.
4. **S1b–c and S2a–c** in parallel.
5. **S3b–c.**
6. **Drafting re-runs (S1d, S2d, S3d)** last, ideally with one combined offer pool as well as per-family pools.

**Acceptance:**
- Every table states run counts and approximate sampling error.
- Differences within about 2× the error are labelled as noise.
- Every recommended upgrade has a measured win-rate change from full runs, not just single-round cost.
- **Stop and ask the user before** changing the recommended k (currently 30), adopting a constrained start, or proposing changes to shipped tuning.
