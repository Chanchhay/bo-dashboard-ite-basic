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

    const clear = useCallback(async () => {
        const cart = await clearCart();
        return cart;
    }, []);

    return { addItem, setQuantity, removeItem, setCustomer, setDiscount, clear };
}
