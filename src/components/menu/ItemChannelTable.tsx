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
    /** Ids already published to the selected channel. */
    publishedItemIds: Set<string>;
    /** The row currently mid-request, so only that one shows a busy state. */
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
    const channelLabel = selectedChannelCode || activeChannelCode;

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e4eae2] bg-white shadow-[0_8px_30px_rgba(26,34,43,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7b857a]" />
                    <Input
                        placeholder="Search item name or code"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className={`${inventoryControlClassName} pl-10`}
                    />
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh channels"
                    className="inline-flex items-center justify-center rounded-lg border border-[#e4eae2] p-2.5 text-emerald-600 transition hover:bg-emerald-50"
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
                        <thead className="bg-[#f8faf7] text-xs font-semibold tracking-wide text-[#657064] uppercase">
                            <tr>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3">On {channelLabel}</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf0ec]">
                            {inventoryItems.map((item) => {
                                const isPublished = publishedItemIds.has(item.id);
                                const isPending = pendingItemId === item.id;

                                return (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-gray-50/80"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-[#161d16]">
                                                {item.name || "Unnamed"}
                                            </p>
                                            <p className="mt-1 text-xs text-[#7b857a]">
                                                {item.code || item.sku || item.id}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 font-semibold text-[#161d16]">
                                            {item.price != null
                                                ? `$${item.price.toFixed(2)}`
                                                : "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {isPublished ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-[#f0f0ee] px-3 py-1 text-xs font-semibold text-[#657064]">
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
                                                        ? "border-[#e4eae2] text-[#657064] hover:bg-gray-50"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
