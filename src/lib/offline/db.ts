import Dexie, { type Table } from "dexie";
import type { ChannelItem } from "@/lib/api/sales-channels";
import type { LocalCart } from "@/lib/pos/local-cart";

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
  }
}

export const offlineDb = new PosOfflineDatabase();
