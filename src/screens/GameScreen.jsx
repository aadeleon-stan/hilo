import useGameStore from '../store/useGameStore';
import { getTarget } from '../store/gameLogic';
import HUD from '../components/HUD/HUD';
import Pool from '../components/Pool/Pool';
import Overlay from '../components/Overlay/Overlay';
import styles from './GameScreen.module.css';

function getQuality(lowWord, highWord) {
  if (lowWord >= 70 && highWord >= 50) return 'great';
  if (lowWord >= 40 && highWord >= 25) return 'good';
  return 'poor';
}

const qualityLabels = { great: 'Great!', good: 'Nice', poor: null };

export default function GameScreen() {
  const poolA = useGameStore((s) => s.poolA);
  const poolB = useGameStore((s) => s.poolB);
  const selectedA = useGameStore((s) => s.selectedA);
  const selectedB = useGameStore((s) => s.selectedB);
  const selectFromPoolA = useGameStore((s) => s.selectFromPoolA);
  const selectFromPoolB = useGameStore((s) => s.selectFromPoolB);
  const lastResult = useGameStore((s) => s.lastResult);
  const turn = useGameStore((s) => s.turn);
  const score = useGameStore((s) => s.score);
  const money = useGameStore((s) => s.money);
  const round = useGameStore((s) => s.round);

  const target = getTarget(round);
  const pct = Math.min((score / target) * 100, 100);
  const turnsRemaining = Math.min(
    poolA.filter((n) => !n.used).length,
    poolB.filter((n) => !n.used).length
  );

  const quality = lastResult ? getQuality(lastResult.lowWord, lastResult.highWord) : null;
  const label = quality ? qualityLabels[quality] : null;

  const needPerTurn =
    turnsRemaining > 0 && score < target
      ? Math.ceil((target - score) / turnsRemaining)
      : null;

  // Fill color shifts from cyan toward green as progress approaches 100%
  const fillColor = pct >= 80 ? 'var(--success)' : 'var(--accent)';

  // Awaiting selection: one pool has selection, the other doesn't
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
            <span className={styles.hi}>+${lastResult.highWord} money</span>
            {' '}
            <span className={styles.lo}>+{lastResult.lowWord} pts</span>
          </span>
          {label && <span className={styles.label}>{label}</span>}
        </div>
      )}

      <div className={styles.statusPanel}>
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
          <span className={styles.hint}>Need ~{needPerTurn}/turn to win</span>
        )}
        <div className={styles.moneyRow}>
          <span key={money} className={styles.moneyAmount}>${money.toLocaleString()}</span>
          {lastResult && (
            <span key={`add-${turn}`} className={styles.moneyFloat}>
              +${lastResult.highWord}
            </span>
          )}
        </div>
      </div>

      <Overlay />
    </div>
  );
}
