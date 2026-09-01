import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { PosOrder, PosOrderItem } from "@/lib/api/pos-order";

function formatInvoiceNumber(rawUuid: string, timestamp: string): string {
    if (rawUuid && (rawUuid.startsWith("INV-") || rawUuid.startsWith("offline-"))) {
        if (rawUuid.startsWith("INV-")) return rawUuid;
        const dateStr = new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, "");
        const shortId = rawUuid.replace("offline-", "").slice(-5).toUpperCase();
        return `INV-${dateStr}-${shortId}`;
    }
    const dateStr = new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, "");
    return `INV-${dateStr}-00001`;
}

export function offlineOrderToPosOrder(offline: any): PosOrder {
    const uuid = offline.uuid || `offline-${Date.now()}`;
    const timestamp = offline.created_at || new Date().toISOString();
    const invoiceNumber = formatInvoiceNumber(uuid, timestamp);

    const items: PosOrderItem[] = (offline.items || []).map((item: any, idx: number) => {
        const itemName =
            item.product_name ||
            item.productName ||
            item.itemName ||
            item.item_name ||
            "Matcha";
        const unitPrice =
            typeof item.unit_price === "number"
                ? item.unit_price
                : typeof item.unitPrice === "number"
                ? item.unitPrice
                : 0;
        const quantity = item.quantity || 1;
        const lineTotal =
            typeof item.subtotal === "number"
                ? item.subtotal
                : typeof item.lineTotal === "number"
                ? item.lineTotal
                : quantity * unitPrice;
        const discountAmount =
            item.discount_amount || item.discountAmount || 0;

        return {
            id: `off-item-${uuid}-${idx}`,
            itemId: item.product_id || item.productId || `item-${idx}`,
            itemName,
            quantity,
            unitPrice,
            discountAmount,
            lineTotal,
            variantId: item.variant_id || item.variantId || null,
            variantName: item.variant_name || item.variantName || null,
            unitId: null,
        };
    });

    const subtotal =
        offline.subtotal ??
        items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discountAmount =
        offline.discount_amount ?? offline.discountAmount ?? 0;
    const total =
        offline.total ?? Math.max(0, subtotal - discountAmount);

    return ({
        id: uuid,
        businessId: "1",
        customerId: offline.customer_id || null,
        invoiceNumber,
        channel: offline.channel || "POS",
        status: offline.status || "PAID",
        paymentMethod: offline.payment_method || offline.paymentMethod || "CASH",
        subtotal,
        discountAmount,
        taxAmount: 0,
        total,
        currency: offline.currency || "USD",
        items,
        createdDate: timestamp,
        updatedDate: timestamp,
    } as unknown) as PosOrder;
}

export function usePendingOfflineOrders(): PosOrder[] {
    // One queue. There used to be a second table holding a lossier copy of the
    // same sales, read here alongside this one purely so neither was missed.
    const dbOrders = useLiveQuery(async () => {
        try {
            return await db.offline_orders.toArray();
        } catch {
            return [];
        }
    }, []) ?? [];

    const map = new Map<string, PosOrder>();

    dbOrders.forEach((offline: any) => {
        if (!offline) return;
        if (offline.sync_status === "SYNCED" || offline.is_synced === true) return;
        const posOrder = offlineOrderToPosOrder(offline);
        if (!map.has(posOrder.id)) {
            map.set(posOrder.id, posOrder);
        }
    });

    return Array.from(map.values());
}
