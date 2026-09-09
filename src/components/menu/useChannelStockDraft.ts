"use client";

import { useCallback, useMemo, useState } from "react";

import {
    allocationKey,
    unallocated,
    type ChannelStockAllocation,
    type ChannelStockMode,
    type ItemChannelStock,
} from "@/lib/api/channel-stock";
import type { InventoryItem } from "@/lib/api/inventory";
import {
    useGetCurrentStockQuery,
    useGetItemChannelStockQuery,
    useSaveItemChannelStockMutation,
} from "@/services/inventoryApi";

export type StockTarget = {
    variantId: string | null;
    name: string;
    onHand: number;
};

export type ChannelStockDraft = ReturnType<typeof useChannelStockDraft>;

export function useChannelStockDraft({
    item,
    open,
}: {
    item: InventoryItem | null;
    open: boolean;
}) {
    const itemId = item?.id || "";
    const skip = !open || !itemId;

    const stockQuery = useGetCurrentStockQuery(undefined, { skip });
    const splitQuery = useGetItemChannelStockQuery(itemId, { skip });
    const [saveSplit, saveState] = useSaveItemChannelStockMutation();

    const [mode, setMode] = useState<ChannelStockMode>("SHARED");
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [seededFor, setSeededFor] = useState<string | null>(null);

    const targets = useMemo<StockTarget[]>(() => {
        const onHandFor = new Map<string, number>();

        for (const summary of stockQuery.data || []) {
            if (summary.itemId !== itemId) continue;

            onHandFor.set(
                summary.variantId || "",
                summary.quantityOnHand ?? 0,
            );
        }

        const variants = (item?.variants || []).filter((variant) => variant.id);

        if (variants.length === 0) {
            return [
                {
                    variantId: null,
                    name: item?.name || "This item",
                    onHand: onHandFor.get("") ?? 0,
                },
            ];
        }

        return variants.map((variant) => ({
            variantId: variant.id as string,
            name: variant.name || "Option",
            onHand: onHandFor.get(variant.id as string) ?? 0,
        }));
    }, [item, itemId, stockQuery.data]);

    const seedKey = skip || !splitQuery.isSuccess ? null : `${itemId}`;

    if (seedKey && seedKey !== seededFor) {
        const saved = splitQuery.data as ItemChannelStock | undefined;
        const typed: Record<string, string> = {};

        for (const allocation of saved?.allocations || []) {
            typed[allocationKey(allocation.salesChannelId, allocation.variantId)] =
                String(allocation.quantity);
        }

        setSeededFor(seedKey);
        setMode(saved?.mode || "SHARED");
        setQuantities(typed);
    }

    if (!open && seededFor !== null) {
        setSeededFor(null);
    }

    const quantityAt = useCallback(
        (channelId: string, variantId: string | null) =>
            quantities[allocationKey(channelId, variantId)] ?? "",
        [quantities],
    );

    const setQuantity = useCallback(
        (channelId: string, variantId: string | null, value: string) => {
            const cleaned = value.replace(/[^\d]/g, "");

            setQuantities((prev) => ({
                ...prev,
                [allocationKey(channelId, variantId)]: cleaned,
            }));
        },
        [],
    );

    const distributeEvenly = useCallback(
        (channelIds: string[], variantId: string | null) => {
            const target = targets.find((row) => row.variantId === variantId);

            if (!target || channelIds.length === 0) return;

            const onHand = Math.max(0, Math.floor(target.onHand));
            const base = Math.floor(onHand / channelIds.length);
            let spare = onHand - base * channelIds.length;

            setQuantities((prev) => {
                const next = { ...prev };

                channelIds.forEach((channelId) => {
                    const quantity = base + (spare > 0 ? 1 : 0);
                    if (spare > 0) spare -= 1;

                    next[allocationKey(channelId, variantId)] = String(quantity);
                });

                return next;
            });
        },
        [targets],
    );

    const clearAll = useCallback(() => setQuantities({}), []);

    const allocationsFor = useCallback(
        (channelIds: Iterable<string>): ChannelStockAllocation[] => {
            const rows: ChannelStockAllocation[] = [];

            for (const channelId of channelIds) {
                for (const target of targets) {
                    const raw = quantityAt(channelId, target.variantId);
                    const quantity = Number(raw);

                    if (!raw || !Number.isFinite(quantity) || quantity <= 0) {
                        continue;
                    }

                    rows.push({
                        salesChannelId: channelId,
                        variantId: target.variantId,
                        quantity,
                    });
                }
            }

            return rows;
        },
        [quantityAt, targets],
    );

    const remainingFor = useCallback(
        (channelIds: Iterable<string>) => {
            const allocations = allocationsFor(channelIds);
            const remaining = new Map<string, number>();

            for (const target of targets) {
                remaining.set(
                    target.variantId || "",
                    unallocated(
                        target.onHand,
                        allocations.filter(
                            (allocation) =>
                                (allocation.variantId || null) ===
                                target.variantId,
                        ),
                    ),
                );
            }

            return remaining;
        },
        [allocationsFor, targets],
    );

    const overAllocated = useCallback(
        (channelIds: Iterable<string>) =>
            [...remainingFor(channelIds).values()].some(
                (remaining) => remaining < 0,
            ),
        [remainingFor],
    );

    const save = useCallback(
        async (channelIds: Iterable<string>) => {
            if (!itemId) return;

            const allocations = allocationsFor(channelIds);
            const savedMode = splitQuery.data?.mode || "SHARED";
            const savedAllocations = splitQuery.data?.allocations || [];

            const unchanged =
                mode === savedMode &&
                allocations.length === savedAllocations.length &&
                allocations.every((allocation) =>
                    savedAllocations.some(
                        (saved) =>
                            saved.salesChannelId === allocation.salesChannelId &&
                            (saved.variantId || null) ===
                                (allocation.variantId || null) &&
                            saved.quantity === allocation.quantity,
                    ),
                );

            if (unchanged) return;

            await saveSplit({
                itemId,
                body: { mode, allocations },
            }).unwrap();
        },
        [allocationsFor, itemId, mode, saveSplit, splitQuery.data],
    );

    return {
        mode,
        setMode,
        targets,
        quantityAt,
        setQuantity,
        distributeEvenly,
        clearAll,
        remainingFor,
        overAllocated,
        save,
        isSaving: saveState.isLoading,
        isLoading: splitQuery.isLoading || stockQuery.isLoading,
        isUnavailable: splitQuery.isError,
    };
}
