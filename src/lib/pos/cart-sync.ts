import {
    addOnIdsOf,
    applyServerCart,
    readCart,
    type LocalCart,
} from "@/lib/pos/local-cart";

/**
 * Tells the server what the till is holding.
 *
 * Nothing here blocks the screen. The cart is already saved and already drawn
 * by the time this runs, so a push that is slow, refused or never sent costs
 * the cashier nothing — it is retried, and the next one carries everything the
 * failed one did. That is the whole reason the cart moved onto the device.
 */

const PUSH_DEBOUNCE_MS = 400;
const MIN_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight: Promise<boolean> | null = null;
let retryDelayMs = MIN_RETRY_MS;
let nextAttemptAt = 0;

/** Set while a push is queued or failing, so payment knows to wait for it. */
let pendingChanges = false;

/** The reason the most recent push failed, for whoever needs to tell the cashier why. */
let lastPushError: string | null = null;

/**
 * Whoever wants to know the moment a push is refused for a real reason —
 * the cart panel, to toast it — rather than polling. Only ever fired with an
 * actual message: a dropped connection costs the cashier nothing and says
 * nothing, by design, so it never reaches here.
 */
const pushFailureListeners = new Set<(message: string) => void>();

function reportPushError(message: string | null) {
    lastPushError = message;
    if (message) {
        pushFailureListeners.forEach((listener) => listener(message));
    }
}

export function onCartPushFailed(listener: (message: string) => void): () => void {
    pushFailureListeners.add(listener);
    return () => pushFailureListeners.delete(listener);
}

export function cartHasUnsavedChanges() {
    return pendingChanges || pushTimer !== null || pushInFlight !== null;
}

export function getLastCartPushError(): string | null {
    return lastPushError;
}

function linesFor(cart: LocalCart) {
    return cart.lines.map((line) => ({
        itemId: line.itemId,
        variantId: line.variantId,
        unitId: line.unitId,
        addOnIds: addOnIdsOf(line),
        quantity: line.quantity,
        // So the reconciliation route can tell the backend how much of this
        // total is a Buy X Get Y freebie already granted, rather than paid
        // demand — the backend's own add/update endpoints only ever want the
        // paid figure.
        freeQuantity: line.freeQuantity ?? 0,
    }));
}

async function readMessage(response: Response): Promise<string | undefined> {
    try {
        const body = (await response.json()) as { message?: string } | null;
        return body?.message;
    } catch {
        return undefined;
    }
}

/**
 * The discount, same as `linesFor` is the lines.
 *
 * It doesn't live on a line, so the reconciliation route that matches lines
 * up by item+variant+unit+add-ons has nowhere to carry it — it goes over the
 * order's own endpoint instead, whenever the cashier has actually picked or
 * cleared one.
 *
 * Nothing having ever been picked is not the same as having been cleared,
 * and the backend's discount endpoint treats them differently: told no
 * discountId and no code, it does not leave the order's discount alone, it
 * recomputes it from scratch as just the sum of whatever is already
 * attributed to individual lines — which is exactly nothing for a storewide
 * discount, since that kind is never attributed to a line. That endpoint is
 * also the *only* thing that can decide the order still has no discount
 * (there is nothing else here that would ask it to), which is what makes it
 * safe to skip calling at all otherwise: a storewide Buy X Get Y or percent
 * off is already re-derived by the order's own item-mutation endpoints on
 * every push, correctly, without anyone here having to select it — calling
 * this on top of that with nothing to say was overwriting that correct
 * figure with zero on every single cart push.
 *
 * This one blocks the push on failure: the amount charged at payment is read
 * straight off the server's order, so a discount that didn't reach it is a
 * wrong price, not a cosmetic gap.
 */
async function pushDiscount(cart: LocalCart): Promise<boolean> {
    if (!cart.discountId && !cart.discountCode && cart.discountAmount <= 0) {
        return true;
    }

    try {
        const response = await fetch("/api/orders/current/discount", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                discountAmount: cart.discountAmount,
                discountId: cart.discountId,
                discountCode: cart.discountCode,
            }),
        });

        if (response.ok) return true;

        reportPushError((await readMessage(response)) ?? "The discount could not be saved.");
        return false;
    } catch {
        reportPushError(null);
        return false;
    }
}

/**
 * The customer, best-effort.
 *
 * Unlike the discount, nothing about the price depends on this — and this
 * backend has no working endpoint for it yet (confirmed 404/405 against both
 * shapes it's been tried with). Blocking every sale, including the ordinary
 * walk-in with no customer at all, on a feature the server cannot do yet
 * would be a worse outcome than a receipt quietly missing who it was for.
 * Skipped entirely when there is no customer to say, which is most sales.
 */
async function pushCustomer(cart: LocalCart): Promise<void> {
    if (!cart.customerId) return;

    try {
        const response = await fetch("/api/orders/current/customer", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId: cart.customerId }),
        });

        if (!response.ok) {
            const message = await readMessage(response);
            console.warn("[cart-sync] customer attach failed (non-blocking):", message);
        }
    } catch {
        // Offline or unreachable — same verdict: not worth failing the sale over.
    }
}

async function runPush(): Promise<boolean> {
    const cart = await readCart();

    // An empty cart that the server has never heard of is nothing to say.
    if (!cart || (cart.lines.length === 0 && !cart.serverOrderId)) {
        pendingChanges = false;
        return true;
    }

    const response = await fetch("/api/orders/current", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: linesFor(cart) }),
    });

    if (!response.ok) {
        reportPushError((await readMessage(response)) ?? null);
        return false;
    }

    const payload = await response.json();

    await applyServerCart({
        serverOrderId: payload.order?.id,
        lineIds: payload.lineIds ?? {},
        freeQuantities: payload.freeQuantities ?? {},
        taxRate: payload.order?.taxRate ?? null,
        taxInclusionType: payload.order?.taxInclusionType ?? null,
        currency: payload.order?.currency ?? null,
        discountAmount: payload.order?.discountAmount ?? null,
        discountLabel: payload.order?.discountLabel ?? null,
    });

    const [discountOk] = await Promise.all([
        pushDiscount(cart),
        pushCustomer(cart),
    ]);

    if (!discountOk) return false;

    reportPushError(null);
    pendingChanges = false;

    return true;
}

/**
 * Pushes now, unless one is already going or the last one failed recently
 * enough that trying again would only be noise.
 */
export async function pushCart(options?: { force?: boolean }): Promise<boolean> {
    if (pushInFlight) return pushInFlight;
    if (!options?.force && Date.now() < nextAttemptAt) return false;

    pushInFlight = (async () => {
        try {
            return await runPush();
        } catch {
            // Offline, or the server is unreachable. The cart is safe on the
            // device either way; this only decides when to try again.
            reportPushError(null);
            return false;
        }
    })();

    try {
        const ok = await pushInFlight;

        if (ok) {
            retryDelayMs = MIN_RETRY_MS;
            nextAttemptAt = 0;
        } else {
            nextAttemptAt = Date.now() + retryDelayMs;
            retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS);
        }

        return ok;
    } finally {
        pushInFlight = null;
    }
}

/**
 * Called after every change to the cart.
 *
 * Debounced, because a cashier ringing up six things in three seconds is one
 * cart, not six — and the reconcile route makes the same call carry all of it.
 */
export function scheduleCartPush() {
    pendingChanges = true;

    if (pushTimer) clearTimeout(pushTimer);

    pushTimer = setTimeout(() => {
        pushTimer = null;
        void pushCart();
    }, PUSH_DEBOUNCE_MS);
}

/**
 * Everything the till is holding, on the server, before the money is taken.
 *
 * Payment is the one moment the cart cannot be behind: the backend prices the
 * sale from its own order, so anything not pushed by now would not be charged
 * for. Forced past the backoff, because this is the attempt that matters.
 */
export async function flushCart(): Promise<boolean> {
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }

    return pushCart({ force: true });
}

/** A reconnection deserves an immediate attempt rather than serving out a wait. */
export function resetCartPushBackoff() {
    retryDelayMs = MIN_RETRY_MS;
    nextAttemptAt = 0;
}
