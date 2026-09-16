// P3b (sim-plan-3.md): random drafting from the full round 3 pool at the
// chosen schedule, one JSON line per run for the synergy analysis. Run
// several processes with different SHARD values; each writes its own file.
// N is the number of runs in this process.
// Record: won, cleared (rounds cleared), endEnergy per cleared round, and
// picks (picks[k] was taken after round k + 1; null when nothing was offered).
// Usage: N=20000 SHARD=0 OUT_DIR=p3-runs node p3-random-drafts.mjs
import { createWriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';
import { simulateRun, players } from './upgrade-sim.mjs';
import { P3_OFFERS, policies, draftHook } from './draft-pool-3.mjs';
import { round3Start } from './round3-config.mjs';

const N = Number(process.env.N || 1000);
const SHARD = Number(process.env.SHARD || 0);
const PLAYER = process.env.PLAYER || 'average';
const OUT_DIR = process.env.OUT_DIR || 'p3-runs';

mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `${PLAYER}-shard${SHARD}.jsonl`);
const out = createWriteStream(file);
const hook = draftHook(policies.random(), P3_OFFERS);
const t0 = Date.now();
for (let k = 0; k < N; k++) {
  const r = simulateRun(players[PLAYER], round3Start(), { onRoundWin: hook });
  out.write(`${JSON.stringify({
    won: r.won,
    cleared: r.rounds.length,
    endEnergy: r.rounds.map((rd) => rd.endEnergy),
    picks: r.draft.map((d) => d.picked),
  })}\n`);
}
out.end(() => console.log(`${file}: ${N} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s`));
