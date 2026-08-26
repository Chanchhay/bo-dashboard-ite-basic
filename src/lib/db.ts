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
