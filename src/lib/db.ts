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
  variant_id?: string | null;
  variant_name?: string | null;
  unit_id?: string | null;
  unit_factor?: number | null;
  unit_name?: string | null;
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
  discount_label?: string | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  tax_inclusion_type?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  total: number;
  currency?: string | null;
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

if (typeof window !== "undefined") {
  db.on("versionchange", () => {
    db.close();
    window.location.reload();
  });
}
