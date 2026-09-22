import { useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { MODES } from '../store/modes';
import { AUTHOR } from '../config';
import { SETTINGS_ENABLED } from '../store/useSettingsStore';
import useDailyStore, { dailyResult } from '../store/useDailyStore';
import HowToPlay from '../components/HowToPlay/HowToPlay';
import ContactModal from '../components/ContactModal/ContactModal';
import SettingsToggles from '../components/SettingsToggles/SettingsToggles';
import styles from './MainMenu.module.css';

// The menu branches: the daily challenge leads, and the longer-form modes
// share a second page.
export default function MainMenu() {
  const startRoguelike = useGameStore((s) => s.startRoguelike);
  const startRun = useGameStore((s) => s.startRun);
  const startClassic = useGameStore((s) => s.startClassic);
  const startPractice = useGameStore((s) => s.startPractice);
  const startDaily = useGameStore((s) => s.startDaily);
  const dailyResults = useDailyStore((s) => s.results);
  const [view, setView] = useState('main');
  const [showHowTo, setShowHowTo] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const howToRef = useRef(null);
  const otherModesRef = useRef(null);
  const contactRef = useRef(null);

  const playedToday = Boolean(dailyResult(dailyResults));

  const otherModes = [
    { label: '[WIP] Roguelike run', mode: MODES.roguelike, start: startRoguelike },
    { label: MODES.run.name, mode: MODES.run, start: startRun },
    { label: MODES.classic.name, mode: MODES.classic, start: startClassic },
  ];

  function closeHowTo() {
    setShowHowTo(false);
    howToRef.current?.focus();
  }

  function closeContact() {
    setShowContact(false);
    contactRef.current?.focus();
  }

  function leaveOtherModes() {
    setView('main');
    otherModesRef.current?.focus();
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
          <button
            ref={otherModesRef}
            className={styles.secondaryBtn}
            onClick={() => setView('otherModes')}
          >
            Other game modes
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
          <h2 className={styles.groupTitle}>Other game modes</h2>
          {otherModes.map(({ label, mode, start }) => (
            <button key={label} className={styles.modeCard} onClick={start}>
              <span className={styles.modeName}>{label}</span>
              <span className={styles.modeBlurb}>{mode.blurb}</span>
            </button>
          ))}
          <button className={styles.linkBtn} onClick={leaveOtherModes}>
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

      <footer className={styles.footer}>
        <span>A game by {AUTHOR}</span>
        <span aria-hidden="true">·</span>
        <button
          ref={contactRef}
          className={styles.footerLink}
          onClick={() => setShowContact(true)}
        >
          Contact
        </button>
      </footer>

      {showHowTo && <HowToPlay onClose={closeHowTo} onStartRun={startRoguelike} />}
      {showContact && <ContactModal onClose={closeContact} />}
    </div>
  );
}
