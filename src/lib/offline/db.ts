import Dexie, { type Table } from "dexie";
import type { ChannelItem } from "@/lib/api/sales-channels";
import type { LocalCart } from "@/lib/pos/local-cart";
import type { CachedImage } from "@/lib/offline/image-cache";

export interface OfflineCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  code?: string | null;
}

export interface OfflineOrder {
  localId?: number;
  uuid: string;
  order_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  cashier_id?: string | null;
  cashier_name?: string | null;
  register_id?: string | null;
  channel: "POS";
  status: "PAID" | "PENDING";
  subtotal: number;
  discount_amount: number;
  total: number;
  currency: string;
  payment_method: "CASH" | "DIGITAL" | "KHQR";
  amount_received?: number;
  change_amount?: number;
  items: Array<{
    product_id: string;
    product_name: string;
    variant_id?: string | null;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    subtotal: number;
  }>;
  created_at: string;
  sync_status: "PENDING" | "SYNCED" | "FAILED";
  sync_error?: string;
}

export interface OfflineStockItem {
  key: string;
  itemId: string;
  variantId?: string | null;
  quantityOnHand: number;
}

export class PosOfflineDatabase extends Dexie {
  channelItems!: Table<ChannelItem, string>;
  customers!: Table<OfflineCustomer, string>;
  /**
   * Nothing writes here any more.
   *
   * Offline sales queue in `PosDatabase.offline_orders`; this table held a
   * second copy whose lines had lost the option and the pack they were sold
   * as. The declaration stays so an upgrade does not have to drop a store that
   * may still hold rows from before the change — they have a twin in the real
   * queue, so nothing is waiting on them.
   *
   * @deprecated
   */
  offlineOrders!: Table<OfflineOrder, number>;
  stockList!: Table<OfflineStockItem, string>;
  /** The cart being rung up. One row, whose key is a constant. */
  cart!: Table<LocalCart, string>;
  /** Catalogue pictures, so the grid is not forty identical tiles offline. */
  images!: Table<CachedImage, string>;

  constructor() {
    super("iPOS_Offline_DB");

    this.version(1).stores({
      channelItems: "item.id, item.name, item.barcode",
      customers: "id, name, phone",
      offlineOrders: "++localId, uuid, sync_status, created_at",
      stockList: "key, itemId",
    });

    // The cart moved off the server and onto the device. Only the key is
    // indexed: there is one row, and nothing ever queries it by anything else.
    this.version(2).stores({
      cart: "id",
    });

    // Keyed by the URL it was fetched from, which is the only way anything
    // asks for it.
    this.version(3).stores({
      images: "url",
    });
  }
}

export const offlineDb = new PosOfflineDatabase();

/*
 * A schema upgrade (a new deploy, a code change picked up by Fast Refresh)
 * needs every other open tab's connection out of the way before it can run —
 * IndexedDB only allows one version at a time. Without this handler, an
 * older tab just sits there holding the lock, and the tab trying to open the
 * newer version blocks forever waiting for it: `useLiveQuery` never gets its
 * first value, so anything reading the cart (`useCurrentCart`'s `isLoading`)
 * never leaves "loading". Closing here is what lets the other tab through;
 * reloading is what gets this one caught up rather than left running stale
 * code against a database it can no longer talk to.
 */
if (typeof window !== "undefined") {
    offlineDb.on("versionchange", () => {
        offlineDb.close();
        window.location.reload();
    });
}
