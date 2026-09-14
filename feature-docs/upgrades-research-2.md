# Roguelike Upgrades Research, Round 2

Continues `upgrades-research.md` for the three directions added to `upgrades.txt` on 2026-09-14: ones-digit pair upgrades, odds-shifting upgrades, and a constrained start with decade unlocks. Plan and step numbering (S1/S2/S3) are in `research/sim-plan-2.md`; read that first for what each step is for and the expectations being checked. **Nothing here is implemented** — this is still research only.

## 0. Harness changes

Before any of this, `research/sims/upgrade-sim.mjs` needed: weighted draws (`weightsA`/`weightsB`), per-pool range guarantees (`guaranteesA`/`guaranteesB`), a `targetScale` multiplier, `startConfig(range)` presets, and multi-core sharding (`runShardAware` + `research/sims/parallel.mjs`). Done and validated: `research/sims/harness-selftest.mjs` passes (weighted-draw frequencies, guarantee enforcement, `startConfig`), and `baseline.mjs` still reproduces the original win rates (average 66.0% ±2.7 / planner 99.0% ±0.6 on 300 runs, both within noise of the round-1 numbers).

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
- **Round 1 undersold this family.** Round 1 measured single digits 5 and 7 as strongest; at N=20,000 the strongest *pairs* are combinations of 5–9, and **8 & 9** and **5/6/7 & 8** edge out **5 & 7** slightly (4.3–4.8% vs 3.8%). High ones digits (5-9) still dominate the top of the list, but 5 and 7 aren't uniquely special — this is a family effect from removing two high digits, not from those two particular values.
- **Low digits (0-4) are a straight penalty when paired with each other.** Every low-low pair costs more energy than baseline; the worst three (1&2, 1&3, 0&1) cost 4.7-5.2% more. This mirrors round 1's decade finding (removing the 10s costs energy) at ones-digit scale: 0-4 disproportionately supply cheap, useful moves.
- **A clean rarity split by both-pools value:** roughly a third of pairs (mostly high-high, ~15 pairs, 1.2-4.8% saved) look like real, positive upgrades; another third (mostly high-low mixes) are noise; the bottom third (low-low pairs) actively hurt and shouldn't be offered as upgrades at all — or would need reframing as a real trade-off (e.g. paired with a compensating buff) if offered.
- **Ordered (per-pool) assignments follow the same pattern** as the both-pools case — high digit removed from either pool helps, low digit removed from either pool hurts — with rough symmetry between (dA, dB) and (dB, dA) in the heat map (e.g. A:8,B:9 saved 3.3%, A:9,B:8 saved 2.6%, both far from the low-digit cells). This is consistent with the plan's expectation that pool assignment shouldn't matter on its own; S1c should confirm this formally with matched-pair runs rather than reading it off two single cells.

**Not yet done:** S1b (full-run win-rate change for a sample of strong/weak/median pairs), S1c (formal symmetry check), S1d (drafting re-run with the pair family added).

## S2. Shifting the odds toward better numbers

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

Marginal step size on P(≥1 ten) as 10s weight climbs: baseline→×1.5 is +13.1pp, ×1.5→×2 is +7.6pp, ×2→×3 is +7.2pp. This is diminishing, but slowly — it doesn't level off hard until weight is high enough to push P(≥1 ten) into the 90s (consistent with the plan's expectation of diminishing returns, but the useful stacking range looks wider than three steps).

**Findings:**
- **Weighting 90s down barely moves the needle on its own** (90s ×0.25 only lifts P(≥1 ten) by 3.5pp) — its main effect is just fewer 90s (as designed), not more 10s. If the goal is "shift toward better numbers," weighting the 10s up directly is far more effective per step than weighting the 90s down.
- **The combined setting (10s ×2 + 90s ×0.5) doesn't stack additively** on E[10s]: 1.827 vs 1.740 (10s ×2 alone) — the 90s weight change barely helps the 10s count, as expected, since it only redistributes probability mass among the other 8 decades roughly evenly.
- **This data is a candidate for the in-game distribution chart** the user proposed (dicebuilder-style): the per-decade expected-count table is exactly what such a chart would show, and it's cheap to compute for any weight setting at runtime (no simulation needed).

**Not yet done:** S2a (guarantee win-rate change), S2b (weight win-rate change — this is what would confirm whether these odds shifts translate to the win-rate range the chart's diminishing-returns curve suggests), S2c (stacking marginal-value curve from full runs), S2d (drafting re-run).

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
- **The scale needed tracks single-round cost directly and predictably.** 40–79 (costliest per round, S1a's preliminary numbers: 99.7 mean energy vs baseline 41.9, about 2.4×) needed targets cut to 56% of today's. 20–59 (cheapest of the three, since it overlaps the 10s–50s: 33.6 mean energy) needed targets *raised* 17% above today's — a constrained range isn't automatically harder once retuned; 20–59 keeps the cheap 10s–20s moves and is easier than the unrestricted 10–99 game at equal targets.
- **Planner win rate landed at 100% for all three, slightly above the ≈99% target** — within 1 SE of it at n=100 (stderr ≈1.0pt), so not a real miss, but worth another look with a bigger n before finalizing a starting range, since a planner ceiling this close to 100% leaves little room to confirm "skilled players should almost always win" against "average players win near half" simultaneously once unlocks are layered on top.
- **These three retuned points are the baseline every other S3 step measures against** — S3b (unlock values), S3c (unlock order), S3d (drafting with unlocks) all need a starting range picked from here, or run across all three.

**Not yet done:** S3b (unlock values), S3c (unlock order), S3d (drafting with unlocks), S3e (board variety along the unlock path).

## Next

Per `sim-plan-2.md`'s order, S3a is done. Next: **S1b–c and S2a–c in parallel** (full-run win-rate measurements building on S1a/S2e above), then **S3b–c** (which need a starting range chosen from S3a's three retuned points — recommend picking one, or ask the user, before running full S3b–e). Drafting re-runs (S1d, S2d, S3d) last.
