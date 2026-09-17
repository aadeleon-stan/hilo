import styles from './MoveList.module.css';

// The round's plays in order, with optimal ones marked. Shared by the practice
// stats and the daily result.
export default function MoveList({ moves }) {
  if (moves.length === 0) return <p className={styles.empty}>No plays yet.</p>;

  return (
    <ol className={styles.list}>
      {moves.map((move, i) => (
        <li key={i} className={`${styles.move} ${move.isBest ? styles.optimal : ''}`}>
          <span className={styles.turn}>{i + 1}</span>
          <span className={styles.equation}>
            {move.a} &times; {move.b} = {move.product}
          </span>
          <span className={styles.cost}>&minus;{move.cost}</span>
          <span className={styles.points}>+{move.points}</span>
          {move.isBest && <span className={styles.tag}>Optimal</span>}
        </li>
      ))}
    </ol>
  );
}
