import { useEffect } from 'react';
import useGameStore from '../../store/useGameStore';
import { ITEMS_BY_ID } from '../../store/roguelike/items';
import styles from './TargetingBanner.module.css';

// Prompt for an item or charge that's choosing tiles or a pool, with Cancel.
export default function TargetingBanner() {
  const targeting = useGameStore((s) => s.targeting);
  const targetPool = useGameStore((s) => s.targetPool);
  const cancelTargeting = useGameStore((s) => s.cancelTargeting);

  useEffect(() => {
    if (!targeting) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') cancelTargeting();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [targeting, cancelTargeting]);

  if (!targeting) return null;

  const item = ITEMS_BY_ID[targeting.itemId];
  const step = item.steps[targeting.step];
  const name = targeting.source.kind === 'charge'
    ? targeting.source.charge === 'reroll' ? 'Reroll' : 'Free digit swap'
    : item.label;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.text}>
        <span className={styles.name}>
          {name}
          {item.steps.length > 1 && ` · step ${targeting.step + 1} of ${item.steps.length}`}
        </span>
        <span className={styles.prompt}>{step.prompt}</span>
        {targeting.error && <span className={styles.error}>{targeting.error}</span>}
      </div>
      <div className={styles.actions}>
        {step.select === 'pool' &&
          ['A', 'B'].map((pool) => (
            <button key={pool} className={styles.pool} onClick={() => targetPool(pool)}>
              Pool {pool}
            </button>
          ))}
        <button className={styles.cancel} onClick={cancelTargeting}>
          Cancel
        </button>
      </div>
    </div>
  );
}
