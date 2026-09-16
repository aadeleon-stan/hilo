import { useMemo, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { useSetting } from '../store/useSettingsStore';
import {
  computeProduct,
  getHighlightedPlays,
  getRunSpendPar,
  RUN_ROUNDS,
} from '../store/gameLogic';
import { MODES } from '../store/modes';
import { moveCost } from '../store/roguelike/effects';
import { tileMatchesStep } from '../store/roguelike/items';
import HUD from '../components/HUD/HUD';
import Pool from '../components/Pool/Pool';
import ProductReveal from '../components/ProductReveal/ProductReveal';
import StatBar from '../components/StatBar/StatBar';
import Overlay from '../components/Overlay/Overlay';
import TargetingBanner from '../components/TargetingBanner/TargetingBanner';
import BoardCharges from '../components/BoardCharges/BoardCharges';
import InventoryBar from '../components/InventoryBar/InventoryBar';
import DraftModal from '../components/DraftModal/DraftModal';
import ShopModal from '../components/ShopModal/ShopModal';
import { buildOptimalGlows } from './optimalGlows';
import styles from './GameScreen.module.css';

function getQuality(lowWord, highWord) {
  if (lowWord >= 70 && highWord <= 10) return 'great';
  if (lowWord >= 40 && highWord <= 25) return 'good';
  return 'poor';
}

const qualityLabels = { great: 'Great!', good: 'Nice', poor: null };

function getResultLabel(result, optimal) {
  if (!result) return null;
  if (result.savedByNet) return 'Safety net! Left at 1 energy';
  if (optimal) {
    if (!result.isBest) return null;
    return result.bonus > 0 ? `Optimal! +${result.bonus} energy` : 'Optimal!';
  }
  return qualityLabels[getQuality(result.lowWord, result.highWord)];
}

// Easy mode: products of the hovered tile (or, failing that, the selected
// tile) with every open tile in the other pool. `score(a, b)` gives the label
// for a Pool A value times a Pool B value.
function getPreviews(poolA, poolB, hovered, selectedA, selectedB, score) {
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
    if (tile.used) continue;
    previews[tile.id] =
      side === 'A' ? score(source.value, tile.value) : score(tile.value, source.value);
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
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const target = useGameStore((s) => s.roundTarget);
  const roundSpent = useGameStore((s) => s.roundSpent);
  const bank = useGameStore((s) => s.bank);
  const round = useGameStore((s) => s.round);
  const runConfig = useGameStore((s) => s.runConfig);
  const tempEffects = useGameStore((s) => s.tempEffects);
  const targeting = useGameStore((s) => s.targeting);

  const easyMode = useSetting('easyMode');
  const showOptimal = useSetting('showOptimal');
  const [hovered, setHovered] = useState(null);

  const rules = MODES[mode];
  const isRoguelike = mode === 'roguelike';
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

  const spendPar = rules.parHints ? getRunSpendPar(round) : null;

  const fillColor = pct >= 80 ? 'var(--success)' : 'var(--accent)';
  const energyColor = energyPct <= 25 ? 'var(--danger)' : 'var(--gold)';
  const energyLow = energyPct <= 25;

  const awaitingA = selectedB !== null && selectedA === null;
  const awaitingB = selectedA !== null && selectedB === null;

  // Roguelike previews show the real cost and points after modifiers.
  const previewScore = isRoguelike
    ? (a, b) => {
        const { cost, points } = moveCost(runConfig, tempEffects, a, b, turn === 0);
        return { highWord: cost, lowWord: points };
      }
    : computeProduct;
  const { previewsA, previewsB } = easyMode && !targeting
    ? getPreviews(poolA, poolB, hovered, selectedA, selectedB, previewScore)
    : {};

  // Optimal indicators: the store's best plays, trimmed to the cheapest
  // finishing move(s) so late-round boards stay readable.
  const bestKeys = useMemo(() => {
    if (!showOptimal || !rules.optimal || phase !== 'selecting') return null;
    return getHighlightedPlays(
      poolA,
      poolB,
      score,
      target,
      energy,
      RUN_ROUNDS - round + 1
    );
  }, [showOptimal, rules.optimal, phase, poolA, poolB, score, target, energy, round]);
  const { glowsA, glowsB } = bestKeys ? buildOptimalGlows(bestKeys) : {};

  const targetableA = targeting ? (tile) => tileMatchesStep(targeting, 'A', tile) : undefined;
  const targetableB = targeting ? (tile) => tileMatchesStep(targeting, 'B', tile) : undefined;

  let hint = null;
  if (rules.parHints) {
    hint = (
      <span className={`${styles.hint} ${roundSpent > spendPar ? styles.overPar : ''}`}>
        Energy spent this round: {roundSpent} · par ~{spendPar}
      </span>
    );
  } else if (rules.bank && needPerTurn !== null) {
    hint = (
      <span className={styles.hint}>
        Need ~{needPerTurn} pts/turn
        {energyPerTurn !== null && ` · budget ~${energyPerTurn}/turn`}
      </span>
    );
  }

  return (
    <div className={styles.container}>
      <HUD />

      {isRoguelike && <TargetingBanner />}

      <div className={styles.pools}>
        <Pool
          label={isRoguelike ? 'Pool A' : undefined}
          pool={poolA}
          selectedId={selectedA}
          onSelect={selectFromPoolA}
          awaitingSelection={awaitingA && !targeting}
          onHover={easyMode ? (id) => setHovered(id === null ? null : { pool: 'A', id }) : undefined}
          previews={previewsA}
          glows={glowsA}
          targetable={targetableA}
        />

        <div className={styles.times}>&times;</div>

        <Pool
          label={isRoguelike ? 'Pool B' : undefined}
          pool={poolB}
          selectedId={selectedB}
          onSelect={selectFromPoolB}
          awaitingSelection={awaitingB && !targeting}
          onHover={easyMode ? (id) => setHovered(id === null ? null : { pool: 'B', id }) : undefined}
          previews={previewsB}
          glows={glowsB}
          targetable={targetableB}
        />
      </div>

      <ProductReveal
        key={turn}
        result={lastResult}
        label={getResultLabel(lastResult, rules.optimal)}
        optimal={rules.optimal}
      />

      <div className={styles.statusPanel}>
        <StatBar
          label="Score"
          pct={pct}
          color={fillColor}
          text={`${score} / ${target}`}
        />
        {hint}
        <StatBar
          variant="energy"
          label="Energy"
          pct={energyPct}
          color={energyColor}
          pulse={energyLow}
          text={rules.carryEnergy ? `${energy} / ${maxEnergy}` : `${energy} energy`}
        />
        {rules.bank && <span className={styles.bank}>Bank: {bank.toLocaleString()}</span>}
      </div>

      {isRoguelike && (
        <>
          <BoardCharges />
          <InventoryBar />
          {phase === 'draft' && <DraftModal />}
          {phase === 'shop' && <ShopModal />}
        </>
      )}

      <Overlay />
    </div>
  );
}
