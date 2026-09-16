import { useEffect, useState } from 'react';
import useGameStore from '../../store/useGameStore';
import SettingsToggles from '../SettingsToggles/SettingsToggles';
import { SETTINGS_ENABLED, settingsAvailable } from '../../store/useSettingsStore';
import { MODES } from '../../store/modes';
import styles from './SettingsDrawer.module.css';

// Gear button that opens the in-game menu drawer: abandoning the current game
// (all builds, with a confirm step) and the playtest settings (dev builds, and
// roguelike runs in any build).
export default function SettingsDrawer() {
  const mode = useGameStore((s) => s.mode);
  const resetGame = useGameStore((s) => s.resetGame);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirming(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const { quitLabel, quitPrompt } = MODES[mode];

  return (
    <>
      <button
        className={styles.gear}
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
      >
        &#9881;
      </button>

      {open && (
        <div
          className={styles.backdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-menu-title"
          >
            <div className={styles.header}>
              <h2 id="game-menu-title" className={styles.title}>
                Menu
              </h2>
              <button
                className={styles.close}
                onClick={close}
                aria-label="Close menu"
                autoFocus
              >
                &times;
              </button>
            </div>

            <section className={styles.section}>
              {confirming ? (
                <div className={styles.confirm} role="alert">
                  <p className={styles.prompt}>{quitPrompt}</p>
                  <div className={styles.confirmActions}>
                    {/* Focus Cancel, not the destructive action. */}
                    <button
                      className={styles.cancel}
                      onClick={() => setConfirming(false)}
                      autoFocus
                    >
                      Cancel
                    </button>
                    <button className={styles.danger} onClick={resetGame}>
                      {quitLabel}
                    </button>
                  </div>
                </div>
              ) : (
                <button className={styles.danger} onClick={() => setConfirming(true)}>
                  {quitLabel}
                </button>
              )}
            </section>

            {settingsAvailable(mode) && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {SETTINGS_ENABLED ? 'Dev settings' : 'Playtest aids'}
                </h3>
                <SettingsToggles />
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
