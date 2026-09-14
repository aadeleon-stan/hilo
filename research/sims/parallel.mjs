// Launcher: runs a sim script across multiple processes and merges the raw
// per-run results it sends back over IPC, instead of running everything on
// one core. One process per physical core is the right target (see
// research/README.md's Performance section).
//
// The target script must call `runShardAware` (from upgrade-sim.mjs) in place
// of `runMany` for the run(s) it wants sharded, and skip its normal printing
// when that returns null (it already sent results to this launcher via IPC).
//
// Usage: SHARDS=6 node parallel.mjs some-script.mjs
// Any other env vars the script reads (N=, PLAYER=, ...) pass through as-is.
import { fork } from 'node:child_process';
import path from 'node:path';
import { summarize } from './upgrade-sim.mjs';

const target = process.argv[2];
if (!target) {
  console.error('Usage: SHARDS=<n> node parallel.mjs <script.mjs>');
  process.exit(1);
}
const shards = Number(process.env.SHARDS) || 6;
const scriptPath = path.resolve(process.cwd(), target);

const collected = await Promise.all(
  Array.from({ length: shards }, (_, i) => new Promise((resolve, reject) => {
    const child = fork(scriptPath, [], { env: { ...process.env, SHARD: String(i), SHARDS: String(shards) } });
    let results = null;
    child.on('message', (msg) => { results = msg; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`shard ${i} exited with code ${code}`));
      if (!results) return reject(new Error(`shard ${i} sent no results — did the script call runShardAware and check SHARDS?`));
      resolve(results);
    });
  }))
);

const raw = collected.flat();
console.log(`merged ${raw.length} runs across ${shards} shards`);
console.log(JSON.stringify(summarize(raw), null, 2));
