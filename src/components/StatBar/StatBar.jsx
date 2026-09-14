import styles from './StatBar.module.css';

// Labeled progress bar used for score and energy. Renders as siblings so the
// parent's flex column controls spacing. fillDelay overrides the default
// transition delay, which waits for ProductReveal's split.
export default function StatBar({
  label,
  pct,
  color,
  text,
  variant = 'score',
  pulse = false,
  fillDelay,
}) {
  const fillStyle = { width: `${pct}%`, background: color };
  if (fillDelay !== undefined) fillStyle['--fill-delay'] = fillDelay;

  return (
    <>
      <span className={styles.label}>{label}</span>
      <div className={`${styles.row} ${styles[variant]}`}>
        <div className={`${styles.track} ${pulse ? styles.pulse : ''}`}>
          <div className={styles.fill} style={fillStyle} />
        </div>
        <span className={styles.text}>{text}</span>
      </div>
    </>
  );
}
