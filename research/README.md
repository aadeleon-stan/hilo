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

**Next up:** `research/sim-plan-2.md`, simulations for the user's round-2 notes:
- ones-digit pair upgrades
- odds and guarantee upgrades
- a constrained start with decade unlocks

The harness changes it required are done (weighted draws, per-pool range guarantees, `targetScale`, `startConfig` range presets, and `parallel.mjs` for multi-core runs) and validated: `harness-selftest.mjs` passes, and `baseline.mjs` still reproduces the original win rates (average 66.0% ±2.7 / planner 99.0% ±0.6 on 300 runs each, both within noise of the table below). S1a, S2e and S3a are done (findings in `upgrades-research-2.md`); next up per the plan's order is S1b–c and S2a–c in parallel, then S3b–c.

## Decisions the user has made (keep to these)

- **Research before code:** the roguelike work is research only until the user asks for implementation.
- **Smallest-number shortcut:** best plays usually involve the smallest number, and that's fine for now as a human heuristic. Revisit it for the Daily mode.
- **Run difficulty target:** skilled players should (almost) always win a run, while average players win somewhere near half.
- **Difficulty is chosen by the user:** the shipped starting target is 240, chosen for its stats, though simulations suggest average players win about 65%. Present options with data and let the user choose.
- **Constrained-start research uses 40–79** (`targetScale` 0.564) for S3b–e, chosen 2026-09-14.
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
| `upgrade-sim.mjs` | **Harness**, a library. Mirrors `useGameStore.confirmSelection` for Run mode, with configurable pools, energy rules, target scale/offset, per-move energy/points modifiers and an upgrade hook after each round won. Exports `baseConfig`, `startConfig`, `drawPool`, `simulateRun`, `runMany`, `runManyRaw`, `runShardAware`, `myShare`, `summarize`, `players` (`average`, `planner`), `greedyRound`, `plannerRound`, `applyMove`. | imported by the others |
| `harness-selftest.mjs` | Validates the harness itself: weighted-draw frequencies, per-pool guarantees (including that over-budget ones throw), `startConfig` ranges. Run after any harness change, before trusting new results. | `node harness-selftest.mjs` |
| `parallel.mjs` | Launcher: runs a script across `SHARDS` processes (one per core) and merges the raw results it sends back over IPC. The target script must use `runShardAware` in place of `runMany` (as many calls as it likes; each is summarized in order) and skip printing when it returns `null`. | `SHARDS=6 node parallel.mjs some-sim.mjs` |
| `s1a-pair-screen.mjs` | Round 2 S1a: single-round cost for all 145 ones-digit pair-removal variants (45 both-pools, 100 ordered per-pool). | `N=20000 node s1a-pair-screen.mjs` |
| `s2e-odds-chart.mjs` | Round 2 S2e: exact (non-simulated) odds-chart data for weighted pool draws — per-decade expected counts, P(≥1 ten), via a small DP. Self-checks against the closed-form hypergeometric distribution. | `node s2e-odds-chart.mjs` |
| `s3a-retune.mjs` | Round 2 S3a: binary-searches `targetScale` for a constrained starting range until the average player's win rate matches today's baseline, then confirms the planner. | `RANGE=40,79 N_AVG=200 N_PLANNER=100 node s3a-retune.mjs` |
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
