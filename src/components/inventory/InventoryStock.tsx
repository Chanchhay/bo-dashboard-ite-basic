"use client";

import Link from "next/link";
import {
    AlertTriangle,
    Boxes,
    CircleDollarSign,
    PackageX,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import {
    formatMoney,
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    inventoryControlClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setStockSearch } from "@/store/inventoryUiSlice";
import {
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
    useGetStockEntriesQuery,
} from "@/services/inventoryApi";

function metricCard(
    label: string,
    value: string,
    icon: typeof Boxes,
    accent: string,
) {
    const Icon = icon;

    return (
        <div className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div
                className={`grid size-10 place-items-center rounded-xl ${accent}`}
            >
                <Icon className="size-5" />
            </div>
            <p className="mt-4 text-sm text-[#657064] dark:text-[#94a3b8]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#161d16] dark:text-[#f8fafc]">
                {value}
            </p>
        </div>
    );
}

export function InventoryStock() {
    const dispatch = useAppDispatch();
    const stockSearch = useAppSelector(
        (state) => state.inventoryUi.stockSearch,
    );
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const entriesQuery = useGetStockEntriesQuery();

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

    const items = itemsQuery.data || [];
    const summaries = new Map(
        (stockQuery.data || []).map((summary) => [
            summary.itemId,
            summary,
        ]),
    );
    const rows = items.map((item) => ({
        item,
        quantity: summaries.get(item.id)?.quantityOnHand || 0,
        updatedAt: summaries.get(item.id)?.updatedAt,
    }));
    const normalizedSearch = stockSearch.trim().toLowerCase();
    const filteredRows = rows.filter(
        ({ item }) =>
            !normalizedSearch ||
            [item.name, item.sku, item.barcode]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(normalizedSearch),
                ),
    );
    const outOfStock = rows.filter(({ quantity }) => quantity <= 0);
    const lowStock = rows.filter(
        ({ item, quantity }) =>
            quantity > 0 &&
            quantity <= (item.lowStockDefault || 0),
    );
    const inventoryValue = rows.reduce(
        (total, { item, quantity }) =>
            total + quantity * (item.price || 0),
        0,
    );
    const itemNames = new Map(
        items.map((item) => [item.id, item.name || "Unnamed item"]),
    );
    const recentEntries = [...(entriesQuery.data || [])]
        .sort(
            (left, right) =>
                new Date(right.createdDate || 0).getTime() -
                new Date(left.createdDate || 0).getTime(),
        )
        .slice(0, 6);

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Stock"
                description="Monitor quantities, value and recent inventory movements."
                action={
                    <Button
                        render={<Link href="/inventory/stock/adjust" />}
                        nativeButton={false}
                        size="lg"
                    >
                        <SlidersHorizontal />
                        Adjust stock
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricCard(
                    "Total items",
                    String(items.length),
                    Boxes,
                    "bg-primary/10 dark:bg-[#00932a]/20 text-primary dark:text-[#10b981]",
                )}
                {metricCard(
                    "Inventory value",
                    formatMoney(inventoryValue),
                    CircleDollarSign,
                    "bg-[#feb90d]/15 dark:bg-[#feb90d]/20 text-[#8a6500] dark:text-[#feb90d]",
                )}
                {metricCard(
                    "Low stock",
                    String(lowStock.length),
                    AlertTriangle,
                    "bg-[#fff4d6] dark:bg-[#f59e0b]/20 text-[#9a6900] dark:text-[#fbbf24]",
                )}
                {metricCard(
                    "Out of stock",
                    String(outOfStock.length),
                    PackageX,
                    "bg-accent/10 dark:bg-[#d14341]/20 text-accent dark:text-[#f87171]",
                )}
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 border-b border-[#edf0ec] dark:border-[#242937] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-[#161d16] dark:text-[#f8fafc]">
                            Current stock
                        </h2>
                        <p className="mt-1 text-sm text-[#657064]">
                            Quantity on hand for each configured item.
                        </p>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7b857a]" />
                        <Input
                            value={stockSearch}
                            onChange={(event) =>
                                dispatch(
                                    setStockSearch(event.target.value),
                                )
                            }
                            placeholder="Search items"
                            className={`${inventoryControlClassName} pl-10`}
                        />
                    </div>
                </div>

                {filteredRows.length === 0 ? (
                    <InventoryEmpty
                        title={
                            items.length
                                ? "No matching items"
                                : "No stock to display"
                        }
                        description={
                            items.length
                                ? "Change the stock search."
                                : "Create an item before recording stock."
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#f8faf7] text-xs font-semibold tracking-wide text-[#657064] uppercase">
                                <tr>
                                    <th className="px-5 py-3">Item</th>
                                    <th className="px-5 py-3">Category</th>
                                    <th className="px-5 py-3">
                                        Quantity
                                    </th>
                                    <th className="px-5 py-3">
                                        Threshold
                                    </th>
                                    <th className="px-5 py-3">Value</th>
                                    <th className="px-5 py-3">State</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edf0ec]">
                                {filteredRows.map(
                                    ({ item, quantity }) => {
                                        const threshold =
                                            item.lowStockDefault || 0;
                                        const state =
                                            quantity <= 0
                                                ? "Out of stock"
                                                : quantity <= threshold
                                                  ? "Low stock"
                                                  : "In stock";
                                        const stateClass =
                                            quantity <= 0
                                                ? "bg-accent/10 text-accent"
                                                : quantity <= threshold
                                                  ? "bg-[#fff4d6] text-[#9a6900]"
                                                  : "bg-primary/10 text-primary";

                                        return (
                                            <tr
                                                key={item.id}
                                                className="text-[#1a222b] hover:bg-[#fbfcfa]"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold">
                                                        {item.name ||
                                                            "Unnamed"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#7b857a]">
                                                        {item.sku ||
                                                            "No SKU"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-[#657064]">
                                                    {item.itemGroup?.name ||
                                                        "—"}
                                                </td>
                                                <td className="px-5 py-4 font-semibold">
                                                    {quantity}{" "}
                                                    <span className="font-normal text-[#7b857a]">
                                                        {item.unit?.name ||
                                                            ""}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-[#657064]">
                                                    {threshold}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {formatMoney(
                                                        quantity *
                                                            (item.price ||
                                                                0),
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClass}`}
                                                    >
                                                        {state}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="border-b border-[#edf0ec] dark:border-[#242937] px-5 py-4">
                    <h2 className="font-semibold text-[#161d16] dark:text-[#f8fafc]">
                        Recent stock activity
                    </h2>
                    <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                        Latest entries returned by the stock-entry API.
                    </p>
                </div>
                {entriesQuery.isLoading ? (
                    <InventoryLoading label="Loading stock activity" />
                ) : entriesQuery.error ? (
                    <InventoryError
                        message={getApiErrorMessage(
                            entriesQuery.error,
                            "Unable to load stock activity.",
                        )}
                        retry={entriesQuery.refetch}
                    />
                ) : recentEntries.length === 0 ? (
                    <InventoryEmpty
                        title="No stock activity yet"
                        description="Stock adjustments will appear here."
                    />
                ) : (
                    <div className="divide-y divide-[#edf0ec]">
                        {recentEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
                            >
                                <div>
                                    <p className="font-semibold text-[#1a222b]">
                                        {itemNames.get(
                                            entry.itemId || "",
                                        ) || "Unknown item"}
                                    </p>
                                    <p className="mt-1 text-xs text-[#7b857a]">
                                        {entry.entryType
                                            ?.toLowerCase()
                                            .replaceAll("_", " ") ||
                                            "Stock entry"}
                                        {entry.reason
                                            ? ` · ${entry.reason}`
                                            : ""}
                                    </p>
                                </div>
                                <p
                                    className={`font-semibold ${
                                        (entry.quantityChange || 0) >= 0
                                            ? "text-primary"
                                            : "text-accent"
                                    }`}
                                >
                                    {(entry.quantityChange || 0) > 0
                                        ? "+"
                                        : ""}
                                    {entry.quantityChange || 0}
                                </p>
                                <p className="text-xs text-[#7b857a]">
                                    {entry.createdDate
                                        ? new Intl.DateTimeFormat(
                                              "en-US",
                                              {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                              },
                                          ).format(
                                              new Date(
                                                  entry.createdDate,
                                              ),
                                          )
                                        : "—"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
