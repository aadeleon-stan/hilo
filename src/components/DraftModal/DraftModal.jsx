import useGameStore from '../../store/useGameStore';
import { UPGRADES_BY_ID } from '../../store/roguelike/upgrades';
import InventoryBar from '../InventoryBar/InventoryBar';
import Modal from '../Modal/Modal';
import styles from '../Modal/Modal.module.css';

// The draft after each round won: pick a card (then a pool, for per-pool
// cards) or decline.
export default function DraftModal() {
  const offers = useGameStore((s) => s.draftOffers);
  const pending = useGameStore((s) => s.pendingPoolPick);
  const runConfig = useGameStore((s) => s.runConfig);
  const draftPicks = useGameStore((s) => s.draftPicks);
  const extraPick = useGameStore((s) => s.tempEffects.extraPick);
  const pickUpgrade = useGameStore((s) => s.pickUpgrade);
  const choosePool = useGameStore((s) => s.choosePool);
  const cancelPoolPick = useGameStore((s) => s.cancelPoolPick);
  const declineDraft = useGameStore((s) => s.declineDraft);

  const allowed = extraPick ? 2 : 1;
  const pendingCard = pending !== null ? UPGRADES_BY_ID[offers[pending]] : null;

  if (pendingCard) {
    return (
      <Modal
        titleId="draft-title"
        title={pendingCard.label}
        subtitle="Choose the pool to apply it to."
        onEscape={cancelPoolPick}
        focusKey={`pool-${pending}`}
      >
        <p className={styles.cardDesc}>{pendingCard.desc}</p>
        <div className={styles.row}>
          {['A', 'B'].map((pool) => {
            const eligible = pendingCard.eligible(runConfig, pool);
            const note = eligible && pendingCard.poolNote?.(runConfig, pool);
            return (
              <button
                key={pool}
                className={styles.card}
                disabled={!eligible}
                onClick={() => choosePool(pool)}
              >
                <span className={styles.cardTitle}>Pool {pool}</span>
                <span className={styles.cardDesc}>{eligible ? note || 'Apply here' : 'Not available'}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={cancelPoolPick}>
            Back
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titleId="draft-title"
      title="Choose an upgrade"
      subtitle={
        allowed > 1
          ? `Extra pick: take ${allowed - draftPicks} more.`
          : 'Pick one, or decline.'
      }
      focusKey={`cards-${offers.join()}`}
    >
      <div className={styles.cards}>
        {offers.map((id, i) => {
          const card = UPGRADES_BY_ID[id];
          return (
            <button
              key={id}
              className={`${styles.card} ${card.cursed ? styles.cursed : ''}`}
              onClick={() => pickUpgrade(i)}
            >
              {(card.cursed || card.needsPool) && (
                <span className={`${styles.tag} ${card.cursed ? styles.cursedTag : ''}`}>
                  {card.cursed ? 'Cursed · choose a pool' : 'Choose a pool'}
                </span>
              )}
              <span className={styles.cardTitle}>{card.label}</span>
              <span className={styles.cardDesc}>{card.desc}</span>
            </button>
          );
        })}
      </div>
      <InventoryBar compact />
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={declineDraft}>
          {draftPicks > 0 ? 'Done' : 'Decline'}
        </button>
      </div>
    </Modal>
  );
}
