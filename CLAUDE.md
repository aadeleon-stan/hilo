# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (hot reload)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- No test runner or linter configured

## Architecture

HiLo is a multiplication arithmetic game built with React 19, Zustand 5, and Vite 8. The player picks one number from each of two 3×3 pools, multiplies them, and the product is split: `product / 100` = money (accumulates forever), `product % 100` = points (must meet round target). Targets start at 300 and increase by 100 per round.

### State management

All game state lives in a single Zustand store (`src/store/useGameStore.js`). Screen routing is driven by `screen` ('menu' | 'game'). Game phase is tracked by `phase` ('selecting' | 'win' | 'loss'). Pure game logic (pool generation, product math, target calculation, win/loss checks) is separated into `src/store/gameLogic.js`.

Selection flow: picking from both pools triggers `confirmSelection()` via a 150ms setTimeout — no confirm button.

### UI layers

- **Screens** (`src/screens/`) — `MainMenu` and `GameScreen`, switched by store's `screen` state in `App.jsx`
- **Components** (`src/components/`) — `Pool` (3×3 selectable grid), `HUD` (round/score/money bar), `Overlay` (win/loss modal)

### Styling

CSS Modules per component. Dark theme variables defined in `src/index.css` (slate palette: `--bg: #0f172a`, `--surface: #1e293b`, accents in cyan/gold/green/red). Inspired by the sibling `../remainders/` project.
