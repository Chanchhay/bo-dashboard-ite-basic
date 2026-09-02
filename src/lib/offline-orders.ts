import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { PosOrder, PosOrderItem } from "@/lib/api/pos-order";

/**
 * A queued offline sale, in the shape everything else reads.
 *
 * It is the same sale the backend will record when it syncs, so it names
 * itself the same way: the invoice number is the id it is queued under, which
 * is what the backend uses as the invoice number. The slip in the customer's
 * hand and the row the shop sees later say the same thing.
 */
export function offlineOrderToPosOrder(offline: any): PosOrder {
    const uuid = offline.uuid || `offline-${Date.now()}`;
    const timestamp = offline.created_at || new Date().toISOString();

    const items: PosOrderItem[] = (offline.items || []).map(
        (item: any, idx: number) => {
            const quantity = item.quantity || 1;
            const unitPrice =
                typeof item.unit_price === "number" ? item.unit_price : 0;
            const lineTotal =
                typeof item.subtotal === "number"
                    ? item.subtotal
                    : quantity * unitPrice;

            return {
                id: `off-item-${uuid}-${idx}`,
                itemId: item.product_id || `item-${idx}`,
                // No stand-in name. A line whose name did not survive is a
                // line nobody can identify, and calling it after some other
                // item the shop sells is worse than saying so.
                itemName: item.product_name || "Item",
                quantity,
                unitPrice,
                discountAmount: item.discount_amount || 0,
                lineTotal,
                variantId: item.variant_id ?? null,
                variantName: item.variant_name ?? null,
                unitId: item.unit_id ?? null,
                unitName: item.unit_name ?? null,
                unitFactor: item.unit_factor ?? null,
                addOns: item.add_ons ?? [],
            };
        },
    );

    const subtotal =
        offline.subtotal ?? items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discountAmount = offline.discount_amount ?? 0;
    const total = offline.total ?? Math.max(0, subtotal - discountAmount);

    return {
        id: uuid,
        businessId: "",
        customerId: offline.customer_id ?? null,
        invoiceNumber: uuid,
        channel: offline.channel || "POS",
        status: offline.status || "PAID",
        paymentMethod: offline.payment_method === "CASH" ? "CASH" : "DIGITAL",
        subtotal,
        discountAmount,
        discountLabel: offline.discount_label ?? null,
        taxRate: offline.tax_rate ?? null,
        taxAmount: offline.tax_amount ?? null,
        taxInclusionType: offline.tax_inclusion_type ?? null,
        total,
        currency: offline.currency || "USD",
        displayCurrency: null,
        displayExchangeRate: null,
        note: null,
        items,
        createdDate: timestamp,
    };
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
