import useGameStore from '../../store/useGameStore';
import { RUN_ROUNDS } from '../../store/gameLogic';
import styles from './HUD.module.css';

export default function HUD() {
  const round = useGameStore((s) => s.round);
  const mode = useGameStore((s) => s.mode);
  const poolA = useGameStore((s) => s.poolA);
  const poolB = useGameStore((s) => s.poolB);

  const turnsLeft = Math.min(
    poolA.filter((n) => !n.used).length,
    poolB.filter((n) => !n.used).length
  );

  return (
    <div className={styles.hud}>
      <span className={styles.info}>
        Round {round}{mode === 'run' && ` / ${RUN_ROUNDS}`}
      </span>
      <span className={styles.info}>{turnsLeft} turns left</span>
    </div>
  );
}
