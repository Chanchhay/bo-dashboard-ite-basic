import type { PosOrder } from "@/lib/api/pos-order";

// In-memory store for synced offline orders on Next.js server
const syncedOrders: PosOrder[] = [];

export function addSyncedOrder(rawOfflineOrder: any): PosOrder {
  const uuid = rawOfflineOrder.uuid || `offline-${Date.now()}`;
  const existing = syncedOrders.find((o) => o.id === uuid);
  if (existing) return existing;

  const timestamp = rawOfflineOrder.created_at || new Date().toISOString();
  const invoiceNumber = `INV-${new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

  const orderItems = (rawOfflineOrder.items || []).map((item: any, idx: number) => ({
    id: `item-${uuid}-${idx}`,
    itemId: item.product_id || `prod-${idx}`,
    itemName: item.productName || item.product_name || item.itemName || item.item_name || "Item",
    quantity: item.quantity || 1,
    unitPrice: item.unit_price || 0,
    discountAmount: item.discount_amount || 0,
    lineTotal: item.subtotal || (item.quantity || 1) * (item.unit_price || 0),
    variantId: null,
    unitId: null,
  }));

  const subtotal = rawOfflineOrder.subtotal ?? orderItems.reduce((s: number, i: any) => s + i.lineTotal, 0);
  const discountAmount = rawOfflineOrder.discount_amount ?? 0;
  const total = rawOfflineOrder.total ?? Math.max(0, subtotal - discountAmount);

  const syncedOrder: PosOrder = {
    id: uuid,
    businessId: "1",
    customerId: null,
    invoiceNumber,
    channel: "POS",
    status: "PAID",
    subtotal,
    discountAmount,
    taxAmount: 0,
    total,
    note: "Synced Offline Sale",
    items: orderItems,
    createdDate: timestamp,
    updatedDate: timestamp,
  } as PosOrder;

  syncedOrders.unshift(syncedOrder);
  return syncedOrder;
}

export function getSyncedOrders(url?: URL): PosOrder[] {
  if (!url) return syncedOrders;

  const statusParam = url.searchParams.get("status")?.toUpperCase();
  const channelParam = url.searchParams.get("channel")?.toUpperCase();
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  return syncedOrders.filter((order) => {
    if (statusParam && statusParam !== "ALL" && order.status.toUpperCase() !== statusParam) {
      return false;
    }
    if (channelParam && channelParam !== "ALL" && order.channel.toUpperCase() !== channelParam) {
      return false;
    }
    if (fromParam && order.createdDate) {
      const fromDate = new Date(fromParam).setHours(0, 0, 0, 0);
      const orderDate = new Date(order.createdDate).setHours(0, 0, 0, 0);
      if (orderDate < fromDate) return false;
    }
    if (toParam && order.createdDate) {
      const toDate = new Date(toParam).setHours(23, 59, 59, 999);
      const orderDate = new Date(order.createdDate).getTime();
      if (orderDate > toDate) return false;
    }
    return true;
  });
}
