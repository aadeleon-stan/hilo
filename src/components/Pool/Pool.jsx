import styles from './Pool.module.css';

export default function Pool({ pool, selectedId, onSelect, awaitingSelection }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {pool.map((item) => (
          <button
            key={item.id}
            className={`${styles.cell} ${item.used ? styles.used : ''} ${
              selectedId === item.id ? styles.selected : ''
            } ${awaitingSelection && !item.used && selectedId !== item.id ? styles.awaiting : ''}`}
            disabled={item.used}
            onClick={() => onSelect(item.id)}
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  );
}
