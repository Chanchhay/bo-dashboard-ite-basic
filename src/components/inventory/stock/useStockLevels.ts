"use client";

import { useMemo, useState } from "react";

import { getApiErrorMessage } from "@/components/inventory/InventoryUi";
import type {
    MovementTarget,
    RecordedMovement,
} from "@/components/inventory/stock/StockMovementDialog";
import {
    conversionsForOption,
    toEntryUnits,
} from "@/lib/inventory-config/entry-units";
import type { MovementTargetInfo } from "@/components/inventory/stock/StockMovementsTab";
import { useToast } from "@/components/ui/toast";
import {
    stockState,
    type AddOn,
    type InventoryItem,
    type StockState,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetAddOnsQuery,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
    useGetStockEntriesQuery,
} from "@/services/inventoryApi";

/**
 * One balance, addressed. The option is part of the key rather than a label on
 * it: an item that has run out of Large has not run out of the item.
 */
export function stockTargetKey(id: string, variantId?: string) {
    return variantId ? `${id}:${variantId}` : id;
}

/** One option of an item, with the stock it holds in its own right. */
export type StockOptionRow = {
    id: string;
    name: string;
    available: boolean;
    onHand: number;
    state: StockState;
};

export type StockItemRow = {
    item: InventoryItem;
    /** Everything the item holds: its options, plus anything unassigned. */
    onHand: number;
    /**
     * What its stock is worth, from the batches still holding it. Undefined
     * until a stock in has recorded what a unit cost.
     */
    value?: number;
    state: StockState;
    pendingChange: number;
    /** Empty for an item that is not sold in options. */
    options: StockOptionRow[];
    /**
     * Stock still held against the item as a whole.
     *
     * Non-zero only where quantities were recorded before the item gained
     * options. It belongs to no option until someone says which, so it is
     * shown as its own figure rather than folded into one.
     */
    unassigned: number;
};

export type StockAddOnRow = {
    addOn: AddOn;
    onHand: number;
    /** What its stock is worth, from the batches still holding it. */
    value?: number;
    state: StockState;
};

/**
 * Everything the stock screens count, and the one way they record a movement.
 *
 * Stock levels, add-ons and the ledger are read by three pages that sit side by
 * side in the sidebar. They all need the same joins — a balance per item *and*
 * per add-on, the last cost recorded against each — so the join is done once
 * here rather than three times in parallel.
 */
export function useStockLevels() {
    const { toast } = useToast();
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const addOnsQuery = useGetAddOnsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const entriesQuery = useGetStockEntriesQuery();
    const [createEntry, createState] = useCreateStockEntryMutation();

    const [pending, setPending] = useState<{
        target: MovementTarget;
        direction: "IN" | "OUT";
    } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);
    const addOns = useMemo(() => addOnsQuery.data || [], [addOnsQuery.data]);
    const entries = useMemo(() => entriesQuery.data || [], [entriesQuery.data]);
    /**
     * Every balance the API keeps, keyed by what it is a balance *of*.
     *
     * An item sold in options has one summary per option, so keying by item id
     * alone would collapse them and show one option's count as the item's.
     */
    const summaries = useMemo(
        () =>
            new Map(
                (stockQuery.data || []).map((summary) => [
                    stockTargetKey(
                        summary.addOnId || summary.itemId || "",
                        summary.variantId,
                    ),
                    summary,
                ]),
            ),
        [stockQuery.data],
    );
    /** What one target holds: an add-on, an item, or one option of an item. */
    const onHandFor = (id: string, variantId?: string) =>
        summaries.get(stockTargetKey(id, variantId))?.quantityOnHand || 0;

    /**
     * What a target's remaining stock is worth.
     *
     * Comes from the API, which holds the batches each delivery opened. It
     * used to be `onHand × the last cost seen on the ledger`, which read the
     * *consumed* cost after every sale and could not price stock spanning two
     * deliveries at different prices.
     *
     * Undefined means no open batch carries a cost — nothing was ever bought
     * at a recorded price — which the screen says outright rather than
     * counting as zero.
     */
    const valueFor = (id: string, variantId?: string) =>
        summaries.get(stockTargetKey(id, variantId))?.stockValue;

    /**
     * What an item holds altogether.
     *
     * Its options each hold their own, and stock recorded before the item had
     * options is still held against the item itself, so the total is the sum
     * of both rather than any single balance.
     */
    const itemOnHandFor = (item: InventoryItem) => {
        const options = item.variants || [];

        return options.reduce(
            (total, option) =>
                total + (option.id ? onHandFor(item.id, option.id) : 0),
            onHandFor(item.id),
        );
    };

    /**
     * What an item's stock is worth altogether, options included.
     *
     * Undefined only when nothing it holds has a cost behind it; an option
     * priced at nothing does not drag the rest to undefined.
     */
    const itemValueFor = (item: InventoryItem) => {
        const values = [
            valueFor(item.id),
            ...(item.variants || []).map((option) =>
                option.id ? valueFor(item.id, option.id) : undefined,
            ),
        ].filter((value) => value !== undefined);

        return values.length
            ? values.reduce((total, value) => total + value, 0)
            : undefined;
    };

    const itemRows: StockItemRow[] = items.map((item) => {
        const onHand = itemOnHandFor(item);
        // No threshold of its own exists per option, so each is judged against
        // the item's — a low-stock warning per option is still better than one
        // that only fires once every option is nearly empty.
        const threshold = item.lowStockDefault;

        return {
            item,
            onHand,
            value: itemValueFor(item),
            state: stockState(onHand, threshold),
            pendingChange: 0,
            options: (item.variants || [])
                .filter((option) => option.id && option.name?.trim())
                .map((option) => {
                    const optionOnHand = onHandFor(item.id, option.id);

                    return {
                        id: option.id || "",
                        name: option.name || "",
                        available: option.available !== false,
                        onHand: optionOnHand,
                        state: stockState(optionOnHand, threshold),
                    };
                }),
            unassigned: onHandFor(item.id),
        };
    });

    /**
     * Add-ons are stocked in their own right — a tub of pearls empties whether
     * it was scooped into one drink or ten — so they carry a balance of their
     * own rather than borrowing the item's.
     */
    const addOnRows: StockAddOnRow[] = addOns.map((addOn) => {
        const onHand = onHandFor(addOn.id);

        return {
            addOn,
            onHand,
            value: valueFor(addOn.id),
            state: stockState(onHand, 0),
        };
    });

    /**
     * What the movements ledger needs to read each row accurately: the name and
     * unit of whatever moved, and the balance it stands at today, which is the
     * anchor a running balance is reconstructed backwards from.
     */
    const movementTargets = new Map<string, MovementTargetInfo>([
        ...items.map(
            (item) =>
                [
                    `ITEM:${item.id}`,
                    {
                        name: item.name || "Unnamed item",
                        unitLabel: item.unit?.name || "",
                        // The item's own chain, not its total: entries with no
                        // option counted on from this and nothing else.
                        onHand: onHandFor(item.id),
                    },
                ] as const,
        ),
        // Each option runs a balance of its own, so the ledger reads each as
        // its own running total rather than as steps in the item's.
        ...items.flatMap((item) =>
            (item.variants || [])
                .filter((option) => option.id)
                .map(
                    (option) =>
                        [
                            `ITEM:${item.id}:${option.id}`,
                            {
                                name: `${item.name || "Unnamed item"} — ${option.name || "Unnamed option"}`,
                                unitLabel: item.unit?.name || "",
                                onHand: onHandFor(item.id, option.id),
                            },
                        ] as const,
                ),
        ),
        ...addOns.map(
            (addOn) =>
                [
                    `ADDON:${addOn.id}`,
                    {
                        name: addOn.name || "Unnamed add-on",
                        unitLabel: addOn.baseUnit?.name || "",
                        onHand: onHandFor(addOn.id),
                    },
                ] as const,
        ),
    ]);

    /**
     * The item, or one option of it, ready to be moved.
     *
     * An option is counted separately, so a movement against one starts from
     * that option's balance and says so by name.
     */
    function itemTarget(id: string, variantId?: string): MovementTarget | null {
        const row = itemRows.find(({ item }) => item.id === id);
        if (!row?.item.unit) return null;

        const option = variantId
            ? row.options.find((candidate) => candidate.id === variantId)
            : undefined;

        if (variantId && !option) return null;

        return {
            kind: "ITEM",
            id: row.item.id,
            ...(option ? { variantId: option.id } : {}),
            name: option
                ? `${row.item.name || "Unnamed item"} — ${option.name}`
                : row.item.name || "Unnamed item",
            onHand: option ? option.onHand : row.unassigned,
            baseUnitLabel: row.item.unit.name || "units",
            // The item's own conversions are what make "receive 2 sacks" work.
            //
            // Narrowed to the option being moved: the same unit can be defined
            // for several options and hold a different amount in each, so a
            // list built from all of them offers the same unit more than once
            // and cannot say which one it means.
            entryUnits: toEntryUnits(
                row.item.unit,
                conversionsForOption(row.item.uomConversions || [], option?.id),
            ),
        };
    }

    function addOnTarget(id: string): MovementTarget | null {
        const row = addOnRows.find(({ addOn }) => addOn.id === id);
        if (!row?.addOn.baseUnit) return null;

        return {
            kind: "ADDON",
            id: row.addOn.id,
            name: row.addOn.name || "Unnamed add-on",
            onHand: row.onHand,
            baseUnitLabel: row.addOn.baseUnit.name || "units",
            entryUnits: toEntryUnits(
                row.addOn.baseUnit,
                row.addOn.uomConversions || [],
            ),
        };
    }

    function openMovement(target: MovementTarget, direction: "IN" | "OUT") {
        setPending({ target, direction });
        setDialogOpen(true);
    }

    /** Sends what the dialog collected. Nothing is held on screen unsent. */
    async function recordMovement(movement: RecordedMovement) {
        try {
            await createEntry({
                ...(movement.targetKind === "ADDON"
                    ? { addOnId: movement.targetId }
                    : {
                          itemId: movement.targetId,
                          ...(movement.targetVariantId
                              ? { variantId: movement.targetVariantId }
                              : {}),
                      }),
                entryType:
                    movement.direction === "IN" ? "STOCK_IN" : "STOCK_OUT",
                quantityChange:
                    movement.direction === "IN"
                        ? movement.baseQuantity
                        : -movement.baseQuantity,
                unitCost: movement.unitCost,
                unitSalePrice: movement.unitSalePrice,
                enteredQuantity: movement.enteredQuantity,
                unitId: movement.enteredUnitId,
                // The dialog only sets these on the way in, and only for what
                // was actually filled in. The API refuses them on the way out.
                lotNumber: movement.lotNumber,
                manufacturedAt: movement.manufacturedAt,
                expiresAt: movement.expiresAt,
                receivedAt: movement.receivedAt,
                batchData: {},
                referenceType: "STOCK_OVERVIEW",
                referenceId: "",
                referenceNumber: "",
                reason: movement.reason,
            }).unwrap();

            setDialogOpen(false);
            toast({
                tone: "success",
                title:
                    movement.direction === "IN"
                        ? "Stock received"
                        : "Stock removed",
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Movement not recorded",
                description: getApiErrorMessage(
                    error,
                    "Unable to record that movement.",
                ),
            });
        }
    }

    return {
        items,
        addOns,
        entries,
        itemRows,
        addOnRows,
        onHandFor,
        movementTargets,
        itemTarget,
        addOnTarget,
        openMovement,
        recordMovement,
        pending,
        dialogOpen,
        setDialogOpen,
        recording: createState.isLoading,
        isLoading: itemsQuery.isLoading || stockQuery.isLoading,
        error: itemsQuery.error || stockQuery.error,
        retry: () => {
            itemsQuery.refetch();
            stockQuery.refetch();
        },
    };
}
