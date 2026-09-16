# HiLo Research: Handoff and How-To

Notes for continuing research on another machine or in a new session. The goal is to pick up without the prior conversation.

## Where things stand (as of 2026-09-14)

**Shipped on `main`** (see `CLAUDE.md` for architecture):
- **Run mode:** 10 rounds with targets 240 + 15 per round, one 200-energy pool that carries across rounds, 5 energy refunded per leftover turn, and overspending loses. Endless Classic is kept as a second mode.
- **Best plays** (`getBestPlays` in `src/store/gameLogic.js`) earn the Optimal tag and a bonus of min(6, ceil(hi/2)). They are:
  - the scored best plays: `lo/scorePace − hi/energyPace` within 0.15 of the top move, among moves worth at least 20 points, excluding any move another move beats outright
  - the cheapest move or moves that finish the round
  - any finishing move that costs no more than the priciest scored best play
- **Optimal indicators** (`getHighlightedPlays`) glow only the scored best plays plus the cheapest finishing move or moves.
- **Energy par tables** (`RUN_SPEND_PAR`, `RUN_NET_PAR`) are simulation output tied to the tuning. Regenerate them whenever the run rules change.
- **UI:** the product-split animation (`ProductReveal`), the How to play tutorial, the in-game Menu drawer (Abandon run in all builds; Easy mode and Optimal indicators toggles in dev builds only).

**Research docs** (`feature-docs/`):
- `progression.txt`: the user's Run mode spec.
- `progression-research.md`: Run-mode tuning, the best-play rule, energy par, playtest findings and decisions.
- `upgrades.txt`: the user's roguelike spec, with notes added after round 1.
- `upgrades-research.md`: round 1 findings on upgrades, drafting, money, items and relics.
- `upgrades-research-2.md`: round 2 findings (ones-digit pairs, odds-shifting, constrained starts) — in progress, see its own "Next" section for what's left.
- `daily.txt`: a future Daily mode spec, not started.
- `playtest-settings.txt`, `playtest-notes.md`: the user's playtest spec and notes.

**Next up:** `research/sim-plan-3.md` (draft, 2026-09-15), responding to the user's 9/15 notes in `upgrades.txt`. It re-examines the round 1 and round 2 findings, then covers a super-linear target ramp with drafting, random-draft synergy discovery, money as a real choice, and high decades as a challenge. It replaces the unfinished steps of `sim-plan-2.md` (S1d, S2d, S3d, S3e). Progress: the harness changes, P2, P3, P4a, P4c and P5 are done (`feature-docs/upgrades-research-3.md`, which opens with a summary), using the power p = 2 schedule from 135 that the user chose. P1 wasn't needed and P4b hasn't been run.

**Round 2** (`sim-plan-2.md`: ones-digit pair upgrades, odds and guarantee upgrades, a constrained start with decade unlocks). The harness changes it required are done (weighted draws, per-pool range guarantees, `targetScale`, `startConfig` range presets, and `parallel.mjs` for multi-core runs) and validated: `harness-selftest.mjs` passes, and `baseline.mjs` still reproduces the original win rates (average 66.0% ±2.7 / planner 99.0% ±0.6 on 300 runs each, both within noise of the table below). S1a–c, S2a–c, S2e and S3a–c are done; findings are in `upgrades-research-2.md`.

## Decisions the user has made (keep to these)

- **Research before code:** the roguelike work is research only until the user asks for implementation.
- **Smallest-number shortcut:** best plays usually involve the smallest number, and that's fine for now as a human heuristic. Revisit it for the Daily mode.
- **Run difficulty target:** skilled players should (almost) always win a run, while average players win somewhere near half. With drafting (2026-09-15): a skilled player who drafts well should win easily, and an average player who drafts well should win over 90% of runs.
- **Difficulty is chosen by the user:** the shipped starting target is 240, chosen for its stats, though simulations suggest average players win about 65%. Present options with data and let the user choose.
- **Round 3 research uses the 40–79 start with decade unlocks** and a pick after every round (2026-09-15). Round 2's S3b–c also used 40–79, at `targetScale` 0.564.
- **Round 3 target schedule** (2026-09-15): 135 + 6.484375 × (r − 1)², i.e. 135 → 239 (round 5) → 660 (round 10), in `research/sims/round3-config.mjs`.
- **Money is tracked as its own weighted output** of a player's performance (2026-09-15), not converted into power through a shop, until items and relics are tuned.
- **Difficulty never responds to draft choices** (2026-09-15). Targets follow a fixed schedule, and a good or lucky draft should make a run easier. The intended shape is lower early targets with a super-linear ramp, so late rounds test the drafted build. This replaces the 2026-09-14 note that S3d would use a normal per-round ramp.
- **Upgrades don't need individual balance** (2026-09-15). A weak upgrade that becomes strong in combination is a feature. Look for synergies (for example with random-drafting simulators) instead of tuning upgrades against each other one by one.
- **The game should be a little more forgiving** (2026-09-15): winning shouldn't need razor-thin margins or omniscient planning. It isn't fun if you need a solver and luck to win.
- **High decades are a challenge, not just a penalty** (2026-09-15): offer them with a bonus (cash, an energy passive), as ascension-style difficulty modifiers, or alongside upgrades that reward high products.
- **Money findings from simulated players that ignore money are invalid** (2026-09-15). A real player trades energy for money, so overshoot isn't simply random.
- **Playtest settings are dev-only** (`import.meta.env.DEV`). Player-facing features such as Abandon run ship in all builds.

## Working preferences observed

- **Git:**
  - Commit when asked. Push only when asked.
  - Stage exact paths. `feature-docs/` often holds new user notes: read any unfamiliar file before committing it, or leave it out and ask.
  - Work has been on `main` since the progression branches were merged and deleted.
- **Planning:** the user uses plan mode for new features and specs (`feature-docs/*.txt`). Ask the questions that change the design, then present a plan.
- **Numbers:** back claims with simulations. State run counts and sampling error, and mark anything unmeasured as an estimate. When a finding contradicts an earlier claim, say so plainly and correct the doc.
- **Tuning changes:** after any change to game rules, re-run win rates, regenerate the energy par tables, and record the results in the research doc.

## Simulation scripts (`research/sims/`)

All scripts import the shipped rules from `src/store/gameLogic.js`. Run them from `research/sims/` with Node 20+ (tested with Node 26). There are no dependencies beyond the repo.

| Script | What it does | Example |
|---|---|---|
| `upgrade-sim.mjs` | **Harness**, a library. Mirrors `useGameStore.confirmSelection` for Run mode, with configurable pools, energy rules, target scale/offset, per-move energy/points modifiers and an upgrade hook after each round won. Exports `baseConfig`, `startConfig`, `drawPool`, `simulateRun`, `runMany`, `runManyRaw`, `runShardAware`, `myShare`, `summarize`, `calibrate`, `roundTarget`, `powerTargets`, `geometricTargets`, `players` (`average`, `planner`), `greedyRound`, `plannerRound`, `applyMove`. `cfg.targets` sets a target schedule, and each run returns a `draft` log of offers and picks. Money rates (`moneyPerRound`, `moneyPerTurnLeft`, `moneyPerOvershoot`, `moneyPerOptimal`) are summed per round won by `roundMoney`, and `moneyWeight` (energy per unit of money) makes both players value it. | imported by the others |
| `harness-selftest.mjs` | Validates the harness itself: weighted-draw frequencies, per-pool guarantees (including that over-budget ones throw), `startConfig` ranges. Run after any harness change, before trusting new results. | `node harness-selftest.mjs` |
| `parallel.mjs` | Launcher: runs a script across `SHARDS` processes (one per core) and merges the raw results it sends back over IPC. The target script must use `runShardAware` in place of `runMany` (as many calls as it likes; each is summarized in order) and skip printing when it returns `null`. | `SHARDS=6 node parallel.mjs some-sim.mjs` |
| `s1a-pair-screen.mjs` | Round 2 S1a: single-round cost for all 145 ones-digit pair-removal variants (45 both-pools, 100 ordered per-pool). | `N=20000 node s1a-pair-screen.mjs` |
| `s1b-pair-winrate.mjs` | Round 2 S1b: full-run win-rate change for ones-digit pairs removed from both pools after round 1. A 15-pair sample by default; `PAIRS=all` with `SHARD`/`SHARDS` splits all 45 across processes, and `BASE_N=0` skips the baseline. | `N=300 BASE_N=1200 node s1b-pair-winrate.mjs` |
| `s1c-pair-symmetry.mjs` | Round 2 S1c: (x removed from A, y from B) vs the swap, for three pairs. | `N=600 node s1c-pair-symmetry.mjs` |
| `s2a-guarantees.mjs` | Round 2 S2a: win-rate change for "at least N tens" guarantees, one pool vs both. | `N=300 node s2a-guarantees.mjs` |
| `s2b-weights.mjs` | Round 2 S2b: win-rate change for 10s-up / 90s-down odds weights, one pool vs both. | `N=300 node s2b-weights.mjs` |
| `s2c-stacking.mjs` | Round 2 S2c: win rate after 1–4 stacks of one odds upgrade (granted after rounds 1, 3, 5, 7), at a harder `TARGET_SCALE` so later stacks aren't hidden by the 100% ceiling. | `UPGRADE=tens1.5 TARGET_SCALE=1.062 node s2c-stacking.mjs` |
| `s3d-scaling-options.mjs` | Round 2 S3d prep: calibrates one target-scaling option (`ramp`, `decade`, `flat`, `hybrid` or `lowest`) so a reference unlock path gives the average player ~50%, then runs fixed unlock paths with both players. | `OPTION=ramp node s3d-scaling-options.mjs` |
| `draft-pool-3.mjs` | Round 3 offer pool for the 40–79 start: decade unlocks plus round 1's upgrades adapted, with eligibility that keeps pools drawable. `best`/`worst` policies read a value table by offer id; `draftHook` records each offer in the run's draft log. `P3_OFFERS` adds the ones-digit pair family (weighted as 2 offers in total), odds upgrades for pool A and two relics; offers are drawn by weight. | imported by the round 3 scripts |
| `round3-config.mjs` | The user's round 3 settings: the 40–79 start and the chosen target schedule, as `round3Start()`. | imported by the round 3 scripts |
| `p3-synergy.mjs` | Round 3 P3c: main effects and pairwise interactions from P3b's records, using landmark round `L`, a difference in differences on rounds cleared, win rate and win log-odds, and a discovery/confirmation split. Prints control pairs expected to be anti-synergies. | `IN_DIR=p3-runs L=5 MIN_CELL=300 node p3-synergy.mjs` |
| `p3d-confirm.mjs` | Round 3 P3d: controlled check of one pair (A after round 1, B after round 2, drafting well from the P2 pool otherwise), for the average player and the planner. | `PAIR=narrow-pool-A,over-4000-double N=600 N_PLANNER=200 node p3d-confirm.mjs` |
| `p4-money.mjs` | Round 3 P4a: win rate, rounds cleared and money for money weights `MUS`, with both players drafting well at the chosen schedule. Money rates are env vars. | `MUS=0,0.5,1 N=600 N_PLANNER=200 node p4-money.mjs` |
| `p5a-ascension.mjs` | Round 3 P5a: the 80s, 90s or both added to the 40–79 start as locked ascension decades ("remove the highest decade" skips them), with both players drafting well at the chosen schedule. | `LEVELS=none,80,90,80+90 N=600 N_PLANNER=200 node p5a-ascension.mjs` |
| `p5-grants.mjs` | Round 3 P5b–c: controlled cells that grant curses (`curse-80s`, `curse-90s`, locked), energy-regain bonuses (`refund-x1.5`) or offers after round 1, then keep drafting well or randomly from the P2 pool. | `CELLS="none:|curse:curse-80s" POLICY=random N=600 node p5-grants.mjs` |
| `p3-random-drafts.mjs` | Round 3 P3b: random drafting from `P3_OFFERS` at the chosen schedule, writing one JSON line per run. `N` is runs per process; `SHARD` names the output file. | `N=20000 SHARD=0 OUT_DIR=p3-runs node p3-random-drafts.mjs` |
| `p2a-values-4079.mjs` | Round 3 P2a: each offer's solo value (change in mean rounds cleared) granted after round 1 on the 40–79 start, at a provisional schedule. Writes `values-4079.json`. | `N=600 node p2a-values-4079.mjs` |
| `p2-schedules.mjs` | Round 3 P2b–c: calibrates one target schedule (power or geometric) so the average player drafting well wins about 92%, then runs every drafting policy and the planner, with deaths by round, tightest round and ±5% target sensitivity. | `FAMILY=power P=2 T1=115 node p2-schedules.mjs` |
| `s2e-odds-chart.mjs` | Round 2 S2e: exact (non-simulated) odds-chart data for weighted pool draws — per-decade expected counts, P(≥1 ten), via a small DP. Self-checks against the closed-form hypergeometric distribution. | `node s2e-odds-chart.mjs` |
| `s3a-retune.mjs` | Round 2 S3a: binary-searches `targetScale` until the average player's win rate matches `TARGET_WIN` (default 66%), then confirms the planner (`N_PLANNER=0` skips). `UNLOCK` adds decades from the start and `UNLOCK_PATH` adds them after `GRANT_ROUNDS`, which S3b–c use to value unlocks past the win-rate ceiling. | `RANGE=40,79 UNLOCK=10 N_AVG=400 N_PLANNER=0 node s3a-retune.mjs` |
| `s3b-unlock-values.mjs` | Round 2 S3b: win rate and energy per round for each decade unlock (and trade-off pair) granted after round 1 on a constrained start. | `TARGET_SCALE=0.564 N=600 node s3b-unlock-values.mjs` |
| `s3c-unlock-order.mjs` | Round 2 S3c: fixed unlock paths granted after rounds 2, 4 and 6, including two paths with the same decades in opposite orders. | `TARGET_SCALE=0.564 N=600 node s3c-unlock-order.mjs` |
| `draft-pool.mjs` | Round 1 drafting offer pool (12 stackable upgrades with measured values), picking strategies and `draftHook`. | imported by `drafting.mjs` |
| `baseline.mjs` | Harness validation with no upgrades. | `PLAYERS=average,planner N=300 node baseline.mjs` |
| `single-round-restrictions.mjs` | Single-round cost with decades or ones digits removed. | `N=1500 node single-round-restrictions.mjs` |
| `single-upgrades.mjs` | Win-rate change for each single upgrade granted after given rounds. | `PLAYER=average N=300 GRANT_ROUNDS=1,5 node single-upgrades.mjs` |
| `drafting.mjs` | Pick-one-of-three drafting across target steps K and picking strategies. | `PLAYER=average N=200 K=25,30,35 node drafting.mjs` |
| `items.mjs` | Energy equivalents of shop items on single rounds. | `N=2000 node items.mjs` |
| `money.mjs` | Leftover turns, overshoot and Optimal plays per round, with totals at shop rounds. | `PLAYER=average N=400 node money.mjs` |
| `board-effects.mjs` | Relic trigger frequencies, plus best-play and heuristic effects of pool upgrades. | `N=4000 node board-effects.mjs` |
| `energy-flow.mjs` | Energy spent / bonus / refund per round under different best-play rules (from `progression-research.md` §11). | `VARIANT=limit N=300 node energy-flow.mjs` |

**Validation numbers to expect** (no upgrades):

| Player | Win rate | Source |
|---|---|---|
| Average | ≈ 65–67% | repo copy verified at 67.0% ±2.7 on 300 runs |
| Planner | ≈ 97–99% | 97.3% ±0.9 on 300 runs |

Planner medians of energy spent and net energy per round should be close to `RUN_SPEND_PAR` / `RUN_NET_PAR`. If `baseline.mjs` drifts outside noise after a harness change, fix that before trusting new results.

**Player models:**
- **average:** one move at a time, scoring moves as points − 1.5 × energy. Fast; used for broad sweeps.
- **planner:** plans the whole round, trying several cost weights and keeping the finished round with the most energy left. A stand-in for a strong player. About 0.5 s per run on a fast core.

**Performance:**
- **One core per process:** the harness is single-threaded. Each process peaks at about 120 MB.
- **Parallelism:** run one process per physical core. This machine is a Ryzen 5 5600 (6 cores / 12 threads, corrected from the 7600 noted earlier — same core/thread count), so 6–10 processes at once is reasonable. Use `parallel.mjs` (see the scripts table) rather than hand-launching shards: `SHARDS=6 node parallel.mjs some-sim.mjs`, with any other env vars the script reads (`N=`, `PLAYER=`, ...) passed through. A script opts in by calling `runShardAware(player, cfgFactory, n, options)` instead of `runMany`, and skipping its own printing when that returns `null` (the launcher merges and prints the combined summary).
- **That Mac:** an A18 Pro with only 2 performance cores, so anything beyond 2 processes mostly lands on efficiency cores.
- **Long runs:** use background processes. Close memory-heavy apps; the Vite dev server was stopped twice for low memory during long runs.

**Sampling error:** about ±2.7 points at 300 runs near 65%, ±3.4 at 200 runs. Treat differences under about 2× the error as noise.
