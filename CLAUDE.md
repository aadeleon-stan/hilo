# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (hot reload)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- No test runner or linter configured

## Architecture

HiLo is a multiplication arithmetic game built with React 19, Zustand 5, and Vite 8. The player picks one number (10–99) from each of two 3×3 pools, multiplies them, and the product is split: `product % 100` (low word) = points added to the round score, `floor(product / 100)` (high word) = energy spent.

Round rules (all in `gameLogic.js`):
- Target score: `100 + round * 30`
- Energy budget: `280 - round * 5`, reset each round
- Overspending (energy < 0) loses the round, even on a turn that reaches the target.
- Otherwise win when score ≥ target. On win, `turnsRemaining * 25` bonus plus leftover energy is added to `bank`, which persists across rounds.
- Loss when energy hits exactly 0 without reaching the target, or either pool is exhausted (9 turns max).

### State management

All game state lives in a single Zustand store (`src/store/useGameStore.js`). Screen routing is driven by `screen` ('menu' | 'game'). Game phase is tracked by `phase` ('selecting' | 'win' | 'loss'). Pure game logic (pool generation, product math, target calculation, win/loss checks) is separated into `src/store/gameLogic.js`.

Selection flow: picking from both pools triggers `confirmSelection()` via a 150ms debounced timer (re-picking within the window restarts it; `nextRound`/`resetGame` cancel it) — no confirm button.

### UI layers

- **Screens** (`src/screens/`) — `MainMenu` and `GameScreen`, switched by store's `screen` state in `App.jsx`
- **Components** (`src/components/`) — `Pool` (3×3 selectable grid), `HUD` (round/turns left), `Overlay` (win/loss modal with bank breakdown). `GameScreen` owns the score/energy bars, per-turn hints, and result quality labels.

### Styling

CSS Modules per component. Dark theme variables defined in `src/index.css` (slate palette: `--bg: #0f172a`, `--surface: #1e293b`, accents in cyan/gold/green/red). Inspired by the sibling `../remainders/` project.
