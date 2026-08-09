"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Boxes,
    CircleDollarSign,
    PackageX,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
} from "@/components/inventory/InventoryUi";
import type { DraftMovement } from "@/components/inventory/stock/stock-draft";
import { draftBalance } from "@/components/inventory/stock/stock-draft";
import {
    StockLevelTable,
    type StockLevelRow,
} from "@/components/inventory/stock/StockLevelTable";
import {
    StockMovementDialog,
    type MovementTarget,
} from "@/components/inventory/stock/StockMovementDialog";
import {
    StockMovementsTab,
    type MovementTargetInfo,
} from "@/components/inventory/stock/StockMovementsTab";
import {
    StockTabs,
    type StockTabId,
} from "@/components/inventory/stock/StockTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    latestUnitCosts,
    stockState,
    type StockState,
} from "@/lib/api/inventory";
import {
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
    useGetStockEntriesQuery,
} from "@/services/inventoryApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setStockSearch } from "@/store/inventoryUiSlice";

function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: typeof Boxes;
    accent: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div
                className={`grid size-10 place-items-center rounded-xl ${accent}`}
            >
                <Icon className="size-5" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
                {value}
            </p>
            {hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

export function InventoryStock() {
    const { format: formatMoney } = useMoney();
    const dispatch = useAppDispatch();
    const stockSearch = useAppSelector(
        (state) => state.inventoryUi.stockSearch,
    );
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const entriesQuery = useGetStockEntriesQuery();

    const [tab, setTab] = useState<StockTabId>("items");
    // Preview movements. Nothing is sent anywhere yet — see stock-draft.ts.
    const [drafts, setDrafts] = useState<DraftMovement[]>([]);
    const [pending, setPending] = useState<{
        target: MovementTarget;
        direction: "IN" | "OUT";
    } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);
    const entries = useMemo(() => entriesQuery.data || [], [entriesQuery.data]);
    const summaries = useMemo(
        () =>
            new Map(
                (stockQuery.data || []).map((summary) => [
                    summary.itemId,
                    summary,
                ]),
            ),
        [stockQuery.data],
    );
    const costs = useMemo(() => latestUnitCosts(entries), [entries]);

    const normalizedSearch = stockSearch.trim().toLowerCase();
    const matches = (haystack: (string | undefined)[]) =>
        !normalizedSearch ||
        haystack
            .filter(Boolean)
            .some((value) =>
                String(value).toLowerCase().includes(normalizedSearch),
            );

    /** The latest cost, or whatever a draft stock-in recorded for it. */
    const costFor = (kind: "ITEM" | "ADDON", id: string) => {
        const fromDraft = [...drafts]
            .reverse()
            .find(
                (movement) =>
                    movement.targetKind === kind &&
                    movement.targetId === id &&
                    movement.unitCost !== undefined,
            );

        return fromDraft?.unitCost ?? (kind === "ITEM" ? costs.get(id) : undefined);
    };

    const itemRows = items.map((item) => {
        const onHand =
            (summaries.get(item.id)?.quantityOnHand || 0) +
            draftBalance(drafts, "ITEM", item.id);
        const cost = costFor("ITEM", item.id);

        return {
            item,
            onHand,
            cost,
            state: stockState(onHand, item.lowStockDefault),
            pendingChange: draftBalance(drafts, "ITEM", item.id),
        };
    });

    const visibleItems = itemRows.filter(({ item }) =>
        matches([item.name, item.sku, item.barcode]),
    );

    const countState = (state: StockState) =>
        itemRows.filter((row) => row.state === state).length;

    const stockValue = itemRows
        .map((row) => row.onHand * (row.cost ?? 0))
        .reduce((total, value) => total + value, 0);
    const uncosted = itemRows.filter(
        (row) => row.cost === undefined && row.onHand > 0,
    ).length;

    /**
     * What the movements ledger needs to read each row accurately: the unit the
     * quantity is counted in, and the balance *before* any draft is applied, so
     * a movement can be shown as a step in a running balance.
     */
    const movementTargets = new Map<string, MovementTargetInfo>([
        ...items.map(
            (item) =>
                [
                    `ITEM:${item.id}`,
                    {
                        name: item.name || "Unnamed item",
                        unitLabel: item.unit?.name || "",
                        onHand: summaries.get(item.id)?.quantityOnHand || 0,
                    },
                ] as const,
        ),
    ]);

    function openMovement(
        target: MovementTarget,
        direction: "IN" | "OUT",
    ) {
        setPending({ target, direction });
        setDialogOpen(true);
    }

    function itemTarget(id: string): MovementTarget | null {
        const row = itemRows.find(({ item }) => item.id === id);
        if (!row) return null;

        return {
            kind: "ITEM",
            id: row.item.id,
            name: row.item.name || "Unnamed item",
            onHand: row.onHand,
            baseUnitLabel: row.item.unit?.name || "units",
            // Real items carry no conversions yet, so the base unit is the only
            // way to enter a quantity. Once conversions are saved this is where
            // "receive 10 cases" appears.
            entryUnits: [
                {
                    id: "base",
                    label: row.item.unit?.name || "units",
                    factor: 1,
                },
            ],
        };
    }

    if (itemsQuery.isLoading || stockQuery.isLoading) {
        return <InventoryLoading label="Loading stock" />;
    }

    if (itemsQuery.error || stockQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error || stockQuery.error,
                    "Unable to load stock information.",
                )}
                retry={() => {
                    itemsQuery.refetch();
                    stockQuery.refetch();
                }}
            />
        );
    }

    const itemLevelRows: StockLevelRow[] = visibleItems.map((row) => ({
        id: row.item.id,
        name: row.item.name || "Unnamed",
        subtitle: row.item.sku || "No SKU",
        onHand: row.onHand,
        unitLabel: row.item.unit?.name || "",
        threshold: row.item.lowStockDefault ?? 0,
        state: row.state,
        valueAtCost:
            row.cost === undefined ? undefined : row.onHand * row.cost,
        pendingChange: row.pendingChange,
        options: (row.item.variants || [])
            .filter((variant) => variant.name?.trim())
            .map((variant) => ({
                name: variant.name || "",
                available: variant.available !== false,
            })),
    }));

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Stock"
                description="Record what comes in and what goes out. Every change is a movement, so the history stays complete."
                action={
                    <Button
                        variant="outline"
                        render={<Link href="/inventory/stock/adjust" />}
                        nativeButton={false}
                        className="h-10 gap-2 rounded-xl"
                    >
                        <SlidersHorizontal className="size-4 text-foreground" />
                        Adjust Stock
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Tracked"
                    value={String(items.length)}
                    hint={items.length === 1 ? "1 item" : `${items.length} items`}
                    icon={Boxes}
                    accent="bg-success/10 text-success"
                />
                <MetricCard
                    label="Stock value at cost"
                    value={formatMoney(stockValue)}
                    hint={
                        uncosted
                            ? `${uncosted} with stock but no cost recorded`
                            : "From the last cost recorded on each"
                    }
                    icon={CircleDollarSign}
                    accent="bg-warning/10 text-warning"
                />
                <MetricCard
                    label="Low stock"
                    value={String(countState("LOW"))}
                    icon={AlertTriangle}
                    accent="bg-warning/15 text-warning"
                />
                <MetricCard
                    label="Out of stock"
                    value={String(countState("OUT"))}
                    icon={PackageX}
                    accent="bg-danger/10 text-danger"
                />
            </div>

            <StockTabs
                value={tab}
                onChange={setTab}
                counts={{
                    items: itemRows.length,
                    movements: drafts.length + entries.length,
                }}
            />

            <section
                role="tabpanel"
                id={`stock-panel-${tab}`}
                aria-labelledby={`stock-tab-${tab}`}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
                {tab === "movements" ? null : (
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold text-foreground">
                                Items
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Counted in each item&apos;s base unit.
                            </p>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={stockSearch}
                                onChange={(event) =>
                                    dispatch(setStockSearch(event.target.value))
                                }
                                placeholder="Search"
                                className="h-10 rounded-xl border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                )}

                {tab === "items" ? (
                    <StockLevelTable
                        rows={itemLevelRows}
                        emptyTitle={
                            items.length
                                ? "No matching items"
                                : "No items to track"
                        }
                        emptyDescription={
                            items.length
                                ? "Change the search."
                                : "Create an item before recording stock."
                        }
                        valueColumnLabel="Value at cost"
                        formatValue={formatMoney}
                    />
                ) : null}

                {tab === "movements" ? (
                    <StockMovementsTab
                        drafts={drafts}
                        entries={entries}
                        targets={movementTargets}
                        onUndo={(id) =>
                            setDrafts((current) =>
                                current.filter(
                                    (movement) => movement.id !== id,
                                ),
                            )
                        }
                        onClearDrafts={() => setDrafts([])}
                    />
                ) : null}
            </section>

            <StockMovementDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                target={pending?.target ?? null}
                direction={pending?.direction ?? "IN"}
                onRecord={(movement) =>
                    setDrafts((current) => [...current, movement])
                }
            />
        </div>
    );
}
