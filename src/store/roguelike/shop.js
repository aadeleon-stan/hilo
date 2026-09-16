import { SHOP_ITEM_COUNT } from './constants';
import { SHOP_ITEMS, ITEMS_BY_ID } from './items';
import { buildRelicChoice } from './relics';
import { weightedSample } from './upgrades';

// A shop: an optional free relic choice, then distinct items for sale.
// returnTo is the phase to go back to when the shop was opened by the
// Shopping app, or null for a scheduled shop (leaving starts the next round).
export function buildShop(cfg, owned, { withRelics, returnTo = null }) {
  return {
    relicChoice: withRelics ? buildRelicChoice(cfg, owned) : [],
    relicTaken: false,
    items: weightedSample(SHOP_ITEMS, SHOP_ITEM_COUNT, () => 1).map((item) => ({
      id: item.id,
      sold: false,
    })),
    voucher: false,
    returnTo,
  };
}

// Price after the Loyalty card relic and a Discount voucher.
export function itemPrice(cfg, shop, itemId) {
  let price = ITEMS_BY_ID[itemId].price * (1 - cfg.shopDiscount);
  if (shop.voucher) price /= 2;
  return Math.floor(price);
}
