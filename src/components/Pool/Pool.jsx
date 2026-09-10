import styles from './Pool.module.css';

export default function Pool({ pool, selectedId, onSelect, label }) {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.label}>{label}</h3>
      <div className={styles.grid}>
        {pool.map((item) => (
          <button
            key={item.id}
            className={`${styles.cell} ${item.used ? styles.used : ''} ${
              selectedId === item.id ? styles.selected : ''
            }`}
            disabled={item.used}
            onClick={() => onSelect(item.id)}
          >
            {item.used ? '' : item.value}
          </button>
        ))}
      </div>
    </div>
  );
}
