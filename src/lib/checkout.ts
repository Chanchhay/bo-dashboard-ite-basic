import { db, OfflineOrderItem } from './db';
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

  /*
   * One queue.
   *
   * This used to write the sale to a second table as well, whose copy of each
   * line dropped the option and the pack it was sold as. Whichever landed
   * first won, and the backend then skipped the other as a duplicate — so a
   * sale of a variant could reconcile against the item's own stock instead of
   * the option's, and nothing downstream could tell.
   */
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

  // Try syncing immediately; a failure just leaves it queued.
  if (typeof window !== "undefined" && navigator.onLine) {
    syncOfflineOrders(params.businessId);
  }

  return { success: true, uuid };
}
