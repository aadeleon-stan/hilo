# Roguelike Upgrades Research

Research for `upgrades.txt`: end-of-round upgrades (studied in depth), plus a first pass on money, shop items and relics. **Nothing here is implemented.** All numbers come from simulations run on 2026-09-14 against the shipped Run-mode rules in `src/store/gameLogic.js`:
- 10 rounds, targets 240 + 15 per round
- 200 max energy, 5 energy back per leftover turn
- the current best-play rule and Optimal bonus

Baselines, methods and player models build on `progression-research.md`.

## Summary

- **Upgrades are very strong relative to the current tuning.** A single good upgrade taken after round 1 lifts the average player from about 67% to 85–100% wins. With a pick after every round, any drafting at all makes runs unlosable at today's targets.
- **Your decade idea works, in one direction only.**
  - **High decade removed** (70s, 80s or 90s): the best "remove numbers" upgrade, about +24–28 win-rate points.
  - **10s or 20s removed:** makes rounds much harder (+53% and +29% energy). That's a penalty, not an upgrade.
- **Ones-digit removal is weak.** One digit is within noise; removing two (5 and 7) adds at most about +9 points.
- **Drafting creates real skill expression.** With targets climbing an extra 25–30 per round:

  | Picking strategy | Average-player win |
  |---|---|
  | Highest measured value | 88–98% |
  | Random | 38–64% |
  | Lowest value | ≈ 0–8% |

- **Recommended difficulty for a first prototype:** targets climb an extra **+30 per round** on top of today's step. At that level:
  - **Skilled player (planner) drafting well:** won 100 of 100 runs.
  - **Average player drafting well:** 88%.
  - **Average player drafting randomly:** 38%.
- **Economy:** leftover turns and overshoot are poor money sources.
  - **Leftover turns** are nearly the same for every player (about 5.1 per round), so they're effectively a flat payment.
  - **Overshoot** is noisy and rewards weaker play: the average player overshoots about 40 per round, the planner about 16.

  Tie money to clearing rounds and to Optimal plays instead.
- **Relic flags:**
  - **"Products over 4000 score double"** is a skill trap: planner 100% wins, average player 0%.
  - **"80s/90s cost less"** is weak.
  - **+40% refund and +40 max energy** are as strong as the best upgrades.

---

## 1. Method

**Simulation harness.** `research/sims/upgrade-sim.mjs` (every experiment in this doc has a runner script next to it; see `research/README.md`) mirrors `useGameStore.confirmSelection`:
1. Best plays are judged before the move, using the shipped `getBestPlays`.
2. The move's energy cost is paid and the round-end check runs.
3. Then the Optimal bonus and leftover-turn refund are added, capped at max energy.

These pieces are configurable so upgrades can be modeled:
- **Pools:** the allowed values for each pool, pool size, repeats, a guaranteed 10s value, and one reroll of the board's largest number before each round.
- **Carryover:** each pool's smallest number carried into the next round.
- **Energy rules:** max energy, the refund per turn and a refund multiplier, and the bonus cap.
- **Scoring:** energy and points modifiers for relic effects.
- **Difficulty:** an extra amount added to targets.
- **Upgrades:** a hook after each round won that can apply one.

**Player models** (same as `progression-research.md` §1):
- **Average:** one move at a time, scoring moves as points − 1.5 × energy. Fast, so it's used for the broad sweeps.
- **Planner:** searches ahead through each whole round and keeps the plan that ends with the most energy. Stands in for a strong player. Slow, so it's used only for confirmations.

**Harness validation** (no upgrades):

| Player | Harness | Known | Notes |
|---|---|---|---|
| Average | 66.7% ±2.7 | ≈ 65% | — |
| Planner | 97.3% ±0.9 | ≈ 99% | Medians of energy spent and net energy per round match the shipped par tables within noise |

**Sampling error:** 300 runs per cell gives about ±2.7 points near 65% and less near the extremes; 200 runs gives about ±3.4. Differences smaller than about 2× the error are marked as noise.

**Limitations:**
- **Upgrade picking** uses a fixed value table (§3), not choices that react to the run so far.
- **Relic energy and points modifiers** don't feed into the best-play check, which still uses raw products.
- **Items** are valued on single rounds with a simpler one-move-at-a-time skilled player (§6).

## 2. Pool restrictions (`progression.txt` idea)

### Single-round cost
Skilled one-move-at-a-time player, target 300, 9 turns, 1,500 boards per restriction. The restriction applies to both pools.

| Restriction | Energy to clear the round | Change | Cheap high-scoring moves per board (lo ≥ 80, hi ≤ 15) |
|---|---|---|---|
| None | 42.2 | — | 5.5 |
| No 10s | 64.4 | **+53%** | 2.9 |
| No 20s | 54.5 | +29% | 4.6 |
| No 30s | 45.9 | +9% | 5.3 |
| No 40s | 40.6 | −4% | 5.7 |
| No 50s | 37.4 | −11% | 6.2 |
| No 60s | 35.8 | −15% | 6.3 |
| No 70s | 34.5 | −18% | 6.6 |
| No 80s | 34.9 | −17% | 6.6 |
| No 90s | 34.9 | −17% | 6.5 |
| No single ones digit | 40.4–42.7 | −4% to +1% | 5.4–6.0 |

The best single digits to remove are 5 and 7 (−4%).

**Why:**
- **Energy cost** (the high word) grows with both numbers, so low numbers make moves cheap.
- **Points** (the low word) are essentially random with respect to cost (`progression-research.md` §2).
- **So removing large numbers** leaves cheaper moves with the same scoring potential. Removing small numbers takes away the cheap moves the whole game relies on, including the smallest-number shortcut (`progression-research.md` §11).

### Full-run effect
Average player, 300 runs per cell. "After round 1" and "after round 5" are when the upgrade is granted; it lasts the rest of the run. Baseline: 66.7% ±2.7.

| Upgrade | After round 1 | After round 5 |
|---|---|---|
| No 80s (both pools) | 94.7% (+28) | 86.0% (+19) |
| No 90s (both pools) | 93.3% (+27) | 90.0% (+23) |
| No 70s (both pools) | 90.7% (+24) | 89.0% (+22) |
| No 90s (one pool) | 84.0% (+17) | 76.7% (+10) |
| No ones digits 5 and 7 | 76.0% (+9) | 70.0% (+3, noise) |
| No ones digit 5 | 66.0% (−1, noise) | 72.7% (+6, noise) |

## 3. Single-upgrade sweep

Average player, 300 runs per cell, baseline 66.7% ±2.7. The value column is the win-rate change when granted after round 1. The drafting simulations (§4) use it as the "measured value".

| Group | Upgrade | After round 1 | After round 5 | Value |
|---|---|---|---|---|
| Pool composition | Pool A limited to 10–49 | 100.0% | 99.3% | +33 |
| Pool composition | Guaranteed 10s value per pool | 99.7% | 95.0% | +33 |
| Control | Keep smallest number into next round | 99.7% | 90.7% | +33 |
| Pool composition | +1 number per pool (10 turns) | 96.3% | 91.0% | +30 |
| Remove numbers | No 80s / 90s / 70s (both pools) | 90.7–94.7% | 86.0–90.0% | +24 to +28 |
| Relic-style | +40% round-end refund | 91.0% | 82.7% | +24 |
| Relic-style | Squares (a × a) cost 0 | 85.3% | 79.7% | +19 |
| Relic-style | +40 max energy | 83.7% | 86.0% | +17 |
| Remove numbers | No 90s (one pool) | 84.0% | 76.7% | +17 |
| Control | Reroll the board's largest number once per round | 80.7% | 77.0% | +14 |
| Relic-style | Optimal bonus cap 10 | 80.0% | 73.3% | +13 |
| Relic-style | 80s/90s numbers cost 25% less | 75.0% | 70.7% | +8 |
| Remove numbers | No ones digits 5 and 7 | 76.0% | 70.0% | +9 |
| Remove numbers | No ones digit 5 | 66.0% | 72.7% | ≈ 0 |
| Pool composition | Repeated values allowed | 60.0% | 63.0% | **−7** (a penalty) |
| Risk-reward | No 10s + 60 max energy | **10.0%** | 36.3% | **−57** |
| Risk-reward | No 10s + 3 refund per turn | **20.3%** | 25.7% | **−46** |
| Relic-style | Products over 4000 score double | **0.0%** | 0.7% | **−67** for this player (see §6) |

Takeaways:
- **Earlier is better** for almost every upgrade, since it applies to more rounds. The notable exception is +40 max energy, which is equally good late, when energy is actually scarce.
- **Four upgrades alone make the average player nearly unbeatable:** pool A limited to 10–49, guaranteed 10s, keep smallest and +1 number. Offer them as rare, or weaken them. For example, +1 number could apply to one pool only.
- **The "no 10s" risk-reward trades need a much bigger reward.** Losing the 10s costs roughly 50 win-rate points. As designed they're simply bad picks.
- **Repeated values allowed hurts** (fewer distinct products), so drop it.

### Effect on best plays and the smallest-number shortcut
4,000 random mid-round board states per variant, using the shipped `getBestPlays`:

| Variant | Best plays per turn | Optimal bonus per best play | Best plays include the smallest open number |
|---|---|---|---|
| None | 1.95 | 3.61 | 83% |
| No 90s (both pools) | 2.11 | 3.37 | 82% |
| Guaranteed 10s per pool | 1.95 | 3.51 | 83% |
| +1 number per pool | 1.97 | 3.51 | 82% |
| Pool A limited to 10–49 | 2.33 | 2.89 | 75% |

Most pool upgrades leave best plays and the shortcut unchanged. Limiting pool A lowers the average Optimal bonus (every move is cheaper) and weakens the shortcut.

## 4. Pick-one-of-three drafting

**Setup:**
- **Offers:** after every round won, 3 random eligible upgrades from a stackable pool.
- **Pool contents:** remove the highest remaining decade (90s → 80s → 70s); remove digit 5; remove digit 7; +1 number per pool (up to 11); guaranteed 10s; pool A limited to 10–49; keep smallest; +1 reroll (up to 3); +40 max energy; +40% refund; +4 bonus cap; squares free.
- **Excluded:** repeats, the no-10s trades, and double over 4000.
- **Picking strategies** use the §3 value table: take the highest value, a random one, the lowest value, or decline every offer.
- **Difficulty:** round *r* has target = shipped target + k × (*r* − 1).

Average player, 200 runs per cell:

| k (extra target per round) | Highest value | Random | Lowest value | Decline |
|---|---|---|---|---|
| 0 | 100.0% | 100.0% | 100.0% | 67.0% |
| 20 | 99.0% | 82.5% | 24.5% | 0.0% |
| **25** | **97.5%** | **64.0%** | **7.5%** | 0.0% |
| **30** | **88.0%** | **38.0%** | **0.5%** | 0.0% |
| 35 | 67.0% | 21.0% | 0.5% | 0.0% |
| 40 | 43.5% | 6.5% | 0.0% | 0.0% |
| 60, 80 | 0% | 0% | 0% | 0% |

Takeaways:
- **At today's targets (k = 0), drafting trivializes runs.** The whole difficulty curve must rise once upgrades exist.
- **At k = 25–30, the choice itself is a big skill check.** Highest-value picking beats random by 34–50 points and lowest-value picking by about 88–90 points. That's the "core skill expression" `upgrades.txt` hopes for.
- **Declining every offer is never viable** from k = 20 up, so upgrades become part of the baseline power budget rather than a bonus.

### Skilled players (planner) with drafting
**Planner without upgrades, targets raised by a flat amount every round:**

| Extra target (all rounds) | Planner win |
|---|---|
| +0 | 97.3% ±0.9 (300 runs) |
| +40 | 78.0% ±4.1 (100 runs) |
| +70 | 21.0% ±4.1 (100 runs) |
| +100 | 4.0% ±2.0 (100 runs) |

**Planner with highest-value picking** (100 runs each):

| k | Planner win | Deaths |
|---|---|---|
| **30** | **100%** | 0 of 100 |
| 40 | 97.0% ±1.7 | 3 of 100, all in round 10 |

At k = 40 the planner still almost always wins. But average players drop to 43.5% drafting well and 6.5% drafting randomly, which is too punishing. **k = 30 is the better starting point.** k = 35 (average player: 67% drafting well, 21% randomly) is the next step up if playtests feel too easy.

**What the planner picked at k = 30** (900 picks):

| Upgrade | Picks |
|---|---|
| +40% refund | 177 |
| +1 number per pool | 169 |
| Keep smallest | 97 |
| Guaranteed 10s | 97 |
| Pool A limited to 10–49 | 92 |
| +40 max energy | 86 |
| Squares free | 76 |
| Remove high decade | 49 |
| +1 reroll | 44 |
| +4 bonus cap | 13 |

Stackable picks dominate once the one-time upgrades are taken.

**At k = 30 the difficulty goal is met:**
- **Skilled player who drafts well:** 100% wins.
- **Average player who drafts well:** 88%.
- **Average player who drafts randomly:** 38%.

For comparison, without upgrades the planner already drops to 78% at a flat +40. So at a challenging difficulty, upgrades carry skilled players rather than being optional.

## 5. Recommended first upgrade set

Aim for a pool of 8 upgrades with rarities, so the three offers vary in strength and the choice matters. "Value" is the §3 win-rate change.

| Rarity | Upgrade | Value | Notes |
|---|---|---|---|
| Common | Remove ones digits 5 and 7 | +9 | Weak alone; good filler. Could stack into "remove any two digits". |
| Common | Optimal bonus cap +4 | +13 | Rewards best plays; stacks. |
| Common | Reroll the board's largest number once per round | +14 | A control upgrade that asks the player to think; stacks to 3. |
| Uncommon | +40 max energy | +17 | Equally strong early or late; a safe pick. |
| Uncommon | Remove the 90s from one pool | +17 | Half-strength version of the decade upgrade. |
| Uncommon | +40% round-end refund | +24 | Strongest early; some is lost to the energy cap. |
| Rare | Remove a high decade (both pools; 90s → 80s → 70s) | +24 to +28 | The `progression.txt` idea in its useful direction. |
| Rare | +1 number per pool | +30 | Also adds a turn; consider one pool only. |

**Held back for now** (too strong, or needs more design):
- **Guaranteed 10s per pool, pool A limited to 10–49, keep smallest:** each lifts the average player to about 100% on its own. They could work as legendary-tier picks at higher difficulty, or in weaker forms such as guaranteeing a 10s value in one pool only.
- **Squares free:** +19, but it's all-or-nothing (it only fires when both pools share a number, on 63% of boards) and hard to read. Better as a relic.
- **Risk-reward "no 10s" trades:** need a reward worth about 50 win-rate points before they're a real choice.

**Open questions:**
- **Timing:** should offers appear after every round, or every other round? Fewer picks would need a smaller target increase.
- **Choosing values:** should "remove a decade" let the player choose which decade? The data says players should always take the highest one, so a choice adds little.
- **Offer rules:** do offers need a guaranteed common option, so a bad offer isn't a dead end?

## 6. Money, items and relics (first pass)

### Money sources
Average player, 400 runs.

| Round | Leftover turns: mean (p10/p50/p90) | Overshoot: mean (p10/p50/p90) |
|---|---|---|
| 1 | 5.99 (6/6/6) | 29.6 (13/30/45) |
| 2 | 5.88 (5/6/6) | 24.6 (6/20/60) |
| 3 | 5.56 (5/6/6) | 35.9 (2/15/82) |
| 4 | 5.11 (5/5/6) | 60.0 (7/66/84) |
| 5 | 5.00 (5/5/5) | 53.6 (32/55/74) |
| 6 | 4.97 (5/5/5) | 40.4 (18/40/60) |
| 7 | 4.93 (5/5/5) | 29.0 (8/27/48) |
| 8 | 4.75 (4/5/5) | 29.5 (4/21/71) |
| 9 | 4.44 (4/4/5) | 40.7 (4/42/82) |
| 10 | 4.08 (4/4/4) | 53.1 (14/58/81) |

Running totals at the proposed shop points (runs that reached them):

| After round | Leftover turns total, median (p10–p90) | Overshoot total, median (p10–p90) |
|---|---|---|
| 3 | 17 (17–18) | 81 (41–145) |
| 6 | 33 (32–33) | 244 (172–316) |
| 9 | 47 (46–48) | 340 (248–420) |

Findings:
- **Leftover turns barely vary** (p10 ≈ p90), and skill doesn't change them: planner 5.13 per round, average 5.11. Paying per leftover turn is effectively a flat payment.
- **Overshoot is noisy and rewards weaker play.** Average players overshoot by 40 per round, the planner by 16, because the planner finishes rounds efficiently instead of piling on points. Paying for overshoot would reward the wrong behavior.

**Recommendation:** pay a flat amount per round cleared, plus a small amount per Optimal play. The planner earns 13.8 bonus energy per round against the average player's 11.3, so Optimal plays do track skill. Drop overshoot, or cap it low.

A starting point to playtest: **5 per round cleared + 2 per Optimal play**, which comes to roughly 25–35 money per three rounds.

### Shop items: energy equivalents
Single round at target 300, fresh boards, skilled one-move-at-a-time player; 2,000 boards. Energy equivalent = energy saved + 5 per turn saved (the refund that turn would earn). A typical round costs 42 energy and 4 turns.

| Item | Energy equivalent | Suggested tier |
|---|---|---|
| Board refresh (used on a bad board, worst quarter) | 26.1 | Expensive |
| Double points on the next move | 23.7 | Expensive |
| Reroll one pool (used on a bad board) | 22.1 (6.0 if used on any board) | Medium |
| Next move costs no energy (used on the priciest move) | 17.9 | Medium |
| Best digit swap (XY → YX) | 10.7 | Cheap |
| Next move costs half energy | 8.7 | Cheap |

Not simulated:
- **Revive a factor:** situational.
- **Shopping app:** meta-economy.

Findings:
- **Double points beats a free move,** because it usually saves a whole turn.
- **Rerolls and refreshes are only strong when saved for bad boards,** which is a nice skill test.

**Suggested prices** (with the money above): cheap 10, medium 20, expensive 30. The first shop then buys about one medium item.

### Relics

| Relic | Measured | Assessment |
|---|---|---|
| +40% round-end refund | +24 (after round 1) | As strong as rare upgrades; early rounds lose some to the energy cap |
| +40 max energy | +17 / +19 | Strong at any point in the run |
| Squares (a × a) cost 0 | +19 | Fires only when both pools share a number (63% of boards, about 0.9 shared numbers per board); swingy |
| Optimal bonus cap raised to 10 | +13 | Moderate; rewards skilled play |
| 80s/90s factors cost 25% less | +8 | Weak; players mostly avoid high factors anyway |
| Products over 4000 score double | Average player 0%; planner 100% wins, with slightly lower spend (41.2 vs 43.3 per round) | **Skill trap.** Every product over 4000 costs at least 40 energy. It's fine for players who ignore it, and ruinous for players who chase big numbers. Rework it (e.g. "over 4000 costs half") or drop it. |
| Extra money per round, bigger inventory, cheaper shops | — | Economy relics; need the money design first |

Board frequencies:
- **Products over 4000:** every board has some, 22.7 of 81 on average.
- **Perfect-square products:** about 1.95 per board, counting coincidences like 18 × 50 = 900.
- **80s/90s:** about 2 per pool.

**Overlap:** most relic effects equal a mid-to-strong upgrade (+13 to +24). If relics come from shops and upgrades come every round, the power budget stacks. Relics probably need to be about half the strength of an upgrade, or else replace upgrade picks on shop rounds.

## 7. Rebalancing implications

- **Targets must rise.** With a pick after every round, the extra target per round should be about +25 to +30 on top of today's +15, so roughly +40 to +45 per round total, to keep random drafters near half. This depends on the upgrade pool and rarities, so re-run §4 after they're set.
- **Energy par** (`progression-research.md` §10) assumes no upgrades. With drafting, par would depend on the player's build. Options:
  - compute par for the median build
  - base par only on the player's current config
  - drop live par during upgrade runs
- **Best plays** barely change under most pool upgrades (§3). Limiting pool A lowers the Optimal bonus by about 20%.
- **The smallest-number shortcut** survives most upgrades. It weakens only where upgrades change which numbers are cheap (limiting pool A; removing 10s would break it).
- **Daily mode** (`daily.txt`) would need its own fixed or no-upgrade rules, since drafting adds a lot of variance to difficulty.

## 8. Caveats

- **Simulated players aren't people.** The average model is greedy and doesn't adapt to upgrades, which exaggerates effects like the "over 4000" trap. The planner is strong but not optimal.
- **Drafting uses a fixed value table** and ignores synergies. For example, removing the 90s makes "80s/90s cost less" worthless. A human who drafts for synergy would do better than "highest value".
- **Items were valued on single rounds** with a different, simpler skilled-player model than the run harness. Treat those figures as relative, not absolute.
- **Everything here needs playtesting.** In particular, the target increase and the upgrade rarities should be tuned against real players once a prototype exists.
