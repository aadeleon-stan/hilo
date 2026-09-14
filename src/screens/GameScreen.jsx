import { useMemo, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { useSetting } from '../store/useSettingsStore';
import {
  computeProduct,
  getHighlightedPlays,
  getTarget,
  getBudget,
  getRunTarget,
  getRunSpendPar,
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
} from '../store/gameLogic';
import HUD from '../components/HUD/HUD';
import Pool from '../components/Pool/Pool';
import ProductReveal from '../components/ProductReveal/ProductReveal';
import StatBar from '../components/StatBar/StatBar';
import Overlay from '../components/Overlay/Overlay';
import { buildOptimalGlows } from './optimalGlows';
import styles from './GameScreen.module.css';

function getQuality(lowWord, highWord) {
  if (lowWord >= 70 && highWord <= 10) return 'great';
  if (lowWord >= 40 && highWord <= 25) return 'good';
  return 'poor';
}

const qualityLabels = { great: 'Great!', good: 'Nice', poor: null };

function getResultLabel(result, isRun) {
  if (!result) return null;
  if (isRun) {
    if (!result.isBest) return null;
    return result.bonus > 0 ? `Optimal! +${result.bonus} energy` : 'Optimal!';
  }
  return qualityLabels[getQuality(result.lowWord, result.highWord)];
}

// Easy mode: products of the hovered tile (or, failing that, the selected
// tile) with every open tile in the other pool.
function getPreviews(poolA, poolB, hovered, selectedA, selectedB) {
  const openTile = (pool, id) => {
    const tile = pool.find((n) => n.id === id);
    return tile && !tile.used ? tile : null;
  };

  let side = null;
  let source = null;
  if (hovered) {
    side = hovered.pool;
    source = openTile(side === 'A' ? poolA : poolB, hovered.id);
  }
  if (!source && selectedA !== null) {
    side = 'A';
    source = openTile(poolA, selectedA);
  }
  if (!source && selectedB !== null) {
    side = 'B';
    source = openTile(poolB, selectedB);
  }
  if (!source) return {};

  const previews = {};
  for (const tile of side === 'A' ? poolB : poolA) {
    if (!tile.used) previews[tile.id] = computeProduct(source.value, tile.value);
  }
  return side === 'A' ? { previewsB: previews } : { previewsA: previews };
}

export default function GameScreen() {
  const mode = useGameStore((s) => s.mode);
  const phase = useGameStore((s) => s.phase);
  const poolA = useGameStore((s) => s.poolA);
  const poolB = useGameStore((s) => s.poolB);
  const selectedA = useGameStore((s) => s.selectedA);
  const selectedB = useGameStore((s) => s.selectedB);
  const selectFromPoolA = useGameStore((s) => s.selectFromPoolA);
  const selectFromPoolB = useGameStore((s) => s.selectFromPoolB);
  const lastResult = useGameStore((s) => s.lastResult);
  const turn = useGameStore((s) => s.turn);
  const score = useGameStore((s) => s.score);
  const energy = useGameStore((s) => s.energy);
  const roundSpent = useGameStore((s) => s.roundSpent);
  const bank = useGameStore((s) => s.bank);
  const round = useGameStore((s) => s.round);

  const easyMode = useSetting('easyMode');
  const showOptimal = useSetting('showOptimal');
  const [hovered, setHovered] = useState(null);

  const isRun = mode === 'run';
  const target = isRun ? getRunTarget(round) : getTarget(round);
  const maxEnergy = isRun ? RUN_MAX_ENERGY : getBudget(round);
  const pct = Math.min((score / target) * 100, 100);
  const energyPct = Math.max((energy / maxEnergy) * 100, 0);
  const turnsRemaining = Math.min(
    poolA.filter((n) => !n.used).length,
    poolB.filter((n) => !n.used).length
  );

  const needPerTurn =
    turnsRemaining > 0 && score < target
      ? Math.ceil((target - score) / turnsRemaining)
      : null;

  const energyPerTurn =
    turnsRemaining > 0
      ? Math.floor(energy / turnsRemaining)
      : null;

  const spendPar = isRun ? getRunSpendPar(round) : null;

  const fillColor = pct >= 80 ? 'var(--success)' : 'var(--accent)';
  const energyColor = energyPct <= 25 ? 'var(--danger)' : 'var(--gold)';
  const energyLow = energyPct <= 25;

  const awaitingA = selectedB !== null && selectedA === null;
  const awaitingB = selectedA !== null && selectedB === null;

  const { previewsA, previewsB } = easyMode
    ? getPreviews(poolA, poolB, hovered, selectedA, selectedB)
    : {};

  // Optimal indicators: the store's best plays, trimmed to the cheapest
  // finishing move(s) so late-round boards stay readable.
  const bestKeys = useMemo(() => {
    if (!showOptimal || !isRun || phase !== 'selecting') return null;
    return getHighlightedPlays(
      poolA,
      poolB,
      score,
      getRunTarget(round),
      energy,
      RUN_ROUNDS - round + 1
    );
  }, [showOptimal, isRun, phase, poolA, poolB, score, energy, round]);
  const { glowsA, glowsB } = bestKeys ? buildOptimalGlows(bestKeys) : {};

  return (
    <div className={styles.container}>
      <HUD />

      <div className={styles.pools}>
        <Pool
          pool={poolA}
          selectedId={selectedA}
          onSelect={selectFromPoolA}
          awaitingSelection={awaitingA}
          onHover={easyMode ? (id) => setHovered(id === null ? null : { pool: 'A', id }) : undefined}
          previews={previewsA}
          glows={glowsA}
        />

        <div className={styles.times}>&times;</div>

        <Pool
          pool={poolB}
          selectedId={selectedB}
          onSelect={selectFromPoolB}
          awaitingSelection={awaitingB}
          onHover={easyMode ? (id) => setHovered(id === null ? null : { pool: 'B', id }) : undefined}
          previews={previewsB}
          glows={glowsB}
        />
      </div>

      <ProductReveal
        key={turn}
        result={lastResult}
        label={getResultLabel(lastResult, isRun)}
        optimal={isRun}
      />

      <div className={styles.statusPanel}>
        <StatBar
          label="Score"
          pct={pct}
          color={fillColor}
          text={`${score} / ${target}`}
        />
        {isRun ? (
          <span className={`${styles.hint} ${roundSpent > spendPar ? styles.overPar : ''}`}>
            Energy spent this round: {roundSpent} · par ~{spendPar}
          </span>
        ) : (
          needPerTurn !== null && (
            <span className={styles.hint}>
              Need ~{needPerTurn} pts/turn
              {energyPerTurn !== null && ` · budget ~${energyPerTurn}/turn`}
            </span>
          )
        )}
        <StatBar
          variant="energy"
          label="Energy"
          pct={energyPct}
          color={energyColor}
          pulse={energyLow}
          text={isRun ? `${energy} / ${maxEnergy}` : `${energy} energy`}
        />
        {!isRun && <span className={styles.bank}>Bank: {bank.toLocaleString()}</span>}
      </div>

      <Overlay />
    </div>
  );
}
