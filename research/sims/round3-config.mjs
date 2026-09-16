// Round 3 settings chosen by the user on 2026-09-15 (sim-plan-3.md): the
// 40-79 start with decade unlocks and the power p = 2 schedule from 135
// (P2 calibrated c so an average player drafting well wins about 92%).
import { baseConfig, startConfig, powerTargets } from './upgrade-sim.mjs';

export const ROUND3_SCHEDULE = { T1: 135, c: 6.484375, p: 2 };
export const ROUND3_TARGETS = powerTargets(ROUND3_SCHEDULE.T1, ROUND3_SCHEDULE.c, ROUND3_SCHEDULE.p);
export const round3Start = () => ({ ...baseConfig(), ...startConfig([40, 79]), targets: ROUND3_TARGETS });
