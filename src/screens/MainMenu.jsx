import { useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { RUN_ROUNDS } from '../store/gameLogic';
import { SETTINGS_ENABLED } from '../store/useSettingsStore';
import HowToPlay from '../components/HowToPlay/HowToPlay';
import SettingsToggles from '../components/SettingsToggles/SettingsToggles';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startRoguelike = useGameStore((s) => s.startRoguelike);
  const startRun = useGameStore((s) => s.startRun);
  const startClassic = useGameStore((s) => s.startClassic);
  const startPractice = useGameStore((s) => s.startPractice);
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
        — but the leading digits cost energy. Clear {RUN_ROUNDS} rounds,
        building up upgrades, items and relics along the way!
      </p>
      <div className={styles.buttons}>
        <button className={styles.playBtn} onClick={startRoguelike}>
          Start Run
        </button>
        <button className={styles.secondaryBtn} onClick={startRun}>
          Arcade
        </button>
        <button className={styles.secondaryBtn} onClick={startClassic}>
          Endless Classic
        </button>
        <button className={styles.secondaryBtn} onClick={startPractice}>
          Practice
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

      {showHowTo && <HowToPlay onClose={closeHowTo} onStartRun={startRoguelike} />}
    </div>
  );
}
