import Dexie from "dexie";

import type {
    PosOrder,
    PosOrderItem,
    TaxInclusionType,
} from "@/lib/api/pos-order";
import { offlineDb } from "@/lib/offline/db";

/**
 * The cart, owned by the till.
 *
 * It used to be owned by the server: a real order row addressed by a cookie,
 * with the screen showing an optimistic guess at it until the response landed.
 * That works until the connection does not, and then the till has to invent a
 * second cart with invented line ids — which is where the vanishing items, the
 * lines the server had never heard of, and the carts that outlived their sale
 * all came from.
 *
 * So the cart lives here instead, and the server is told about it. Online and
 * offline are the same code path; the only difference is how long the telling
 * takes.
 */

/** There is one cart being rung up at a time, so it has a fixed key. */
export const ACTIVE_CART_ID = "active";

export type LocalCartLine = {
    /**
     * Made here, and never changed.
     *
     * The whole point: a line can be edited the instant it appears, because
     * its id belongs to this device and does not have to be waited for.
     */
    id: string;
    /** The server's id for this line, once it has one. */
    serverLineId: string | null;
    itemId: string;
    variantId: string | null;
    variantName: string | null;
    unitId: string | null;
    unitName: string | null;
    unitFactor: number | null;
    /**
     * The extras, with their names and prices, not just their ids.
     *
     * A tub of pearls empties whether it was scooped into one drink or ten, so
     * an extra is stock like anything else — and a receipt printed with no
     * connection has to be able to name what was charged for.
     */
    addOns: { addOnId: string; name: string; unitPrice: number }[];
    itemName: string;
    quantity: number;
    /**
     * How many of `quantity` a Buy X Get Y offer gave away, as last told to
     * this device by the server — the till has no bundle rules of its own to
     * decide this with; it only ever learns it back from a push.
     */
    freeQuantity: number;
    unitPrice: number;
    discountAmount: number;
    trackInventory: boolean | null;
};

export type LocalCart = {
    id: string;
    /** The order this cart has been written to, once it has been. */
    serverOrderId: string | null;
    customerId: string | null;
    discountAmount: number;
    discountId: string | null;
    discountCode: string | null;
    discountLabel: string | null;
    /**
     * The order's own discount total, last learned back from a push — covers
     * a discount nobody here picked, such as a storewide Buy X Get Y whose
     * free unit depends on everything in the basket and so is only ever
     * decided server-side. Never pushed itself, only read: `discountAmount`
     * above stays the till's own record of what it asked the server to
     * apply, and this is what came back.
     */
    autoDiscountAmount: number;
    autoDiscountLabel: string | null;
    taxRate: number | null;
    taxInclusionType: TaxInclusionType | null;
    /**
     * The currency this cart is priced in, once the server has said so. Null
     * until then — meaning "whatever the business prices in today", which is
     * what the formatter falls back to. Never guessed at a code here: a till
     * that assumed one would label base-currency amounts with somebody else's
     * symbol, and then convert them a second time for the secondary line.
     */
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

/**
 * Unique on this device, which is as far as it needs to be: the server issues
 * its own id and the two are kept side by side on the line.
 */
export function newLineId() {
    lineSeq += 1;

    return `line-${Date.now().toString(36)}-${lineSeq.toString(36)}`;
}

/** What makes two rung-up lines the same line: the item and every choice on it. */
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

/* -------------------------------------------------------------- reading */

export async function readCart(): Promise<LocalCart | undefined> {
    return offlineDb.cart.get(ACTIVE_CART_ID);
}

/* -------------------------------------------------------------- writing */

/**
 * Every write is a read-modify-write inside one transaction.
 *
 * Two taps landing together is the normal case on a till, not an edge one, and
 * without the transaction the second overwrites the first with a copy of the
 * cart it read before the first had finished.
 */
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

/** Rings an item up, merging into the matching line the way a till does. */
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

/** Whatever the shop charges, learned from the server and kept for offline. */
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

/**
 * Takes the ids and the money rules back from a push, without disturbing what
 * the cashier has done in the meantime.
 *
 * Most fields the server is simply the authority on and are copied over.
 * Quantity is not one of those — a tap that landed while the request was in
 * flight is newer than the answer coming back, and the next push will carry
 * it. The one exception is `freeQuantity`: a Buy X Get Y bundle is a decision
 * the *server* makes (the till has no bundle rules of its own), so it can
 * only ever be learned back from a push, never invented locally. Applied as
 * a delta on top of whatever quantity already sits here — adding exactly
 * however many more free units the server just granted (or removing however
 * many it just took back) — rather than overwriting the total outright,
 * which would stomp a tap that landed in the same window.
 */
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

/**
 * Takes a parked order back onto the till.
 *
 * The server's line ids come with it, so the first push after this reconciles
 * against the order that already exists rather than building a second one.
 */
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

/** The sale is over, or abandoned. The next tap starts a fresh one. */
export async function clearCart() {
    return mutate(() => emptyCart());
}

/* -------------------------------------------------------------- totals */

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

export function lineTotalOf(line: LocalCartLine) {
    return round2(line.quantity * line.unitPrice - line.discountAmount);
}

/**
 * The same arithmetic the backend's TaxCalculator does.
 *
 * It has to live here too: a till with no connection still has to show the
 * customer what they owe. The server's answer replaces this one the moment
 * there is a server to ask.
 */
export function cartTotals(cart: LocalCart) {
    const subtotal = round2(
        cart.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    );
    // An explicit pick (a coupon, a membership, or a custom amount someone
    // typed by hand) and the order's own auto-detected discount are
    // alternatives, never a sum — the pick, once made, is already the whole
    // discount for whatever it applies to, worked out server-side across
    // every line it touches. Nothing here writes to a line's own
    // `discountAmount` any more (a storewide or item-scoped catalog
    // discount is carried on `autoDiscountAmount` instead, never on a
    // line), so it is not part of this either; adding it back in used to
    // double an item-scoped bundle's discount the moment its amount was
    // also learned back per line.
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

/**
 * The cart in the shape the rest of the terminal already reads.
 *
 * Keeping the shape means the panel, the receipt and the payment dialog did
 * not have to be rewritten to change where the cart lives.
 */
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
        // The server's id where there is one, so a receipt and a payment name
        // the same order the backend does.
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

/** Dexie throws on a store that a stale tab's schema does not know about. */
export function isMissingCartStore(error: unknown) {
    return error instanceof Dexie.DexieError;
}
