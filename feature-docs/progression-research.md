# Progression Mode Research

Research behind the tuning and best-play rules for the progression ("Start Run") mode described in `progression.txt`. All numbers come from Node simulations run on 2026-09-13. Sample sizes are noted with each result: runs for the run simulations, boards for the board statistics.

## Final choices

| Constant | Value |
|---|---|
| Rounds per run | 10 |
| Round target | `240 + 15 * (round - 1)`, so 240 → 375 |
| Max energy | 200; the run starts full, and energy carries across rounds |
| Leftover-turn refund | 5 energy per turn left when a round is won |
| Best-play bonus | `min(6, ceil(hi / 2))` |
| Best-play rule | Among moves scoring ≥ 20 points: `lo / scorePace − hi / energyPace` within 0.15 of the best, and not beaten outright by another open move |

Expected results with these values: skilled players win about 98%, and average players win about 55%.

---

## 1. Method

**Boards:** each pool holds 9 distinct integers from 10 to 99, the same as `generatePool`. A round allows at most 9 turns, and each turn uses one value from each pool.

**Simulated players.** A "cost weight" λ means the player scores each move as `lo − λ·hi`.
- **Careless:** always picks the highest lo and ignores energy cost (λ = 0).
- **Average:** picks one move at a time with λ = 1.5. If that fails to reach the target, it falls back to λ = 0.
- **Greedy skilled:** picks one move at a time. It replays each round with λ ∈ {0, 1, 2, 4, 8} and keeps whichever run spent the least net energy. Because it keeps the best result in hindsight, it's stronger than a real one-move-at-a-time player.
- **Planner:** searches ahead through the whole round. It keeps the 30 most promising partial rounds at each turn, for each of λ ∈ {0.5, 1.5, 3, 6}, and picks the finished round with the lowest net energy (spent − bonus − refund). It stands in for a strong human player who plans ahead within a round.

**Run loop:**
1. Each round, subtract the energy spent.
2. The run fails if the target isn't reached, or if energy drops below 0.
3. Otherwise, add the leftover-turn refund and best-play bonuses, capped at max energy.

## 2. Product distribution

**All 8,100 ordered pairs (a, b ∈ 10..99):**

| | Mean | p10 / p50 / p90 |
|---|---|---|
| hi (`floor(a·b / 100)`) | 29.2 | 6 / 24 / 61 |
| lo (`a·b % 100`) | 47.9 | — |

- P(lo = 0) = 3.7%, and P(lo ≥ 80) = 19.3%.
- **lo barely depends on hi**, so high-scoring moves are no more expensive on average. That's why efficient play pays off.

| hi band | Share of pairs | Mean lo |
|---|---|---|
| 1–9 | 18% | 49.5 |
| 10–19 | 24% | 48.1 |
| 20–39 | 30% | 47.5 |
| 40–98 | 28% | 47.2 |

**Per board (81 products, 5,000 boards):**

| Stat | Mean | p10 / p50 / p90 |
|---|---|---|
| Max lo | 97.5 | 96 / 98 / 99 |
| Min hi | 2.8 | 1 / 2 / 5 |
| Products with lo ≥ 80 | 15.6 | 11 / 15 / 20 |
| Products with lo ≥ 80 and hi ≤ 15 | 5.6 | 2 / 5 / 10 |
| Moves on the cost/points frontier (nothing costs less and scores more) | 3.8 | 2 / 4 / 6 |

## 3. Energy needed to reach a target in one round

3,000 boards per target. "Skilled" uses the best cost weight for each board.

| Target | Fixed λ = 2: mean energy (p90) | Skilled: mean energy (p90) | Turns left |
|---|---|---|---|
| 100 | 14 (23) | 12 (19) | 7.0 |
| 150 | 15 (24) | 12 (21) | 7.0 |
| 200 | 28 (44) | 24 (39) | 6.0 |
| 250 | 31 (52) | 28 (47) | 5.9 |
| 300 | 47 (73) | 42 (68) | 5.0 |
| 350 | 59 (96) | 53 (84) | 4.6 |
| 400 | 77 (118) | 71 (109) | 4.0 |
| 450 | 103 (157) | 93 (139) | 3.3 |

**Best reachable score in 9 turns** (share of boards where greedy play reaches the target):

| Target | 450 | 500 | 550 | 600 | 650 | 700 |
|---|---|---|---|---|---|---|
| Reached | 100% | 100% | 100% | 99% | 94% | 65% |

Takeaways:
- **Energy cost grows faster than the target:** doubling the target from 200 to 400 roughly triples the cost.
- **Classic is far too easy:** round 1 (target 130, budget 275) costs about 12 energy.

## 4. The spec's proposed comparator

The rule as written:
1. If `h1 < h2` and `l1 > l2`, the first move is better.
2. Otherwise, if `| |h1−h2| − budgetPace | >= | |l1−l2| − scorePace |`, the lower-hi move is better. If not, the higher-lo move is better.

Tested on 500 boards, with (scorePace, budgetPace) cycling through (14, 30), (30, 30), (50, 20) and (20, 60):

| Check | Result |
|---|---|
| Boards with a three-way cycle (A beats B, B beats C, C beats A) | **500 / 500** |
| Boards where no move beats every other | **425 / 500 (85%)** |
| Mean size of the unbeaten set | 0.15 moves |
| Trade-off pairs where the rule disagrees with a plain cost/points ratio (`hd/bp` vs `ld/sp`) | 57% |

Why it fails:
- **Cycles:** the comparison depends on how *far apart* two moves are, not on the moves themselves. Moves can't be ranked consistently, so "best plays" is usually empty.
- **The formula compares unrelated amounts:** it subtracts a pace (a per-turn amount) from a difference between two moves.

**Odd outcome** at pace (14, 30): (19, 30) beats (20, 60).
- hd = 1 and ld = 30, so `|1 − 30| = 29 ≥ |30 − 14| = 16`, and the lower-hi move wins.
- That gives up 30 points to save 1 energy.

## 5. Replacement comparators

Tested on live boards at every turn, with a mid-skill player (1,500 rounds, targets 250–490):
- `scorePace = (target − score) / turnsLeft`
- `energyPace = energy allowance / turnsLeft`

| Comparator | Mean set size | Empty set | Hit rate: careless / average / cost-aware | Mean cost of a best play (hi) | Mean lo of a best play |
|---|---|---|---|---|---|
| **Ratio within tolerance:** `lo/sp − hi/bp ≥ max − 0.15` | **1.3** | **0%** | 18% / 72% / 81% | 14.0 | 82.3 |
| Ratio top-3 | 3.0 | 0% | 28% / 89% / 91% | 16.2 | 79.0 |
| Frontier, and meets both paces | 1.1 | 38% | 4% / 33% / 49% | 4.9 | 70.6 |

**Recommendation: ratio within tolerance.**
- **Consistent:** it gives each move a single score, so moves always rank consistently and the set is never empty.
- **Respects rule 1:** a move that costs less and scores more always ranks higher.
- **Separates skill levels:** careless players rarely hit a best play; cost-aware players usually do.
- **Keeps the spec's idea:** it still weighs points against score pace and cost against energy pace.

**Top-3** rewards almost everyone, so it doesn't separate skill levels. **Frontier + pace** is empty on 38% of turns.

In the run mode, `energyPace = energy / roundsLeft / turnsLeft`, where `roundsLeft` includes the current round.

**Tolerance fix found during implementation:** the tolerance alone let a move that's beaten outright qualify. In 13 of 1,000 random board states, (4, 95) counted as a best play next to (4, 96). `getBestPlays` now also skips any move where another open move costs no more and scores no less. This can't empty the set, because the top-scoring move is never beaten outright. After the fix, 2,000 random states had 0 empty sets and 0 moves beaten outright, with a mean set size of 1.12.

**Minimum score for best plays.** When energy is scarce relative to the rounds left, a very cheap move with almost no points could qualify. For example, 10 × 10 = 100 (hi 1, lo 0) was a best play on a two-move board early in a run. An "Optimal!" tag on a 0-point move felt wrong, so best plays now need at least `BEST_PLAY_MIN_SCORE` points.

The minimum is applied **before** choosing the top move: "best" means best among moves that score enough. That way the set is empty only when no open move meets the minimum.

Before the minimum, best plays scored lo p1 = 4, p5 = 22, p10 = 38, median 80. 3.9% of best plays scored under 20, and 10.4% under 40.

Effect of each minimum (4,000 random mid-run board states):

| Minimum | No best play that turn | Mean set size | Sets that change | Mean lo / hi of best plays |
|---|---|---|---|---|
| 0 | 0.0% | 1.12 | — | 73.8 / 10.4 |
| 10 | 1.2% | 1.10 | 2.2% | 75.0 / 10.3 |
| **20** | **2.1%** | **1.09** | **4.3%** | **76.1 / 10.2** |
| 30 | 3.7% | 1.07 | 8.2% | 77.8 / 10.0 |
| 40 | 4.7% | 1.06 | 11.4% | 79.2 / 10.1 |
| 50 | 6.4% | 1.03 | 16.8% | 81.3 / 10.2 |

**20 was chosen.** It removes the near-zero-point best plays while changing only about 4% of sets, and it rarely leaves a turn with no best play.

## 6. Bonus schemes

8 rounds, targets start at 150 and grow 1.2× per round, max energy 250, 5 energy per leftover turn, 1,000 runs each.

| Scheme | Skilled win | Average win | Best-play rate (skilled) | Bonus as % of energy spent |
|---|---|---|---|---|
| None | 33% | 18% | 70% | 0% |
| Flat +4 | 59% | 41% | 83% | 25% |
| Flat +6 | 70% | 56% | 85% | 38% |
| Half cost `ceil(hi/2)` | 81% | 66% | 89% | 46% |
| **Half cost, cap 6** | **61%** | **46%** | 84% | 27% |

- **The spec's concern is real:** best plays happen on about 70–90% of turns, so any bonus is a large, frequent energy source.
- **A flat bonus can make a move free:** cheap best plays (hi 1–5) would gain energy overall, and the player would never be in danger.
- **Half cost, capped at 6, avoids that:** a best play always costs net energy, and the cap limits how much expensive best plays pay back. **Chosen.**

## 7. Target curve shape

**Exponential curves create a cliff.** With the setup from section 6, every death happened in rounds 7–8. Energy cost grows faster than the target, so early rounds barely touch the pool, and refunds above max energy are wasted.

**First sweep of exponential curves** (8 rounds, no best-play bonus, 600 runs):

| Starting target | Growth | Max energy | Refund per leftover turn | Skilled | Average | Careless |
|---|---|---|---|---|---|---|
| 200 | 1.12× | 250 | 5 | 82% | 60% | 0% |
| 150 | 1.18× | 250 | 5 | 83% | 61% | 0% |
| 200 | 1.15× | 300 | 10 | 82% | 62% | 0% |
| 200 | 1.12× | 300 | 5 | 94% | 81% | 0% |
| 150 | 1.15× | 250 | 5 | 100% | 97% | 0% |

**Straight-line curves** (8 rounds, half-cost-cap-6 bonus, 5 refund, 300 runs). Deaths are the % of runs lost in rounds 1–8.

| Start | Step | Max energy | Skilled win | Average win | Average deaths |
|---|---|---|---|---|---|
| 200 | +25 | 120 | 61% | 28% | 0/0/1/1/3/11/21/34 |
| 250 | +25 | 200 | 60% | 33% | 0/0/0/0/2/6/28/31 |
| 200 | +35 | 200 | 64% | 45% | 0/0/0/0/0/2/18/35 |
| 250 | +25 | 160 | 37% | 14% | 0/0/1/3/9/22/30/22 |
| 200 | +35 | 160 | 40% | 17% | 0/0/0/0/2/12/34/35 |
| 250 | +25 | 120 | 15% | 2% | 0/2/3/11/25/32/19/6 |
| 200 | +25 | 160 | 86% | 73% | 0/0/0/0/0/1/5/21 |
| 300 | +25 | 120 | 0% | 0% | 0/4/19/41/28/8/0/0 |

**Straight-line targets spread deaths across the middle and late rounds.** Every round after the first few drains the shared pool.

## 8. Skill-gap search

**Goal:** skilled players win almost always, and average players win less than half the time.

**Greedy players can't meet it.** A sweep of 8- and 10-round runs covered:
- Starting target 150 / 200 / 250
- Step +15 / +25 / +35
- Max energy 120 / 160 / 200 / 250
- Refund 0 / 5

No setting reached greedy skilled ≥ 88% with average ≤ 50%. The widest gaps:

| Rounds | Start | Step | Max energy | Refund | Greedy skilled | Average |
|---|---|---|---|---|---|---|
| 8 | 150 | +15 | 120 | 0 | 57% | 6% |
| 8 | 200 | +15 | 200 | 0 | 73% | 26% |
| 10 | 150 | +15 | 200 | 0 | 79% | 24% |
| 10 | 250 | +15 | 200 | 5 | 81% | 33% |

**The limit was the greedy model, not the game.** Picking one move at a time wastes pairings a planning player would save. Adding the planner player (150 runs each):

| Rounds | Start | Step | Max energy | Refund | Planner | Greedy skilled | Average |
|---|---|---|---|---|---|---|---|
| 8 | 150 | +15 | 120 | 0 | 80% | 55% | 6% |
| 8 | 200 | +15 | 200 | 0 | 87% | 78% | 26% |
| 8 | 250 | +15 | 120 | 5 | 81% | 65% | 29% |
| 8 | 200 | +25 | 160 | 5 | 97% | 87% | 73% |
| 8 | 200 | +25 | 120 | 5 | 83% | 58% | 37% |
| 8 | 150 | +25 | 160 | 0 | 70% | 45% | 7% |
| 10 | 150 | +15 | 200 | 0 | 95% | 78% | 28% |
| 10 | 250 | +15 | 200 | 5 | 94% | 63% | 42% |
| 10 | 150 | +25 | 250 | 0 | 81% | 47% | 11% |
| 10 | 200 | +15 | 250 | 0 | 76% | 59% | 7% |
| 10 | 150 | +15 | 160 | 0 | 70% | 30% | 1% |
| 10 | 200 | +15 | 200 | 5 | 100% | 100% | 94% |

Two candidate families meet the goal:
- **No refund:** 10 rounds, targets 150 +15/round, 200 max energy.
- **With refund:** 10 rounds, targets 250 +15/round, 200 max energy, 5 per leftover turn.

The second keeps the leftover-turn refund the spec asks for, so it was used as the base for fine-tuning.

## 9. Fine sweep of the starting target

10 rounds, +15 per round, 200 max energy, 5 refund, half-cost-cap-6 bonus, 400 runs each. Deaths are the % of runs lost in rounds 1–10.

| Start | Planner win | Planner deaths | Average win | Average deaths |
|---|---|---|---|---|
| 225 | 100% | — | 76% | median death round 10 |
| 230 | 99% | 0/0/0/0/0/0/0/0/0/1 | 74% | 0/0/0/0/0/0/2/4/7/14 |
| 235 | 99% | 0/0/0/0/0/0/0/0/0/1 | 66% | 0/0/0/0/0/0/2/5/10/18 |
| **240** | **98%** | 0/0/0/0/0/0/0/0/1/1 | **55%** | 0/0/0/0/0/1/4/7/12/21 |
| 245 | 94% | 0/0/0/0/0/0/0/0/1/5 | 44% | 0/0/0/0/0/2/4/10/20/22 |
| 250 | 93% | median death round 10 | 39% | median death round 9 |
| 275 | 74% | median death round 10 | 8% | median death round 8 |

Starting target 250 with 180 max energy gave 88% / 24%.

**Re-check with the shipped game logic** (the real `gameLogic.js` functions, bonuses applied after each move as the store does, and the "not beaten outright" rule; 200 runs):

| Player | Win | Deaths % by round 1–10 |
|---|---|---|
| Planner | 98% | 0/0/0/0/0/0/0/0/1/2 |
| Average | 60% | 0/0/0/0/0/1/3/8/10/19 |

The average player's 60% versus 55% in the sweep is within sampling error (about ±3.5% at 200 runs), so the tuning held up.

**Re-check after adding the 20-point minimum** (same setup, 200 runs):

| Player | Win | Deaths % by round 1–10 |
|---|---|---|
| Planner | 99% | 0/0/0/0/0/0/0/0/0/2 |
| Average | 65% | 0/0/0/0/0/2/3/5/10/17 |

Each run is within sampling error of the one before it (55% → 60% → 65%). All three estimates lean the same way, though, so the average player's true win rate at a starting target of 240 is probably around 60%. If that proves too easy in playtests, a starting target of 245 was about 11 points harder for the average player in the sweep.

**240 was chosen.** Skilled players almost always win, and the average player's 55% is just above the original "under half" goal. **245** (94% / 44%) is the next step up if playtests feel too easy.

## 10. Pace hints and energy par

**The old per-turn hints don't fit Run mode.** Replaying runs with the real game logic (300 average-player runs, 100 planner runs), and recording what the hints said before each move:

| Hint | Average player | Planner |
|---|---|---|
| "Need ~X pts/turn" hint vs pts scored per move | 22 vs 89; 100% of moves beat it | 24 vs 84; 100% beat it |
| "budget ~Y/turn" hint vs energy spent per move | 4.4 vs 12.9; 18% of moves within it | 6.9 vs 11.1; 30% within it |

Both hints assume all 9 turns get used, but rounds actually take 3–5 turns. The budget hint also ignores refunds and bonuses, and splits energy evenly across rounds even though later rounds cost about twice as much. At the start of a run it says about 2 energy per turn.

**Energy par candidates** (300 runs each, rounds the player cleared). Values are medians, with the middle half in brackets where measured.

| Round (target) | Planner gross spend | Average gross spend | Planner net use | Average net use |
|---|---|---|---|---|
| 1 (240) | 29 [25–34] | 27 [20–35] | 0 [0–0] | 0 [0–1] |
| 2 (255) | 30 [25–36] | 30 [21–40] | 0 [0–0] | 0 [0–3] |
| 3 (270) | 33 [27–43] | 35 [25–47] | 0 [0–0] | 3 [0–15] |
| 4 (285) | 34 [29–45] | 45 [33–59] | 0 [0–4] | 9 [0–24] |
| 5 (300) | 37 [30–47] | 46 [35–60] | 0 [−1–6] | 12 [2–25] |
| 6 (315) | 38 [30–50] | 44 [34–59] | 0 [−3–8] | 10 [1–24] |
| 7 (330) | 42 [33–57] | 46 [33–62] | 0 [−2–13] | 9 [−1–26] |
| 8 (345) | 43 [33–58] | 49 [37–69] | 7 [0–21] | 17 [3–34] |
| 9 (360) | 53 [41–70] | 59 [43–81] | 9 [0–22] | 20 [3–34] |
| 10 (375) | 56 [43–74] | 69 [56–82] | 18 [5–32] | 27 [13–42] |

"Net use" is energy at the start of the round minus energy at the end, so it counts bonuses and refunds.

Planner means per round:
- **Bonus:** grows from 5.7 to 17.7.
- **Refund:** stays between 21 and 24.5.

Findings:
- **Par depends on the run's state, not just the target.** A single-round planner at a fixed 120 energy with 5 rounds left spent less at the same targets: median 22 at 240 and 38 at 315. So par should be a per-round table taken from real runs, not a formula of the target.
- **Rounds 1–2 don't separate skill** under either measure. Both players refill to the 200 cap, and nobody dies early.
- **Gross spend can be tracked live** and separates players from round 4. But it undervalues finishing fast: the planner spends slightly *more* than the average player in round 1 in order to collect refunds.
- **Net use separates players from round 3,** but it's only meaningful once the round ends. The refund arrives on the winning move, so mid-round net always looks over par.

**Chosen: both, each where it works.**
- **During a round:** the hint shows gross spend against the planner's median spend, `[29, 30, 33, 34, 37, 38, 42, 43, 53, 56]`, and turns red over par.
- **When a round is won:** the popup shows net use against the planner's median net use, `[0, 0, 0, 0, 0, 0, 0, 7, 9, 18]`. That way a fast finish still gets credit.

Both tables live in `gameLogic.js` and must be regenerated whenever the run constants change.

## 11. Caveats

- **Simulated, not human, players.** The planner is a stand-in for strong play; a human "average" player may play better or worse than the one-move-at-a-time model with λ = 1.5.
- **Tuning is sensitive.** Each +5 on the starting target costs the average player roughly 10 points of win rate. All run constants sit together at the top of `src/store/gameLogic.js` for easy adjustment.
- **Sampling error:** about ±2.5% at 400 runs, and about ±4% at 150–300 runs.
- **Bonus timing differs slightly:** the simulations added bonuses at the end of each round, while the game adds them after each move. Re-check the tuning with the real game logic.
- **Future pool restrictions** (removing decades or ones digits, per `progression.txt`) will change the distributions above and need a fresh sweep.
