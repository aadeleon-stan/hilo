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
- Best plays: `getBestPlays` scores every open move on the board *before* the move as `lo / scorePace − hi / energyPace` (scorePace = points still needed per turn left; energyPace = energy / rounds left / turns left). Among moves worth at least `BEST_PLAY_MIN_SCORE` (20) points, those within `BEST_PLAY_TOLERANCE` (0.15) of the top score qualify, unless another open move costs no more and scores no less. Moves that would finish the round also qualify, whatever they score, if they are the cheapest finishing move(s) or cost no more than the priciest scored best play (added on top of the scored best plays, so no existing bonuses are lost). They earn `getBestPlayBonus(hi)` = `min(6, ceil(hi / 2))`, so a best play still costs net energy. The player only sees an "Optimal!" tag after making one.
- Energy par (`getRunSpendPar` / `getRunNetPar`): per-round tables of a simulated strong player's median gross spend and net use (spend − bonus − refund). During a round, `GameScreen` shows `roundSpent` vs spend par, replacing the Classic per-turn pace hints, which are meaningless in a run. The round-complete popup shows net use (`roundStartEnergy − energy`) vs net par. **The tables are simulation output tied to the run constants — regenerate them (research doc, section 10) whenever run tuning changes.**
- Winning round `RUN_ROUNDS` sets `phase: 'runWon'`.

**Endless Classic**:
- Target `100 + 30 * round`; energy budget `280 − 5 * round`, reset every round.
- On a win, `turnsRemaining * 25` plus leftover energy is added to `bank`, which persists across rounds.

**Round end** (`checkRoundEnd`, both modes): overspending (energy < 0) loses even on a turn that reaches the target; otherwise score ≥ target wins; energy of exactly 0 or an exhausted pool (9 turns max) loses. Run-mode recovery is applied after this check, so it can't rescue an overspend.

### State management

All game state lives in a single Zustand store (`src/store/useGameStore.js`). Playtest settings live separately in `src/store/useSettingsStore.js` (persisted to localStorage as `hilo-settings`): **Easy mode** labels the other pool's open tiles with products for the hovered or selected tile, and **Optimal indicators** (Run mode only) glow the tiles of `getHighlightedPlays` pairs (the scored best plays plus only the cheapest finishing move(s), a subset of `getBestPlays` so late-round boards stay readable), one color per pair via `src/screens/optimalGlows.js`. They exist only in dev builds: `SETTINGS_ENABLED` is `import.meta.env.DEV`, and consumers read them through `useSetting`, which forces them off in production. Screen routing is driven by `screen` ('menu' | 'game'). Game phase is tracked by `phase` ('selecting' | 'win' | 'loss' | 'runWon'). Pure game logic (pool generation, product math, targets, best plays, win/loss checks) is separated into `src/store/gameLogic.js`.

Selection flow: picking from both pools triggers `confirmSelection()` via a 150ms debounced timer (re-picking within the window restarts it; `nextRound`/`resetGame` cancel it) — no confirm button.

### UI layers

- **Screens** (`src/screens/`) — `MainMenu` (Start Run / Endless Classic) and `GameScreen`, switched by store's `screen` state in `App.jsx`
- **Components** (`src/components/`) — `Pool` (3×3 selectable grid; optional `onHover`, `previews` and `glows` props drive the playtest settings), `SettingsToggles` (the playtest checkboxes, shared by the main menu and the drawer), `SettingsDrawer` (gear button in `HUD` that opens the in-game menu drawer in all builds: "Abandon run" in Run mode or "Quit to menu" in Classic, behind a confirm step that focuses Cancel and then calls `resetGame`; the playtest toggles appear below it in dev builds only), `HowToPlay` (5-page rules modal opened from `MainMenu`, local component state only; pages 1, 2 and 4 loop demos built from `ProductReveal` and `StatBar` (listed in `DEMO_PAGES`), and it reads every number from `gameLogic.js` so the text follows the tuning), `HUD` (round, shown as "r / 10" in a run, and turns left), `Overlay` (win/loss modal: energy recovered in a run, bank breakdown in Classic; fades in after a 1.4s delay so the last move's reveal plays first), `ProductReveal` (pops the product in as one number, holds, then at 0.8s splits it into high word = gold energy cost and low word = cyan points; `GameScreen` remounts it with `key={turn}` to replay). `StatBar` (labeled score/energy bar; its fill transition waits 1.05s by default to land after the split, overridable via `fillDelay`). `GameScreen` renders the two `StatBar`s, the hint line (per-turn pace in Classic, energy spent vs par in a run), and picks the result label (quality labels in Classic, the Optimal tag in a run). Animation timings are coupled across these three stylesheets.

### Styling

CSS Modules per component. Dark theme variables defined in `src/index.css` (slate palette: `--bg: #0f172a`, `--surface: #1e293b`, accents in cyan/gold/green/red). Inspired by the sibling `../remainders/` project.
