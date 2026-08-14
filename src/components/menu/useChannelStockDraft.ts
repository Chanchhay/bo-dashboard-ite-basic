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

/**
 * One thing an item holds stock of: an option, or the item itself.
 *
 * The editor needs the same row shape either way, so an item with no options
 * is described as a single target with no variant rather than as a special
 * case threaded through every calculation below.
 */
export type StockTarget = {
    variantId: string | null;
    name: string;
    onHand: number;
};

export type ChannelStockDraft = ReturnType<typeof useChannelStockDraft>;

/**
 * The split, in the shape a form can be typed into.
 *
 * Quantities are held as the strings the user typed, not as numbers: clearing
 * a box to retype it would otherwise snap to 0 under their cursor and, worse,
 * read as "this channel sells none" for as long as the box was empty.
 */
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
    /** Which opening of the form these numbers were filled in for. */
    const [seededFor, setSeededFor] = useState<string | null>(null);

    /** Everything this item counts, with what is on the shelf for each. */
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

    /**
     * What is saved, filled in once per opening.
     *
     * Keyed on the opening rather than on the data, for the same reason the
     * channel ticks are: a refetch handing back the same split is not the user
     * reopening the form, and re-seeding on one would discard their typing.
     */
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
            // Digits only: a share is a count of units, and letting "1.5" or
            // "-2" be typed here only defers the complaint to the save.
            const cleaned = value.replace(/[^\d]/g, "");

            setQuantities((prev) => ({
                ...prev,
                [allocationKey(channelId, variantId)]: cleaned,
            }));
        },
        [],
    );

    /**
     * Fills one option's row by dividing its shelf between the channels.
     *
     * The quickest correct answer, and the one a shop reaches for before it
     * starts tuning: whole units, odd ones to the first channels rather than
     * stranded, and never more than is on the shelf.
     */
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

    /** Empties every box, for a shop starting the split over. */
    const clearAll = useCallback(() => setQuantities({}), []);

    /**
     * The shares as numbers, for the channels that actually sell the item.
     *
     * A channel the user has just unticked keeps whatever was typed against it
     * — they may tick it back — but it is not counted against the shelf and is
     * not saved: an unpublished channel with a share would be holding stock
     * back for a channel that cannot sell it.
     */
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

    /** What each option has left to give out, once the ticked channels take theirs. */
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

    /**
     * Whether the split can be saved as it stands.
     *
     * Only ever fails one way: more given out than there is on the shelf. Two
     * channels promised eight of the ten in the fridge is a shop that has sold
     * six cakes it does not have, and it finds out at the counter.
     */
    const overAllocated = useCallback(
        (channelIds: Iterable<string>) =>
            [...remainingFor(channelIds).values()].some(
                (remaining) => remaining < 0,
            ),
        [remainingFor],
    );

    /**
     * Writes the split, and only when there is one to write.
     *
     * An item nobody has split stays untouched: the shop that never opens this
     * section should not have a mode written against every item it publishes.
     */
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
        /** True when the split could not be read — the editor says so rather than showing zeroes as fact. */
        isUnavailable: splitQuery.isError,
    };
}
