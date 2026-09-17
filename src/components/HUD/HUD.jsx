import useGameStore from '../../store/useGameStore';
import { MODES } from '../../store/modes';
import SettingsDrawer from '../SettingsDrawer/SettingsDrawer';
import styles from './HUD.module.css';

export default function HUD() {
  const round = useGameStore((s) => s.round);
  const mode = useGameStore((s) => s.mode);
  const money = useGameStore((s) => s.money);
  const poolA = useGameStore((s) => s.poolA);
  const poolB = useGameStore((s) => s.poolB);

  const rules = MODES[mode];
  const turnsLeft = Math.min(
    poolA.filter((n) => !n.used).length,
    poolB.filter((n) => !n.used).length
  );

  return (
    <div className={styles.hud}>
      {/* Single-round modes name themselves instead of counting to one. */}
      {rules.rounds === 1 ? (
        <span className={styles.mode}>{rules.name}</span>
      ) : (
        <span className={styles.info}>
          Round {round}{rules.rounds && ` / ${rules.rounds}`}
        </span>
      )}
      <div className={styles.right}>
        {rules.money && (
          <span className={styles.money} aria-label={`Money: ${money}`}>
            ${money}
          </span>
        )}
        <span className={styles.info}>{turnsLeft} turns left</span>
        <SettingsDrawer />
      </div>
    </div>
  );
}
