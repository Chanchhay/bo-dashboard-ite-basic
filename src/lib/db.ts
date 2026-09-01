import Dexie, { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

export interface OfflineOrderItem {
  product_id: string;
  product_name?: string;
  /**
   * Which shelf the sale came off, and how much of it.
   *
   * Without these the sync tells the backend only that one of something was
   * sold: an option comes off the item's total instead of its own balance,
   * and a pack of twelve reduces stock by one. The sale reconciles; the count
   * behind it does not.
   */
  variant_id?: string | null;
  variant_name?: string | null;
  unit_id?: string | null;
  unit_factor?: number | null;
  /** The extras rung up with it. A tub of pearls empties whichever drink it went into. */
  add_on_ids?: string[];
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OfflineOrder {
  id?: number;
  uuid: string;
  channel: 'POS';
  status: 'PAID';
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: 'CASH' | 'KHQR' | 'CARD';
  created_at: string;
  items: OfflineOrderItem[];
  is_synced: boolean;
}

class PosDatabase extends Dexie {
  products!: Table<LocalProduct>;
  offline_orders!: Table<OfflineOrder>;

  constructor() {
    super('PosDatabase');
    this.version(1).stores({
      products: 'id, name',
      offline_orders: '++id, uuid, is_synced'
    });
  }
}

export const db = new PosDatabase();
