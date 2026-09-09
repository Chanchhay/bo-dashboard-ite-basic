import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { PosOrder, PosOrderItem, Sale } from "@/lib/api/pos-order";

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
        currency: offline.currency || null,
        displayCurrency: null,
        displayExchangeRate: null,
        note: null,
        items,
        createdDate: timestamp,
    };
}

export function offlineOrderToSale(offline: any): Sale {
    const uuid = offline.uuid || `offline-${Date.now()}`;
    const total = offline.total ?? 0;
    const paidAmount = offline.paid_amount ?? total;

    return {
        id: `off-sale-${uuid}`,
        orderId: uuid,
        invoiceNumber: uuid,
        cashierId: null,
        customerId: offline.customer_id ?? null,
        customerName: null,
        customerPhone: null,
        customerEmail: null,
        channel: offline.channel || "POS",
        subtotal: offline.subtotal ?? 0,
        discountAmount: offline.discount_amount ?? 0,
        discountLabel: offline.discount_label ?? null,
        taxRate: offline.tax_rate ?? null,
        taxAmount: offline.tax_amount ?? null,
        taxInclusionType: offline.tax_inclusion_type ?? null,
        totalAmount: total,
        paidAmount,
        changeAmount: offline.change_amount ?? Math.max(0, paidAmount - total),
        currency: offline.currency ?? null,
        displayCurrency: null,
        displayExchangeRate: null,
        paymentMethod: offline.payment_method === "CASH" ? "CASH" : "DIGITAL",
        itemCount: (offline.items || []).length,
        note: null,
        soldAt: offline.created_at ?? null,
    };
}

export function usePendingOfflineOrders(): PosOrder[] {
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

export function usePendingOfflineSales(): Map<string, Sale> {
    const dbOrders = useLiveQuery(async () => {
        try {
            return await db.offline_orders.toArray();
        } catch {
            return [];
        }
    }, []) ?? [];

    const sales = new Map<string, Sale>();

    dbOrders.forEach((offline: any) => {
        if (!offline) return;
        if (offline.sync_status === "SYNCED" || offline.is_synced === true) return;
        const sale = offlineOrderToSale(offline);
        if (!sales.has(sale.orderId)) {
            sales.set(sale.orderId, sale);
        }
    });

    return sales;
}
