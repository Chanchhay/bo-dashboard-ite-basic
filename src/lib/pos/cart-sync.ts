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

export function cartHasUnsavedChanges() {
    return pendingChanges || pushTimer !== null || pushInFlight !== null;
}

function linesFor(cart: LocalCart) {
    return cart.lines.map((line) => ({
        itemId: line.itemId,
        variantId: line.variantId,
        unitId: line.unitId,
        addOnIds: addOnIdsOf(line),
        quantity: line.quantity,
    }));
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

    if (!response.ok) return false;

    const payload = await response.json();

    await applyServerCart({
        serverOrderId: payload.order?.id,
        lineIds: payload.lineIds ?? {},
        taxRate: payload.order?.taxRate ?? null,
        taxInclusionType: payload.order?.taxInclusionType ?? null,
        currency: payload.order?.currency ?? null,
    });

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
