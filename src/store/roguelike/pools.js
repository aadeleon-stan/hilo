import { POOL_SIZE } from './constants';
import { allowedValues, decadeOf } from './runConfig';

const pick = (values) => values[Math.floor(Math.random() * values.length)];

function shuffle(values) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Draws distinct values for a pool until it holds `size` values, starting from
// `existing` (which count toward guarantees). Ported from drawPool in
// research/sims/upgrade-sim.mjs. Returns only the new values.
export function drawValues(pool, existing = [], size = POOL_SIZE) {
  const allowed = allowedValues(pool);
  const values = [...existing];
  const slots = {};
  for (const decade of pool.guarantees) slots[decade] = (slots[decade] ?? 0) + 1;

  for (const [decade, count] of Object.entries(slots)) {
    let have = values.filter((v) => decadeOf(v) === Number(decade)).length;
    while (have < count && values.length < size) {
      const candidates = allowed.filter((v) => decadeOf(v) === Number(decade) && !values.includes(v));
      if (candidates.length === 0) break;
      values.push(pick(candidates));
      have++;
    }
  }
  while (values.length < size) {
    const candidates = allowed.filter((v) => !values.includes(v));
    if (candidates.length === 0) break;
    values.push(pick(candidates));
  }
  return shuffle(values.slice(existing.length));
}

// Tile ids come from a run-wide counter, so a tile that changes is never
// confused with the one it replaced (best-play keys, pending selections).
export function makeTiles(values, nextTileId) {
  const tiles = values.map((value, i) => ({ id: nextTileId + i, value, used: false }));
  return { tiles, nextTileId: nextTileId + values.length };
}

// A fresh board for a new round. With `twin`, one value allowed in both pools
// is placed in each, so a square is available.
export function drawBoard(cfg, nextTileId, twin = false) {
  let forced = [];
  if (twin) {
    const inB = new Set(allowedValues(cfg.pools.B));
    const shared = allowedValues(cfg.pools.A).filter((v) => inB.has(v));
    if (shared.length > 0) forced = [pick(shared)];
  }
  const valuesA = shuffle([...forced, ...drawValues(cfg.pools.A, forced)]);
  const valuesB = shuffle([...forced, ...drawValues(cfg.pools.B, forced)]);
  const a = makeTiles(valuesA, nextTileId);
  const b = makeTiles(valuesB, a.nextTileId);
  return { poolA: a.tiles, poolB: b.tiles, nextTileId: b.nextTileId };
}

// Replaces every unused tile in a pool with a new draw; used tiles stay, so
// the turn count doesn't change.
export function redrawUnused(poolCfg, tiles, nextTileId) {
  const used = tiles.filter((t) => t.used).map((t) => t.value);
  const fresh = drawValues(poolCfg, used, tiles.length);
  let id = nextTileId;
  let k = 0;
  const next = tiles.map((t) => {
    if (t.used || k >= fresh.length) return t;
    return { id: id++, value: fresh[k++], used: false };
  });
  return { tiles: next, nextTileId: id };
}

// A new allowed value for one tile, different from every value in the pool,
// or null if there is none.
export function rerollValue(poolCfg, tiles) {
  const inPool = new Set(tiles.map((t) => t.value));
  const candidates = allowedValues(poolCfg).filter((v) => !inPool.has(v));
  return candidates.length > 0 ? pick(candidates) : null;
}

// Returns tiles with one tile's value replaced under a new id.
export function replaceTile(tiles, tileId, value, nextTileId) {
  return {
    tiles: tiles.map((t) => (t.id === tileId ? { ...t, id: nextTileId, value } : t)),
    nextTileId: nextTileId + 1,
  };
}
