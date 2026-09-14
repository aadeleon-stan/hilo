import useSettingsStore, { SETTINGS_ENABLED } from '../../store/useSettingsStore';
import styles from './SettingsToggles.module.css';

// Playtest setting checkboxes, shared by the main menu and the in-game drawer.
export default function SettingsToggles() {
  const easyMode = useSettingsStore((s) => s.easyMode);
  const showOptimal = useSettingsStore((s) => s.showOptimal);
  const toggleEasyMode = useSettingsStore((s) => s.toggleEasyMode);
  const toggleShowOptimal = useSettingsStore((s) => s.toggleShowOptimal);

  if (!SETTINGS_ENABLED) return null;

  return (
    <div className={styles.toggles}>
      <label className={styles.toggle}>
        <input type="checkbox" checked={easyMode} onChange={toggleEasyMode} />
        <span>
          Easy mode
          <span className={styles.note}>Show products on hover</span>
        </span>
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={showOptimal} onChange={toggleShowOptimal} />
        <span>
          Optimal indicators
          <span className={styles.note}>Glow around best plays (Run mode only)</span>
        </span>
      </label>
    </div>
  );
}
