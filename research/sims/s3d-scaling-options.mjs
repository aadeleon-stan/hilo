// S3d prep: compares ways to raise targets as unlocks arrive on the 40-79
// start (sim-plan-2.md §S3). Each option has one difficulty knob, calibrated
// so the reference path (30s, 20s, 10s after rounds 2, 4, 6) gives the
// average player about CAL_WIN%; then every fixed path runs at that setting.
//
//   ramp    targets climb k points (before scaling) per round, whatever is unlocked; knob = k
//   decade  each unlock adds STEP_F x its S3b headroom to later targets; knob = base targetScale
//   flat    each unlock adds FLAT_STEP to later targets; knob = base targetScale
//   hybrid  decade steps (summed) plus a per-round ramp; knob = k
//   lowest  per-round ramp plus one step set by the lowest decade unlocked so far
//           (not summed, since unlock values don't add up); knob = k
//
// Usage: OPTION=ramp N_CAL=400 N=600 N_PLANNER=100 node s3d-scaling-options.mjs
import { runMany, baseConfig, startConfig, getRunTarget, RUN_ROUNDS } from './upgrade-sim.mjs';

const OPTION = process.env.OPTION || 'ramp';
const CAL_WIN = Number(process.env.CAL_WIN || 50);
const N_CAL = Number(process.env.N_CAL || 400);
const N = Number(process.env.N || 600);
const N_PLANNER = Number(process.env.N_PLANNER ?? 100);
const STEP_F = Number(process.env.STEP_F || 0.5);
const FLAT_STEP = Number(process.env.FLAT_STEP || 0.25);
const BASE_SCALE = 0.564;
const HEADROOM = { 10: 0.81, 20: 0.54, 30: 0.34, 80: -0.07, 90: -0.07 };
const GRANT_ROUNDS = [2, 4, 6];

const PATHS = [
  ['no unlocks', []],
  ['lowest-first 10s>20s>30s', [10, 20, 30]],
  ['reference 30s>20s>10s', [30, 20, 10]],
  ['alternating 30s>80s>20s', [30, 80, 20]],
  ['high-first 80s>90s>30s', [80, 90, 30]],
  ['one unlock: 30s', [30]],
];
const REFERENCE = PATHS[2][1];

const summedSteps = (unlocked) => unlocked.reduce((t, d) => t + STEP_F * HEADROOM[d], 0);
// Returns the per-round ramp k and the targetScale for a list of unlocked decades.
function setting(knob) {
  switch (OPTION) {
    case 'ramp': return { k: knob, scaleFor: () => BASE_SCALE };
    case 'decade': return { k: 0, scaleFor: (u) => knob * (1 + summedSteps(u)) };
    case 'flat': return { k: 0, scaleFor: (u) => knob * (1 + FLAT_STEP * u.length) };
    case 'hybrid': return { k: knob, scaleFor: (u) => BASE_SCALE * (1 + summedSteps(u)) };
    case 'lowest': return { k: knob, scaleFor: (u) => BASE_SCALE * (1 + (u.length ? STEP_F * HEADROOM[Math.min(...u)] : 0)) };
    default: throw new Error('OPTION must be ramp, decade, flat, hybrid or lowest');
  }
}
const BRACKET = { ramp: [0, 60], decade: [0.3, 1.2], flat: [0.3, 1.2], hybrid: [0, 60], lowest: [0, 60] }[OPTION];

const decade = (d) => Array.from({ length: 10 }, (_, i) => d + i);
const withDecade = (c, d) => {
  const merge = (dom) => [...new Set([...dom, ...decade(d)])].sort((a, b) => a - b);
  return { ...c, domainA: merge(c.domainA), domainB: merge(c.domainB) };
};

function run(knob, path, n, player = 'average') {
  const { k, scaleFor } = setting(knob);
  const start = () => ({ ...baseConfig(), ...startConfig([40, 79]), targetScale: scaleFor([]), unlocked: [] });
  return runMany(player, start, n, {
    onRoundWin: (cfg, r) => {
      let c = k ? { ...cfg, targetExtra: k * r } : cfg;
      const i = GRANT_ROUNDS.indexOf(r);
      if (i >= 0 && i < path.length) {
        const unlocked = [...c.unlocked, path[i]];
        c = { ...withDecade(c, path[i]), unlocked, targetScale: scaleFor(unlocked) };
      }
      return c;
    },
  });
}

function targets(knob, path) {
  const { k, scaleFor } = setting(knob);
  const unlocked = [];
  const out = [];
  for (let r = 1; r <= RUN_ROUNDS; r++) {
    out.push(Math.round((getRunTarget(r) + k * (r - 1)) * scaleFor(unlocked)));
    const i = GRANT_ROUNDS.indexOf(r);
    if (i >= 0 && i < path.length) unlocked.push(path[i]);
  }
  return out;
}

let lo = BRACKET[0], hi = BRACKET[1];
let rLo = run(lo, REFERENCE, N_CAL);
let rHi = run(hi, REFERENCE, N_CAL);
while (rHi.winPct > CAL_WIN && hi < 1000) { hi *= 2; rHi = run(hi, REFERENCE, N_CAL); }
if (rLo.winPct < CAL_WIN) console.log(`WARNING: even the easiest knob (${lo}) gives ${rLo.winPct.toFixed(1)}% on the reference path`);
let best = Math.abs(rLo.winPct - CAL_WIN) < Math.abs(rHi.winPct - CAL_WIN) ? { knob: lo, r: rLo } : { knob: hi, r: rHi };
for (let iter = 0; iter < 8; iter++) {
  const mid = (lo + hi) / 2;
  const r = run(mid, REFERENCE, N_CAL);
  if (Math.abs(r.winPct - CAL_WIN) < Math.abs(best.r.winPct - CAL_WIN)) best = { knob: mid, r };
  if (r.winPct > CAL_WIN) lo = mid; else hi = mid;
  if (Math.abs(r.winPct - CAL_WIN) < 2) break;
}

const knobName = ['ramp', 'hybrid', 'lowest'].includes(OPTION) ? 'k' : 'base targetScale';
console.log(`option ${OPTION} | ${knobName} = ${best.knob.toFixed(3)} | reference path average ${best.r.winPct.toFixed(1)}% ±${best.r.stderr.toFixed(1)} (calibration, n=${N_CAL})`);
if (['decade', 'hybrid', 'lowest'].includes(OPTION)) console.log(`  unlock steps${OPTION === 'lowest' ? ' (lowest decade so far, not summed)' : ''}: ${Object.entries(HEADROOM).map(([d, h]) => `${d}s ${h >= 0 ? '+' : ''}${(h * STEP_F * 100).toFixed(0)}%`).join(', ')}`);
if (OPTION === 'flat') console.log(`  every unlock: +${(FLAT_STEP * 100).toFixed(0)}%`);
console.log('path | round 1-10 targets | average win% | planner win%');
for (const [name, path] of PATHS) {
  const avg = run(best.knob, path, N);
  const plan = N_PLANNER > 0 ? run(best.knob, path, N_PLANNER, 'planner') : null;
  console.log(`${name} | ${targets(best.knob, path).join(' ')} | ${avg.winPct.toFixed(1)} ±${avg.stderr.toFixed(1)} | ${plan ? `${plan.winPct.toFixed(1)} ±${plan.stderr.toFixed(1)}` : '-'}`);
}
