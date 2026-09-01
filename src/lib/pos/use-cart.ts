"use client";

import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import type { PosOrder } from "@/lib/api/pos-order";
import { offlineDb } from "@/lib/offline/db";
import {
    ACTIVE_CART_ID,
    addLine,
    clearCart,
    removeLine,
    setCartCustomer,
    setCartDiscount,
    setLineQuantity,
    toPosOrder,
    type AddLineInput,
    type LocalCart,
} from "@/lib/pos/local-cart";
import { scheduleCartPush } from "@/lib/pos/cart-sync";

/**
 * The cart, read straight from the device.
 *
 * `useLiveQuery` re-runs on every write to the table, so the panel redraws from
 * the same row the write went to. There is no second copy to keep in step and
 * nothing to roll back: what is on screen is what is saved.
 */
export function useCurrentCart(): {
    cart: LocalCart | undefined;
    order: PosOrder | null;
    isLoading: boolean;
} {
    const cart = useLiveQuery(() => offlineDb.cart.get(ACTIVE_CART_ID), []);

    const order = useMemo(
        () => (cart && cart.lines.length > 0 ? toPosOrder(cart) : null),
        [cart],
    );

    return { cart, order, isLoading: cart === undefined };
}

/**
 * Changing the cart.
 *
 * Every one of these saves first and tells the server afterwards, so none of
 * them can fail in a way the cashier has to see. A push that does not land is
 * retried with everything that has happened since.
 */
export function useCartActions() {
    const addItem = useCallback(async (input: AddLineInput) => {
        const cart = await addLine(input);
        scheduleCartPush();
        return cart;
    }, []);

    const setQuantity = useCallback(
        async (lineId: string, quantity: number) => {
            const cart = await setLineQuantity(lineId, quantity);
            scheduleCartPush();
            return cart;
        },
        [],
    );

    const removeItem = useCallback(async (lineId: string) => {
        const cart = await removeLine(lineId);
        scheduleCartPush();
        return cart;
    }, []);

    const setCustomer = useCallback(async (customerId: string | null) => {
        const cart = await setCartCustomer(customerId);
        scheduleCartPush();
        return cart;
    }, []);

    const setDiscount = useCallback(
        async (input: Parameters<typeof setCartDiscount>[0]) => {
            const cart = await setCartDiscount(input);
            scheduleCartPush();
            return cart;
        },
        [],
    );

    /**
     * Empties the till's cart. The server's copy is dealt with by whoever
     * called this — a paid sale is already closed, an abandoned one is
     * cancelled — because only they know which of the two happened.
     */
    const clear = useCallback(async () => {
        const cart = await clearCart();
        return cart;
    }, []);

    return { addItem, setQuantity, removeItem, setCustomer, setDiscount, clear };
}
