import {
    addOnIdsOf,
    applyServerCart,
    readCart,
    type LocalCart,
} from "@/lib/pos/local-cart";

const PUSH_DEBOUNCE_MS = 400;
const MIN_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight: Promise<boolean> | null = null;
let retryDelayMs = MIN_RETRY_MS;
let nextAttemptAt = 0;

let pendingChanges = false;

let lastPushError: string | null = null;

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
    }
}

async function runPush(): Promise<boolean> {
    const cart = await readCart();

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

export async function pushCart(options?: { force?: boolean }): Promise<boolean> {
    if (pushInFlight) return pushInFlight;
    if (!options?.force && Date.now() < nextAttemptAt) return false;

    pushInFlight = (async () => {
        try {
            return await runPush();
        } catch {
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

export function scheduleCartPush() {
    pendingChanges = true;

    if (pushTimer) clearTimeout(pushTimer);

    pushTimer = setTimeout(() => {
        pushTimer = null;
        void pushCart();
    }, PUSH_DEBOUNCE_MS);
}

export async function flushCart(): Promise<boolean> {
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }

    return pushCart({ force: true });
}

export function resetCartPushBackoff() {
    retryDelayMs = MIN_RETRY_MS;
    nextAttemptAt = 0;
}
