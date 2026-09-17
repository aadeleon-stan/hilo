# Roguelike MVP: proposed upgrades, items, relics, max energy and target schedule

Suggestions only, for review. Values come from the three research rounds and are marked measured or estimated. Everything else about the mode — money rates, shop structure, UI — is out of scope here.

## Max energy

**200**, carried across rounds, unchanged from Run mode. Untested above 200; it's the first knob to raise if playtests come back brutal.

## Target schedule

Ten rounds, on the 40–79 start:

| Round | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Target | 130 | 135 | 155 | 185 | 230 | 285 | 355 | 435 | 525 | 630 |

Round 3 calibrated 135 → 239 → 660 (measured: an average player drafting well won 93%, a random draft 59%, the planner 99%). This table is that schedule eased about 5% and rounded to whole numbers. A ±5% sensitivity run measured 98.5% ±0.5 for a well-drafting average player at this level; a random drafter should land around 65–75% (estimated, not measured).

## Upgrades

Values are the change in **mean rounds cleared** when granted alone after round 1 on the 40–79 start, 600 runs each, ±0.03 (round 3 P2a). They rank picks; they aren't a balance target.

### Decade unlocks

| Upgrade | Value |
|---|---|
| Unlock the 10s | +3.71 |
| Unlock the 20s | +2.70 |
| Unlock the 30s | +1.82 |

Round 3 measured these as strongly redundant with each other: holding the 10s and the 20s is worth far less than the sum of each alone (−2.03 rounds cleared in controlled runs).

### Build upgrades

| Upgrade | Value | Suggested rarity | Note |
|---|---|---|---|
| Squares (a × a) cost 0 energy | +1.06 | uncommon | Fires when both pools share a number |
| Pool A limited to 10–49 | +0.86 | uncommon | Anti-synergy with unlocking the 10s (−1.08 rounds together) |
| +40% round-end refund | +0.73 | common | Some is lost to the energy cap early |
| +40 max energy | +0.63 | common | Should also grant 40 energy on the spot, as the sims do |
| Guarantee a 10–19 value in each pool | +0.59 | uncommon | Only playable once the 10s are unlocked |
| Remove the highest decade (the 70s) | +0.51 | common | |
| Optimal bonus cap +4 | +0.40 | common | |
| Keep the smallest number into the next round | +0.31 | common | Weak alone here; better once a low decade is in |
| +1 number per pool | +0.50 | uncommon | Needs a 10-tile board; the grid is fixed at 3×3 today |
| +1 reroll of the board's largest number per round | +0.12 | common | |
| Remove two ones digits — 5 & 8, 0 & 9, 5 & 6, 7 & 8 | ≈ +0.1, estimated | common | Measured only on 10–99, where the best pairs were worth +10 to +12 win points |

### Cursed upgrades

| Upgrade | Measured | Note |
|---|---|---|
| Unlock the 80s, +50% round-end refund | curse alone −19 win points; ×1.5 refund makes taking it a close call | Round 3 P5b |
| Unlock the 90s, +50% round-end refund | curse alone −22 win points; same | Round 3 P5b |

**Left out:** weight-based odds upgrades ("10s ×1.5", worth +1.21 rounds). They measured well but read as opaque without the distribution chart from your 9/14 notes.

## Items

Single use. Energy equivalents are from round 1, measured on the 10–99 pools with a simpler single-round player, so treat them as relative rather than absolute.

| Item | Energy equivalent |
|---|---|
| Digit swap: change one tile from XY to YX | 10.7 |
| Next play costs half energy | 8.7 |
| Next play costs no energy | 17.9 |
| Reroll one pool | 22.1 when saved for a bad board, 6.0 on any board |
| Double points on the next play | 23.7 |
| Board refresh: new tiles, same score and energy | 26.1 on a bad board |

**Left out:** "revive a factor" (its rule for keeping turn count stable needs design work) and "shopping app" (depends on the shop economy).

## Relics

Passive, last the run.

| Relic | Measured |
|---|---|
| +40% energy refund on round win | +24 win points (round 1, on 10–99) |
| +40 max energy | +17 |
| Optimal bonus cap 6 → 10 | +13; every Optimal play still costs net energy |
| Perfect squares (a × a) cost 0 energy | +19 on 10–99; +1.06 rounds on the 40–79 start |
| Products over 4000 score double | Round 3: a skilled player wins 99–100% with it, an average player 24% |
| Factors of 70 or more cost 25% less | +6 to +8.5 with high decades in play |
| +50% money per round | unmeasured |

**Left out:** the digit-swap relic with per-round charges, +2 inventory slots, and cheaper shop prices — all three depend on economy and inventory rules.
