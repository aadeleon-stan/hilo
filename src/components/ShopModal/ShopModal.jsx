import useGameStore from '../../store/useGameStore';
import { RELICS_BY_ID } from '../../store/roguelike/relics';
import { ITEMS_BY_ID } from '../../store/roguelike/items';
import { itemPrice } from '../../store/roguelike/shop';
import InventoryBar from '../InventoryBar/InventoryBar';
import Modal from '../Modal/Modal';
import styles from '../Modal/Modal.module.css';

// The shop: first a free pick of 1 of 2 relics (scheduled shops only), then
// items for sale.
export default function ShopModal() {
  const shop = useGameStore((s) => s.shop);
  const money = useGameStore((s) => s.money);
  const inventory = useGameStore((s) => s.inventory);
  const runConfig = useGameStore((s) => s.runConfig);
  const takeRelic = useGameStore((s) => s.takeRelic);
  const buyItem = useGameStore((s) => s.buyItem);
  const leaveShop = useGameStore((s) => s.leaveShop);

  if (!shop) return null;

  const choosingRelic = shop.relicChoice.length > 0 && !shop.relicTaken;
  const inventoryFull = inventory.length >= runConfig.inventorySize;

  if (choosingRelic) {
    return (
      <Modal
        titleId="shop-title"
        title="Shop: choose a relic"
        subtitle="Free. Relics last for the rest of the run."
        focusKey="relics"
      >
        <div className={styles.cards}>
          {shop.relicChoice.map((id, i) => {
            const relic = RELICS_BY_ID[id];
            return (
              <button key={id} className={styles.card} onClick={() => takeRelic(i)}>
                <span className={styles.tag}>Relic</span>
                <span className={styles.cardTitle}>{relic.label}</span>
                <span className={styles.cardDesc}>{relic.desc}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titleId="shop-title"
      title="Shop"
      subtitle={`You have $${money}${shop.voucher ? ' · voucher active: half price' : ''}.`}
      focusKey="items"
    >
      <div className={styles.cards}>
        {shop.items.map((offer, i) => {
          const item = ITEMS_BY_ID[offer.id];
          const price = itemPrice(runConfig, shop, offer.id);
          let note = `$${price}`;
          if (offer.sold) note = 'Sold';
          else if (inventoryFull) note = `$${price} · inventory full`;
          else if (money < price) note = `$${price} · can't afford`;
          return (
            <button
              key={`${offer.id}-${i}`}
              className={styles.card}
              disabled={offer.sold || inventoryFull || money < price}
              onClick={() => buyItem(i)}
              aria-label={`Buy ${item.label} for $${price}`}
            >
              <span className={styles.tag}>{note}</span>
              <span className={styles.cardTitle}>{item.label}</span>
              <span className={styles.cardDesc}>{item.desc}</span>
            </button>
          );
        })}
      </div>
      <InventoryBar compact />
      <div className={styles.actions}>
        <button className={styles.primary} onClick={leaveShop}>
          {shop.returnTo ? 'Close shop' : 'Leave shop'}
        </button>
      </div>
    </Modal>
  );
}
