import { Plus, RefreshCw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { inventoryControlClassName, InventoryEmpty, InventoryLoading } from "@/components/inventory/InventoryUi";
import type { InventoryItem } from "@/lib/api/inventory";
import { SwitchDemo } from "./SwitchButton";
import { useEnableItemSaleMutation } from "@/services/salesChannelApi";

interface ProductChannelTableProps {
    activeChannelCode: string;
    selectedChannelCode?: string;
    searchQuery: string;
    inventoryLoading: boolean;
    inventoryItems: InventoryItem[];
    onSearchChange: (value: string) => void;
    onRefresh: () => void;
    // onEnabledItem: (itemId: string) => void;
}

export function ProductChannelTable({
    activeChannelCode,
    selectedChannelCode,
    searchQuery,
    inventoryLoading,
    inventoryItems,
    onSearchChange,
    onRefresh,
    // onEnabledItem,
}: ProductChannelTableProps) {

    const [enabledSale,{data}] = useEnableItemSaleMutation()
    return (
        <section className="overflow-hidden rounded-2xl border border-[#e4eae2] bg-white shadow-[0_8px_30px_rgba(26,34,43,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7b857a]" />
                    <Input
                        placeholder="Search product name or code"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className={`${inventoryControlClassName} pl-10`}
                    />
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh Channels"
                    className="inline-flex items-center justify-center rounded-lg border border-[#e4eae2] p-2.5 text-emerald-600"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {inventoryLoading ? (
                <InventoryLoading label="Loading products" />
            ) : inventoryItems.length === 0 ? (
                <InventoryEmpty
                    title="No products found"
                    description={`Create active products in inventory first, then manage their access on ${selectedChannelCode || activeChannelCode}.`}
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-190 text-left text-sm">
                        <thead className="bg-[#f8faf7] text-xs font-semibold tracking-wide text-[#657064] uppercase">
                            <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3">Channel</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf0ec]">
                            {inventoryItems.map((item) => {
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-[#161d16]">{item.name || "Unnamed"}</p>
                                            <p className="mt-1 text-xs text-[#7b857a]">
                                                {item.code || item.sku || item.id}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-[#657064]">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eae2] bg-[#f8faf7] px-3 py-1 text-xs font-semibold text-[#344038]">
                                                {selectedChannelCode || activeChannelCode}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-[#161d16]">
                                            {item.price != null ? `$${item.price.toFixed(2)}` : "-"}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => enabledSale(item.id)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                            >
                                                enable
                                        
                                                     {/* <SwitchDemo   /> */}

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
