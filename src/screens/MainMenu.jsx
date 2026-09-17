import { useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { MODES } from '../store/modes';
import { SETTINGS_ENABLED } from '../store/useSettingsStore';
import useDailyStore, { dailyResult } from '../store/useDailyStore';
import HowToPlay from '../components/HowToPlay/HowToPlay';
import SettingsToggles from '../components/SettingsToggles/SettingsToggles';
import styles from './MainMenu.module.css';

// The menu branches: the modes that stand alone sit on the front page, and
// the two score-chasing modes share a second page.
export default function MainMenu() {
  const startRoguelike = useGameStore((s) => s.startRoguelike);
  const startRun = useGameStore((s) => s.startRun);
  const startClassic = useGameStore((s) => s.startClassic);
  const startPractice = useGameStore((s) => s.startPractice);
  const startDaily = useGameStore((s) => s.startDaily);
  const dailyResults = useDailyStore((s) => s.results);
  const [view, setView] = useState('main');
  const [showHowTo, setShowHowTo] = useState(false);
  const howToRef = useRef(null);
  const scoreAttackRef = useRef(null);

  const playedToday = Boolean(dailyResult(dailyResults));

  function closeHowTo() {
    setShowHowTo(false);
    howToRef.current?.focus();
  }

  function leaveScoreAttack() {
    setView('main');
    scoreAttackRef.current?.focus();
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HiLo</h1>
      <p className={styles.description}>
        Pick two numbers and multiply them. The last two digits score points
        — but the leading digits cost energy.
      </p>

      {view === 'main' ? (
        <div className={styles.buttons}>
          <button className={styles.playBtn} onClick={startDaily}>
            Daily challenge{playedToday && ' ✓'}
          </button>
          <button className={styles.secondaryBtn} onClick={startRoguelike}>
            [WIP] Roguelike run
          </button>
          <button
            ref={scoreAttackRef}
            className={styles.secondaryBtn}
            onClick={() => setView('scoreAttack')}
          >
            Score Attack modes
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
      ) : (
        <div className={styles.buttons}>
          <h2 className={styles.groupTitle}>Score Attack modes</h2>
          {[
            { mode: MODES.run, start: startRun },
            { mode: MODES.classic, start: startClassic },
          ].map(({ mode, start }) => (
            <button key={mode.name} className={styles.modeCard} onClick={start}>
              <span className={styles.modeName}>{mode.name}</span>
              <span className={styles.modeBlurb}>{mode.blurb}</span>
            </button>
          ))}
          <button className={styles.linkBtn} onClick={leaveScoreAttack}>
            Back to main menu
          </button>
        </div>
      )}

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
