import { db } from './db';
import { baseApi } from './baseApi';

export async function syncOfflineOrders(businessId: string, dispatch?: any) {
  if (typeof window !== "undefined" && !navigator.onLine) return;

  const allOrders = await db.offline_orders.toArray();
  const unsyncedOrders = allOrders.filter((order) => !order.is_synced);

  if (unsyncedOrders.length === 0) return;

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
          ])
        );
      }
    }
  } catch (error) {
    console.error('Failed to sync offline orders:', error);
  }
}
