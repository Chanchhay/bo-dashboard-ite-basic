import Dexie from "dexie";

import type {
    PosOrder,
    PosOrderItem,
    TaxInclusionType,
} from "@/lib/api/pos-order";
import { offlineDb } from "@/lib/offline/db";

export const ACTIVE_CART_ID = "active";

export type LocalCartLine = {
    id: string;
    serverLineId: string | null;
    itemId: string;
    variantId: string | null;
    variantName: string | null;
    unitId: string | null;
    unitName: string | null;
    unitFactor: number | null;
    addOns: { addOnId: string; name: string; unitPrice: number }[];
    itemName: string;
    quantity: number;
    freeQuantity: number;
    unitPrice: number;
    discountAmount: number;
    trackInventory: boolean | null;
};

export type LocalCart = {
    id: string;
    serverOrderId: string | null;
    customerId: string | null;
    discountAmount: number;
    discountId: string | null;
    discountCode: string | null;
    discountLabel: string | null;
    autoDiscountAmount: number;
    autoDiscountLabel: string | null;
    taxRate: number | null;
    taxInclusionType: TaxInclusionType | null;
    currency: string | null;
    note: string | null;
    lines: LocalCartLine[];
    updatedAt: string;
};

export function emptyCart(overrides: Partial<LocalCart> = {}): LocalCart {
    return {
        id: ACTIVE_CART_ID,
        serverOrderId: null,
        customerId: null,
        discountAmount: 0,
        discountId: null,
        discountCode: null,
        discountLabel: null,
        autoDiscountAmount: 0,
        autoDiscountLabel: null,
        taxRate: null,
        taxInclusionType: null,
        currency: null,
        note: null,
        lines: [],
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

let lineSeq = 0;

export function newLineId() {
    lineSeq += 1;

    return `line-${Date.now().toString(36)}-${lineSeq.toString(36)}`;
}

export function addOnIdsOf(line: {
    addOns?: { addOnId: string }[];
}): string[] {
    return (line.addOns ?? []).map((addOn) => addOn.addOnId);
}

export function lineKey(line: {
    itemId: string;
    variantId?: string | null;
    unitId?: string | null;
    addOns?: { addOnId: string }[];
}) {
    return [
        line.itemId,
        line.variantId ?? "",
        line.unitId ?? "",
        [...addOnIdsOf(line)].sort().join("+"),
    ].join("|");
}

export async function readCart(): Promise<LocalCart | undefined> {
    return offlineDb.cart.get(ACTIVE_CART_ID);
}

async function mutate(
    change: (cart: LocalCart) => LocalCart | void,
): Promise<LocalCart> {
    return offlineDb.transaction("rw", offlineDb.cart, async () => {
        const current = (await offlineDb.cart.get(ACTIVE_CART_ID)) ?? emptyCart();
        const next = change(current) ?? current;

        next.updatedAt = new Date().toISOString();

        await offlineDb.cart.put(next);

        return next;
    });
}

export type AddLineInput = {
    itemId: string;
    variantId?: string | null;
    variantName?: string | null;
    unitId?: string | null;
    unitName?: string | null;
    unitFactor?: number | null;
    addOns?: { addOnId: string; name: string; unitPrice: number }[];
    itemName: string;
    unitPrice: number;
    quantity?: number;
    trackInventory?: boolean | null;
};

export async function addLine(input: AddLineInput) {
    const quantity = input.quantity ?? 1;
    const key = lineKey({
        itemId: input.itemId,
        variantId: input.variantId,
        unitId: input.unitId,
        addOns: input.addOns,
    });

    return mutate((cart) => {
        const existing = cart.lines.find((line) => lineKey(line) === key);

        if (existing) {
            existing.quantity += quantity;
            return cart;
        }

        cart.lines.push({
            id: newLineId(),
            serverLineId: null,
            itemId: input.itemId,
            variantId: input.variantId ?? null,
            variantName: input.variantName ?? null,
            unitId: input.unitId ?? null,
            unitName: input.unitName ?? null,
            unitFactor: input.unitFactor ?? null,
            addOns: input.addOns ?? [],
            itemName: input.itemName,
            quantity,
            freeQuantity: 0,
            unitPrice: input.unitPrice,
            discountAmount: 0,
            trackInventory: input.trackInventory ?? null,
        });

        return cart;
    });
}

export async function setLineQuantity(lineId: string, quantity: number) {
    return mutate((cart) => {
        if (quantity <= 0) {
            cart.lines = cart.lines.filter((line) => line.id !== lineId);
            return cart;
        }

        const line = cart.lines.find((candidate) => candidate.id === lineId);

        if (line) line.quantity = quantity;

        return cart;
    });
}

export async function removeLine(lineId: string) {
    return mutate((cart) => {
        cart.lines = cart.lines.filter((line) => line.id !== lineId);
        return cart;
    });
}

export async function setCartCustomer(customerId: string | null) {
    return mutate((cart) => {
        cart.customerId = customerId;
        return cart;
    });
}

export async function setCartDiscount(input: {
    discountAmount: number;
    discountId?: string | null;
    discountCode?: string | null;
    discountLabel?: string | null;
}) {
    return mutate((cart) => {
        cart.discountAmount = input.discountAmount;
        cart.discountId = input.discountId ?? null;
        cart.discountCode = input.discountCode ?? null;
        cart.discountLabel = input.discountLabel ?? null;
        return cart;
    });
}

export async function setCartTax(input: {
    taxRate: number | null;
    taxInclusionType: TaxInclusionType | null;
    currency?: string;
}) {
    return mutate((cart) => {
        cart.taxRate = input.taxRate;
        cart.taxInclusionType = input.taxInclusionType;
        if (input.currency) cart.currency = input.currency;
        return cart;
    });
}

export async function attachServerOrder(orderId: string) {
    return mutate((cart) => {
        cart.serverOrderId = orderId;
        return cart;
    });
}

export async function attachServerLine(lineId: string, serverLineId: string) {
    return mutate((cart) => {
        const line = cart.lines.find((candidate) => candidate.id === lineId);

        if (line) line.serverLineId = serverLineId;

        return cart;
    });
}

export async function applyServerCart(input: {
    serverOrderId: string;
    lineIds: Record<string, string>;
    freeQuantities: Record<string, number>;
    taxRate?: number | null;
    taxInclusionType?: TaxInclusionType | null;
    currency?: string | null;
    discountAmount?: number | null;
    discountLabel?: string | null;
}) {
    return mutate((cart) => {
        cart.serverOrderId = input.serverOrderId;

        if (input.currency) cart.currency = input.currency;
        if (input.taxRate !== undefined) cart.taxRate = input.taxRate;
        if (input.taxInclusionType !== undefined) {
            cart.taxInclusionType = input.taxInclusionType;
        }
        if (input.discountAmount !== undefined) {
            cart.autoDiscountAmount = input.discountAmount ?? 0;
        }
        if (input.discountLabel !== undefined) {
            cart.autoDiscountLabel = input.discountLabel ?? null;
        }

        cart.lines.forEach((line) => {
            const key = lineKey(line);
            const serverLineId = input.lineIds[key];

            if (serverLineId) line.serverLineId = serverLineId;

            const serverFree = input.freeQuantities[key] ?? 0;
            const previousFree = line.freeQuantity ?? 0;

            if (serverFree !== previousFree) {
                line.quantity = Math.max(0, line.quantity + (serverFree - previousFree));
                line.freeQuantity = serverFree;
            }
        });

        return cart;
    });
}

export async function loadCartFrom(order: PosOrder) {
    return mutate(() =>
        emptyCart({
            serverOrderId: order.id,
            customerId: order.customerId,
            discountAmount: order.discountAmount ?? 0,
            discountId: order.discountId ?? null,
            discountCode: order.discountCode ?? null,
            discountLabel: order.discountLabel ?? null,
            taxRate: order.taxRate ?? null,
            taxInclusionType: order.taxInclusionType ?? null,
            currency: order.currency ?? null,
            note: order.note ?? null,
            lines: order.items.map((line) => ({
                id: newLineId(),
                serverLineId: line.id,
                itemId: line.itemId,
                variantId: line.variantId ?? null,
                variantName: line.variantName ?? null,
                unitId: line.unitId ?? null,
                unitName: line.unitName ?? null,
                unitFactor: line.unitFactor ?? null,
                addOns: (line.addOns ?? []).filter(
                    (addOn): addOn is { addOnId: string; name: string; unitPrice: number } =>
                        Boolean(addOn.addOnId),
                ),
                itemName: line.itemName,
                quantity: line.quantity,
                freeQuantity: line.freeQuantity ?? 0,
                unitPrice: line.unitPrice,
                discountAmount: line.discountAmount ?? 0,
                trackInventory: line.trackInventory ?? null,
            })),
        }),
    );
}

export async function clearCart() {
    return mutate(() => emptyCart());
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

export function lineTotalOf(line: LocalCartLine) {
    return round2(line.quantity * line.unitPrice - line.discountAmount);
}

export function cartTotals(cart: LocalCart) {
    const subtotal = round2(
        cart.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    );
    const hasExplicitPick = Boolean(
        cart.discountId || cart.discountCode || cart.discountAmount > 0,
    );
    const discountAmount = round2(
        hasExplicitPick ? cart.discountAmount : (cart.autoDiscountAmount ?? 0),
    );
    const net = Math.max(0, subtotal - discountAmount);
    const rate = cart.taxRate ?? 0;

    if (!rate) {
        return { subtotal, discountAmount, taxAmount: 0, total: round2(net) };
    }

    if (cart.taxInclusionType === "INCLUSIVE") {
        const pretax = net / (1 + rate / 100);

        return {
            subtotal,
            discountAmount,
            taxAmount: round2(net - pretax),
            total: round2(net),
        };
    }

    const taxAmount = round2(net * (rate / 100));

    return { subtotal, discountAmount, taxAmount, total: round2(net + taxAmount) };
}

export function toPosOrder(cart: LocalCart): PosOrder {
    const totals = cartTotals(cart);

    const items: PosOrderItem[] = cart.lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        variantId: line.variantId,
        variantName: line.variantName,
        unitId: line.unitId,
        unitName: line.unitName,
        unitFactor: line.unitFactor,
        addOns: line.addOns,
        itemName: line.itemName,
        quantity: line.quantity,
        freeQuantity: line.freeQuantity ?? 0,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        lineTotal: lineTotalOf(line),
        trackInventory: line.trackInventory,
    }));

    return {
        id: cart.serverOrderId ?? ACTIVE_CART_ID,
        businessId: "",
        customerId: cart.customerId,
        invoiceNumber: null,
        channel: "POS",
        status: "PENDING",
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountId: cart.discountId,
        discountCode: cart.discountCode,
        discountLabel: cart.discountLabel ?? cart.autoDiscountLabel,
        taxRate: cart.taxRate,
        taxAmount: totals.taxAmount,
        taxInclusionType: cart.taxInclusionType,
        total: totals.total,
        currency: cart.currency,
        displayCurrency: null,
        displayExchangeRate: null,
        note: cart.note,
        items,
        createdDate: null,
    };
}

export function isMissingCartStore(error: unknown) {
    return error instanceof Dexie.DexieError;
}
