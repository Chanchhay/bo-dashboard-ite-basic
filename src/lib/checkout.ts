import { db, OfflineOrderItem } from './db';
import { offlineDb } from './offline/db';
import { syncOfflineOrders } from './sync';

export async function processOfflineCheckout(params: {
  businessId: string;
  items: OfflineOrderItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'CASH' | 'KHQR' | 'CARD';
}) {
  const uuid = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  // 1. Deduct stock in local IndexedDB
  for (const item of params.items) {
    const product = await db.products.get(item.product_id);
    if (product) {
      const newStock = Math.max(0, product.stock_quantity - item.quantity);
      await db.products.update(item.product_id, { stock_quantity: newStock });
    }
  }

  // 2. Save offline order into local IndexedDB queue (db.offline_orders)
  await db.offline_orders.add({
    uuid,
    channel: 'POS',
    status: 'PAID',
    subtotal: params.subtotal,
    discount_amount: params.discountAmount,
    total: params.total,
    payment_method: params.paymentMethod,
    created_at: createdAt,
    items: params.items,
    is_synced: false
  });

  // Also save to offlineDb.offlineOrders for usePosOffline hook status tracking
  try {
    await offlineDb.offlineOrders.add({
      uuid,
      channel: 'POS',
      status: 'PAID',
      subtotal: params.subtotal,
      discount_amount: params.discountAmount,
      total: params.total,
      currency: 'USD',
      payment_method: params.paymentMethod === 'CARD' ? 'DIGITAL' : params.paymentMethod,
      items: params.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name || "Item",
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: 0,
        subtotal: i.subtotal,
      })),
      created_at: createdAt,
      sync_status: 'PENDING',
    });
  } catch (err) {
    console.warn('Failed to save to offlineDb:', err);
  }

  // 3. Try syncing immediately if online
  if (typeof window !== "undefined" && navigator.onLine) {
    syncOfflineOrders(params.businessId);
  }

  return { success: true, uuid };
}
