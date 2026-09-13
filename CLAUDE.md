# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (hot reload)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- No test runner or linter configured

## Architecture

HiLo is a multiplication arithmetic game built with React 19, Zustand 5, and Vite 8. The player picks one number (10–99) from each of two 3×3 pools, multiplies them, and the product is split: `product % 100` (low word) = points added to the round score, `floor(product / 100)` (high word) = energy spent.

### Game modes

The store's `mode` (`'run' | 'classic'`) selects the rules. All tuning lives in `src/store/gameLogic.js`; the reasoning and simulations behind the run tuning are in `feature-docs/progression-research.md`.

**Run** (main mode, "Start Run"):
- `RUN_ROUNDS` (10) rounds; target `getRunTarget(round)` = `240 + 15 * (round - 1)`.
- One energy pool starting at `RUN_MAX_ENERGY` (200) carries across rounds and never exceeds the max.
- On a round win, `RUN_TURN_REFUND` (5) energy per leftover turn is recovered.
- Best plays: `getBestPlays` scores every open move on the board *before* the move as `lo / scorePace − hi / energyPace` (scorePace = points still needed per turn left; energyPace = energy / rounds left / turns left). Among moves worth at least `BEST_PLAY_MIN_SCORE` (20) points, those within `BEST_PLAY_TOLERANCE` (0.15) of the top score qualify, unless another open move costs no more and scores no less. They earn `getBestPlayBonus(hi)` = `min(6, ceil(hi / 2))`, so a best play still costs net energy. The player only sees an "Optimal!" tag after making one.
- Winning round `RUN_ROUNDS` sets `phase: 'runWon'`.

**Endless Classic**:
- Target `100 + 30 * round`; energy budget `280 − 5 * round`, reset every round.
- On a win, `turnsRemaining * 25` plus leftover energy is added to `bank`, which persists across rounds.

**Round end** (`checkRoundEnd`, both modes): overspending (energy < 0) loses even on a turn that reaches the target; otherwise score ≥ target wins; energy of exactly 0 or an exhausted pool (9 turns max) loses. Run-mode recovery is applied after this check, so it can't rescue an overspend.

### State management

All game state lives in a single Zustand store (`src/store/useGameStore.js`). Screen routing is driven by `screen` ('menu' | 'game'). Game phase is tracked by `phase` ('selecting' | 'win' | 'loss' | 'runWon'). Pure game logic (pool generation, product math, targets, best plays, win/loss checks) is separated into `src/store/gameLogic.js`.

Selection flow: picking from both pools triggers `confirmSelection()` via a 150ms debounced timer (re-picking within the window restarts it; `nextRound`/`resetGame` cancel it) — no confirm button.

### UI layers

- **Screens** (`src/screens/`) — `MainMenu` (Start Run / Endless Classic) and `GameScreen`, switched by store's `screen` state in `App.jsx`
- **Components** (`src/components/`) — `Pool` (3×3 selectable grid), `HUD` (round, shown as "r / 10" in a run, and turns left), `Overlay` (win/loss modal: energy recovered in a run, bank breakdown in Classic). `GameScreen` owns the score/energy bars, per-turn hints, and result labels (quality labels in Classic, the Optimal tag in a run).

### Styling

CSS Modules per component. Dark theme variables defined in `src/index.css` (slate palette: `--bg: #0f172a`, `--surface: #1e293b`, accents in cyan/gold/green/red). Inspired by the sibling `../remainders/` project.
