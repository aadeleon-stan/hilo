import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

// Dialog shell for the roguelike's draft and shop, in the HowToPlay style.
// These steps can't be dismissed, so Escape only calls onEscape (if given).
// Focus moves into the dialog when it opens and whenever focusKey changes.
export default function Modal({ titleId, title, subtitle, onEscape, focusKey, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const first = ref.current?.querySelector('button:not(:disabled)');
    first?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!onEscape) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onEscape();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onEscape]);

  return (
    <div className={styles.backdrop}>
      <div
        ref={ref}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
