import { useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { RUN_ROUNDS } from '../store/gameLogic';
import { SETTINGS_ENABLED } from '../store/useSettingsStore';
import HowToPlay from '../components/HowToPlay/HowToPlay';
import SettingsToggles from '../components/SettingsToggles/SettingsToggles';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startRun = useGameStore((s) => s.startRun);
  const startClassic = useGameStore((s) => s.startClassic);
  const [showHowTo, setShowHowTo] = useState(false);
  const howToRef = useRef(null);

  function closeHowTo() {
    setShowHowTo(false);
    howToRef.current?.focus();
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HiLo</h1>
      <p className={styles.description}>
        Pick two numbers and multiply them. The last two digits score points
        — but the leading digits cost energy. Clear {RUN_ROUNDS} rounds on a
        single energy supply!
      </p>
      <div className={styles.buttons}>
        <button className={styles.playBtn} onClick={startRun}>
          Start Run
        </button>
        <button className={styles.secondaryBtn} onClick={startClassic}>
          Endless Classic
        </button>
        <button
          ref={howToRef}
          className={styles.linkBtn}
          onClick={() => setShowHowTo(true)}
        >
          How to play
        </button>
      </div>

      {SETTINGS_ENABLED && (
        <section className={styles.devSettings} aria-labelledby="dev-settings-title">
          <h2 id="dev-settings-title" className={styles.devTitle}>
            Dev settings
          </h2>
          <SettingsToggles />
        </section>
      )}

      {showHowTo && <HowToPlay onClose={closeHowTo} onStartRun={startRun} />}
    </div>
  );
}
