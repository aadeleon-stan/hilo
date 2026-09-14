import { useEffect, useState } from 'react';
import SettingsToggles from '../SettingsToggles/SettingsToggles';
import { SETTINGS_ENABLED } from '../../store/useSettingsStore';
import styles from './SettingsDrawer.module.css';

// Gear button that opens a slide-in drawer with the playtest settings.
export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!SETTINGS_ENABLED) return null;

  return (
    <>
      <button
        className={styles.gear}
        onClick={() => setOpen(true)}
        aria-label="Settings"
        aria-expanded={open}
      >
        &#9881;
      </button>

      {open && (
        <div
          className={styles.backdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-drawer-title"
          >
            <div className={styles.header}>
              <h2 id="settings-drawer-title" className={styles.title}>
                Dev settings
              </h2>
              <button
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                autoFocus
              >
                &times;
              </button>
            </div>
            <SettingsToggles />
          </aside>
        </div>
      )}
    </>
  );
}
