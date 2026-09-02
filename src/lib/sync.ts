import { db } from './db';
import { baseApi } from './baseApi';

/** True when there is nothing to send or it was accepted; false when it failed. */
/** The extras on a queued line, as the ids the sync speaks in. */
function addOnIdsOf(item: { add_ons?: { addOnId?: string | null }[] }) {
  return (item.add_ons ?? [])
    .map((addOn) => addOn.addOnId)
    .filter((id): id is string => Boolean(id));
}

export async function syncOfflineOrders(dispatch?: any): Promise<boolean> {
  // No navigator.onLine gate. It stays true behind a captive portal and with
  // the backend down, and it can stay false on a machine that is in fact
  // reachable — a request that fails is the only honest test, and failing
  // costs nothing here because the queue is left untouched.
  const allOrders = await db.offline_orders.toArray();
  const unsyncedOrders = allOrders.filter((order) => !order.is_synced);

  if (unsyncedOrders.length === 0) return true;

  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    const response = await fetch("/api/pos/orders/sync", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orders: unsyncedOrders.map(order => ({
          uuid: order.uuid,
          channel: order.channel || 'POS',
          status: order.status || 'PAID',
          paymentMethod: order.payment_method,
          payment_method: order.payment_method,
          subtotal: order.subtotal,
          discountAmount: order.discount_amount,
          discount_amount: order.discount_amount,
          taxRate: order.tax_rate ?? null,
          tax_rate: order.tax_rate ?? null,
          taxAmount: order.tax_amount ?? null,
          tax_amount: order.tax_amount ?? null,
          taxInclusionType: order.tax_inclusion_type ?? null,
          tax_inclusion_type: order.tax_inclusion_type ?? null,
          total: order.total,
          createdAt: order.created_at,
          created_at: order.created_at,
          items: (order.items || []).map((i: any) => ({
            productId: i.product_id || i.productId,
            product_id: i.product_id || i.productId,
            productName: i.product_name || i.productName || i.itemName || i.item_name || 'Item',
            product_name: i.product_name || i.productName || i.itemName || i.item_name || 'Item',
            itemName: i.product_name || i.productName || i.itemName || i.item_name || 'Item',
            item_name: i.product_name || i.productName || i.itemName || i.item_name || 'Item',
            variantId: i.variant_id || i.variantId || null,
            variant_id: i.variant_id || i.variantId || null,
            unitId: i.unit_id || i.unitId || null,
            unit_id: i.unit_id || i.unitId || null,
            unitFactor: i.unit_factor || i.unitFactor || null,
            addOnIds: addOnIdsOf(i),
            add_on_ids: addOnIdsOf(i),
            quantity: i.quantity || 1,
            unitPrice: i.unit_price || i.unitPrice || 0,
            unit_price: i.unit_price || i.unitPrice || 0,
            subtotal: i.subtotal || 0,
            discountAmount: i.discount_amount || i.discountAmount || 0,
            discount_amount: i.discount_amount || i.discountAmount || 0,
          }))
        }))
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      const syncedUuids: string[] = data.syncedUuids && Array.isArray(data.syncedUuids)
        ? data.syncedUuids
        : unsyncedOrders.map(o => o.uuid);

      // Step 3: Remove Synced Orders from Local Storage
      for (const uuid of syncedUuids) {
        const localRecord = await db.offline_orders.where('uuid').equals(uuid).first();
        if (localRecord && localRecord.id) {
          await db.offline_orders.delete(localRecord.id);
        }
      }

      // Step 1: Refetch Orders & Sales Data After Sync
      if (dispatch) {
        dispatch(
          baseApi.util.invalidateTags([
            'PosOrderHistory',
            'PosOrder',
            'PosOpenOrders',
            'SalesProfit',
            'SalesDailyRevenue',
            'PayLaterSales',
            'InventoryStock',
            { type: 'PosReceipts', id: 'LIST' },
          ])
        );
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to sync offline orders:', error);
    return false;
  }
}
