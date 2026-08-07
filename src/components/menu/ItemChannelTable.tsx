"use client";

import { useMoney } from "@/hooks/useMoney";
import { Check, Plus, RefreshCw, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    inventoryControlClassName,
    InventoryEmpty,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import type { InventoryItem } from "@/lib/api/inventory";

interface ItemChannelTableProps {
    activeChannelCode: string;
    selectedChannelCode?: string;
    searchQuery: string;
    inventoryLoading: boolean;
    inventoryItems: InventoryItem[];
    publishedItemIds: Set<string>;
    pendingItemId: string;
    onSearchChange: (value: string) => void;
    onRefresh: () => void;
    onPublish: (itemId: string) => void;
    onUnpublish: (itemId: string) => void;
}

export function ItemChannelTable({
    activeChannelCode,
    selectedChannelCode,
    searchQuery,
    inventoryLoading,
    inventoryItems,
    publishedItemIds,
    pendingItemId,
    onSearchChange,
    onRefresh,
    onPublish,
    onUnpublish,
}: ItemChannelTableProps) {
    const { format } = useMoney();
    const channelLabel = selectedChannelCode || activeChannelCode;

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search item name or code"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-10 pl-9 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh channels"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-success transition hover:bg-muted shadow-xs shrink-0"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Refresh channels</span>
                </button>
            </div>

            {inventoryLoading ? (
                <InventoryLoading label="Loading items" />
            ) : inventoryItems.length === 0 ? (
                <InventoryEmpty
                    title="No items found"
                    description={`Create active items in inventory first, then publish them to ${channelLabel}.`}
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-190 text-left text-sm">
                        <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3">On {channelLabel}</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {inventoryItems.map((item) => {
                                const isPublished = publishedItemIds.has(item.id);
                                const isPending = pendingItemId === item.id;

                                return (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-muted/50"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-foreground">
                                                {item.name || "Unnamed"}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.code || item.sku || item.id}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 font-semibold text-foreground">
                                            {item.price != null
                                                ? format(item.price)
                                                : "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {isPublished ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                                    Not published
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() =>
                                                    isPublished
                                                        ? onUnpublish(item.id)
                                                        : onPublish(item.id)
                                                }
                                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                                                    isPublished
                                                        ? "border-border text-muted-foreground hover:bg-muted/50"
                                                        : "border-success/30 bg-success/10 text-success hover:bg-success/20"
                                                }`}
                                            >
                                                {isPending ? (
                                                    "Working…"
                                                ) : isPublished ? (
                                                    <>
                                                        <X className="h-4 w-4" />
                                                        Remove
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-4 w-4" />
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
