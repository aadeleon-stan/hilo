import useGameStore from '../../store/useGameStore';
import {
  PRACTICE_ENERGY_PRESETS,
  PRACTICE_TARGET_PRESETS,
} from '../../store/practice';
import styles from './PracticePanel.module.css';

// The practice round's settings, shown as a section of the HUD gear drawer.
// The learning aids live in that drawer's own section, and leaving practice
// uses its quit button, like every other mode.
export default function PracticePanel({ onDone }) {
  const practiceTarget = useGameStore((s) => s.practiceTarget);
  const practiceMaxEnergy = useGameStore((s) => s.practiceMaxEnergy);
  const setPracticeTarget = useGameStore((s) => s.setPracticeTarget);
  const setPracticeMaxEnergy = useGameStore((s) => s.setPracticeMaxEnergy);
  const resetPracticeRound = useGameStore((s) => s.resetPracticeRound);

  function reset() {
    resetPracticeRound();
    onDone?.();
  }

  return (
    <div className={styles.fields}>
      <label className={styles.field}>
        <span className={styles.label}>Target</span>
        <select
          className={styles.select}
          value={practiceTarget}
          onChange={(e) => setPracticeTarget(Number(e.target.value))}
        >
          {PRACTICE_TARGET_PRESETS.map((preset) => (
            <option key={preset.target} value={preset.target}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Max energy</span>
        <select
          className={styles.select}
          value={practiceMaxEnergy}
          onChange={(e) => setPracticeMaxEnergy(Number(e.target.value))}
        >
          {PRACTICE_ENERGY_PRESETS.map((energy) => (
            <option key={energy} value={energy}>
              {energy}
            </option>
          ))}
        </select>
      </label>

      <button className={styles.reset} onClick={reset}>
        Reset round
      </button>
      <p className={styles.note}>Changing a setting starts a fresh round.</p>
    </div>
  );
}
