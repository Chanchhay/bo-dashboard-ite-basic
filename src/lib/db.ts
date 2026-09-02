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
  unit_name?: string | null;
  /**
   * The extras rung up with it, named.
   *
   * A tub of pearls empties whichever drink it went into, so the ids are what
   * the sync needs — and the names are what the slip needs, because a receipt
   * printed with no connection cannot go and look them up.
   */
  add_ons?: { addOnId: string; name: string; unitPrice: number }[];
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
  /** What to call the discount on the slip — the coupon code, or the rule's name. */
  discount_label?: string | null;
  /**
   * What was actually charged in tax.
   *
   * The total already includes it, so a sale without these still reconciles —
   * but the slip cannot show a VAT line, and subtotal plus tax will not add up
   * to the total anyone reads back later.
   */
  tax_rate?: number | null;
  tax_amount?: number | null;
  tax_inclusion_type?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  total: number;
  currency?: string;
  payment_method: 'CASH' | 'KHQR' | 'CARD';
  paid_amount?: number;
  change_amount?: number;
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
