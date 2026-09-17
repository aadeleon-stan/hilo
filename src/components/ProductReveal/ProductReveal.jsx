import styles from './ProductReveal.module.css';

// Pops the product in as one number, then splits it into the high word
// (energy cost) and low word (points). Remount with a new key to replay.
// A result may carry `cost` and `points` when modifiers changed them (roguelike).
export default function ProductReveal({ result, label, optimal }) {
  if (!result) {
    return (
      <div className={styles.reveal}>
        <span className={styles.prompt}>Pick one number from each pool</span>
      </div>
    );
  }

  const hiDigits = String(result.highWord);
  const loDigits = String(result.lowWord).padStart(2, '0');

  return (
    <div className={styles.reveal}>
      <span className={styles.equation}>
        {result.a} &times; {result.b} =
      </span>
      <div className={styles.product}>
        <div className={`${styles.part} ${styles.hi}`}>
          <span className={styles.digits}>{hiDigits}</span>
          <span className={styles.caption}>&minus;{result.cost ?? result.highWord} energy</span>
        </div>
        <div className={`${styles.part} ${styles.lo}`}>
          <span className={styles.digits}>{loDigits}</span>
          <span className={styles.caption}>+{result.points ?? result.lowWord} pts</span>
        </div>
      </div>
      {label && (
        <span className={`${styles.label} ${optimal ? styles.optimal : ''}`}>
          {label}
        </span>
      )}
    </div>
  );
}
