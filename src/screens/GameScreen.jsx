import useGameStore from '../store/useGameStore';
import {
  getTarget,
  getBudget,
  getRunTarget,
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
} from '../store/gameLogic';
import HUD from '../components/HUD/HUD';
import Pool from '../components/Pool/Pool';
import Overlay from '../components/Overlay/Overlay';
import styles from './GameScreen.module.css';

function getQuality(lowWord, highWord) {
  if (lowWord >= 70 && highWord <= 10) return 'great';
  if (lowWord >= 40 && highWord <= 25) return 'good';
  return 'poor';
}

const qualityLabels = { great: 'Great!', good: 'Nice', poor: null };

function getRunLabel(lastResult) {
  if (!lastResult.isBest) return null;
  return lastResult.bonus > 0 ? `Optimal! +${lastResult.bonus} energy` : 'Optimal!';
}

export default function GameScreen() {
  const mode = useGameStore((s) => s.mode);
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
  const bank = useGameStore((s) => s.bank);
  const round = useGameStore((s) => s.round);

  const isRun = mode === 'run';
  const target = isRun ? getRunTarget(round) : getTarget(round);
  const maxEnergy = isRun ? RUN_MAX_ENERGY : getBudget(round);
  const pct = Math.min((score / target) * 100, 100);
  const energyPct = Math.max((energy / maxEnergy) * 100, 0);
  const turnsRemaining = Math.min(
    poolA.filter((n) => !n.used).length,
    poolB.filter((n) => !n.used).length
  );

  const quality = lastResult ? getQuality(lastResult.lowWord, lastResult.highWord) : null;
  let label = null;
  if (lastResult) {
    label = isRun ? getRunLabel(lastResult) : qualityLabels[quality];
  }

  const needPerTurn =
    turnsRemaining > 0 && score < target
      ? Math.ceil((target - score) / turnsRemaining)
      : null;

  // In a run, energy has to last the remaining rounds, not just this one.
  const roundsLeft = isRun ? RUN_ROUNDS - round + 1 : 1;
  const energyPerTurn =
    turnsRemaining > 0
      ? Math.floor(energy / roundsLeft / turnsRemaining)
      : null;

  const fillColor = pct >= 80 ? 'var(--success)' : 'var(--accent)';
  const energyColor = energyPct <= 25 ? 'var(--danger)' : 'var(--gold)';
  const energyLow = energyPct <= 25;

  const awaitingA = selectedB !== null && selectedA === null;
  const awaitingB = selectedA !== null && selectedB === null;

  return (
    <div className={styles.container}>
      <HUD />

      <div className={styles.pools}>
        <Pool
          pool={poolA}
          selectedId={selectedA}
          onSelect={selectFromPoolA}
          awaitingSelection={awaitingA}
        />

        <div className={styles.times}>&times;</div>

        <Pool
          pool={poolB}
          selectedId={selectedB}
          onSelect={selectFromPoolB}
          awaitingSelection={awaitingB}
        />
      </div>

      {lastResult && (
        <div key={turn} className={`${styles.result} ${styles[quality]}`}>
          <span className={styles.equation}>
            {lastResult.a} &times; {lastResult.b} = {lastResult.product}
          </span>
          <span className={styles.breakdown}>
            <span className={styles.hi}>&minus;{lastResult.highWord} energy</span>
            {' '}
            <span className={styles.lo}>+{lastResult.lowWord} pts</span>
          </span>
          {label && (
            <span className={`${styles.label} ${isRun ? styles.optimal : ''}`}>
              {label}
            </span>
          )}
        </div>
      )}

      <div className={styles.statusPanel}>
        <span className={styles.barLabel}>Score</span>
        <div className={styles.progressRow}>
          <div className={styles.bar}>
            <div
              className={styles.fill}
              style={{ width: `${pct}%`, background: fillColor }}
            />
          </div>
          <span className={styles.scoreText}>{score} / {target}</span>
        </div>
        {needPerTurn !== null && (
          <span className={styles.hint}>
            Need ~{needPerTurn} pts/turn
            {energyPerTurn !== null && ` · budget ~${energyPerTurn}/turn`}
          </span>
        )}
        <span className={styles.barLabel}>Energy</span>
        <div className={styles.energyRow}>
          <div className={`${styles.energyBar} ${energyLow ? styles.energyLow : ''}`}>
            <div
              className={styles.energyFill}
              style={{ width: `${energyPct}%`, background: energyColor }}
            />
          </div>
          <span className={styles.energyText}>
            {isRun ? `${energy} / ${maxEnergy}` : `${energy} energy`}
          </span>
          {lastResult && (
            <span key={`cost-${turn}`} className={styles.energyFloat}>
              &minus;{lastResult.highWord}
            </span>
          )}
        </div>
        {!isRun && <span className={styles.bank}>Bank: {bank.toLocaleString()}</span>}
      </div>

      <Overlay />
    </div>
  );
}
