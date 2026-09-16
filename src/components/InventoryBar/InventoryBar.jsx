import useGameStore from '../../store/useGameStore';
import { ITEMS_BY_ID, itemContext } from '../../store/roguelike/items';
import styles from './InventoryBar.module.css';

const EFFECT_LABELS = {
  freePlay: 'Next play free',
  halfCost: 'Next play half cost',
  doublePoints: 'Next play double points',
  flip: 'Next play flipped',
  highWordBonus: 'Next play scores high digits',
  doubleRefund: 'Double refund',
  safetyNet: 'Safety net',
  twinDraw: 'Twin draw next round',
  extraPick: 'Extra pick next draft',
};

// The player's items with Use and Discard, the effects currently active, and
// the last refusal message. `compact` is the version inside the draft and shop.
export default function InventoryBar({ compact = false }) {
  const inventory = useGameStore((s) => s.inventory);
  const inventorySize = useGameStore((s) => s.runConfig?.inventorySize ?? 0);
  const phase = useGameStore((s) => s.phase);
  const targeting = useGameStore((s) => s.targeting);
  const tempEffects = useGameStore((s) => s.tempEffects);
  const notice = useGameStore((s) => s.notice);
  const activateItem = useGameStore((s) => s.activateItem);
  const discardItem = useGameStore((s) => s.discardItem);

  const context = itemContext(phase);
  const active = Object.keys(EFFECT_LABELS).filter((key) => tempEffects[key]);

  if (compact && inventory.length === 0 && !notice) return null;

  return (
    <section className={`${styles.bar} ${compact ? styles.compact : ''}`} aria-label="Inventory">
      <div className={styles.header}>
        <span className={styles.title}>
          Items {inventory.length}/{inventorySize}
        </span>
        {!compact && active.length > 0 && (
          <span className={styles.effects}>{active.map((key) => EFFECT_LABELS[key]).join(' · ')}</span>
        )}
      </div>

      {inventory.length > 0 ? (
        <ul className={styles.slots}>
          {inventory.map((id, slot) => {
            const item = ITEMS_BY_ID[id];
            const usable = item.usableIn.includes(context);
            const isTargeting =
              targeting?.source.kind === 'item' && targeting.source.slot === slot;
            return (
              <li key={`${id}-${slot}`} className={`${styles.slot} ${isTargeting ? styles.active : ''}`}>
                <button
                  className={styles.use}
                  disabled={!usable}
                  onClick={() => activateItem(slot)}
                  title={item.desc}
                  aria-label={`Use ${item.label}: ${item.desc}`}
                >
                  {item.label}
                </button>
                <button
                  className={styles.discard}
                  onClick={() => discardItem(slot)}
                  aria-label={`Discard ${item.label}`}
                  title="Discard"
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>No items yet. Buy them in the shop after rounds 3, 6 and 9.</p>
      )}

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
