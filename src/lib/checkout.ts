import { db, OfflineOrderItem } from './db';
import { syncOfflineOrders } from './sync';

export async function processOfflineCheckout(params: {
  items: OfflineOrderItem[];
  subtotal: number;
  discountAmount: number;
  discountLabel?: string | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  taxInclusionType?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  total: number;
  currency?: string | null;
  paidAmount?: number;
  changeAmount?: number;
  paymentMethod: 'CASH' | 'KHQR' | 'CARD';
}) {
  const uuid = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  await db.offline_orders.add({
    uuid,
    channel: 'POS',
    status: 'PAID',
    subtotal: params.subtotal,
    discount_amount: params.discountAmount,
    discount_label: params.discountLabel ?? null,
    tax_rate: params.taxRate ?? null,
    tax_amount: params.taxAmount ?? null,
    tax_inclusion_type: params.taxInclusionType ?? null,
    total: params.total,
    currency: params.currency,
    paid_amount: params.paidAmount,
    change_amount: params.changeAmount,
    payment_method: params.paymentMethod,
    created_at: createdAt,
    items: params.items,
    is_synced: false
  });

  if (typeof window !== "undefined" && navigator.onLine) {
    void syncOfflineOrders();
  }

  return { success: true, uuid };
}
