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

export function stockTargetKey(id: string, variantId?: string) {
    return variantId ? `${id}:${variantId}` : id;
}

export type StockOptionRow = {
    id: string;
    name: string;
    available: boolean;
    onHand: number;
    state: StockState;
};

export type StockItemRow = {
    item: InventoryItem;
    onHand: number;
    value?: number;
    state: StockState;
    pendingChange: number;
    options: StockOptionRow[];
    unassigned: number;
};

export type StockAddOnRow = {
    addOn: AddOn;
    onHand: number;
    value?: number;
    state: StockState;
};

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

    const items = useMemo(
        () => (itemsQuery.data || []).filter((item) => item.trackInventory !== false),
        [itemsQuery.data],
    );
    const addOns = useMemo(() => addOnsQuery.data || [], [addOnsQuery.data]);
    const entries = useMemo(() => entriesQuery.data || [], [entriesQuery.data]);
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
    const onHandFor = (id: string, variantId?: string) =>
        summaries.get(stockTargetKey(id, variantId))?.quantityOnHand || 0;

    const valueFor = (id: string, variantId?: string) =>
        summaries.get(stockTargetKey(id, variantId))?.stockValue;

    const itemOnHandFor = (item: InventoryItem) => {
        const options = item.variants || [];

        return options.reduce(
            (total, option) =>
                total + (option.id ? onHandFor(item.id, option.id) : 0),
            onHandFor(item.id),
        );
    };

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

    const addOnRows: StockAddOnRow[] = addOns.map((addOn) => {
        const onHand = onHandFor(addOn.id);

        return {
            addOn,
            onHand,
            value: valueFor(addOn.id),
            state: stockState(onHand, 0),
        };
    });

    const movementTargets = new Map<string, MovementTargetInfo>([
        ...items.map(
            (item) =>
                [
                    `ITEM:${item.id}`,
                    {
                        name: item.name || "Unnamed item",
                        unitLabel: item.unit?.name || "",
                        onHand: onHandFor(item.id),
                    },
                ] as const,
        ),
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
