import useGameStore from '../../store/useGameStore';
import { getTarget } from '../../store/gameLogic';
import styles from './HUD.module.css';

export default function HUD() {
  const round = useGameStore((s) => s.round);
  const score = useGameStore((s) => s.score);
  const money = useGameStore((s) => s.money);
  const target = getTarget(round);
  const pct = Math.min((score / target) * 100, 100);

  return (
    <div className={styles.hud}>
      <div className={styles.stat}>
        <span className={styles.label}>Round</span>
        <span className={styles.value}>{round}</span>
      </div>

      <div className={styles.progress}>
        <span className={styles.label}>
          Score: {score} / {target}
        </span>
        <div className={styles.bar}>
          <div
            className={styles.fill}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Money</span>
        <span className={`${styles.value} ${styles.money}`}>${money}</span>
      </div>
    </div>
  );
}
