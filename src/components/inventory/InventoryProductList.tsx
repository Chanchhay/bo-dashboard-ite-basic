"use client";

import Link from "next/link";
import {
    Edit3,
    PackagePlus,
    Search,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    formatMoney,
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    inventoryControlClassName,
} from "@/components/inventory/InventoryUi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    setProductSearch,
    setProductStatus,
} from "@/store/inventoryUiSlice";
import {
    useDeleteInventoryItemMutation,
    useGetInventoryItemsQuery,
} from "@/services/inventoryApi";

function statusClassName(status: string | undefined) {
    return status === "ACTIVE"
        ? "bg-primary/10 text-primary"
        : "bg-[#ecefec] text-[#657064]";
}

export function InventoryProductList() {
    const dispatch = useAppDispatch();
    const { productSearch, productStatus } = useAppSelector(
        (state) => state.inventoryUi,
    );
    const { data: items, error, isLoading, refetch } =
        useGetInventoryItemsQuery();
    const [deleteItem, deleteState] =
        useDeleteInventoryItemMutation();

    const search = productSearch.trim().toLowerCase();
    const filteredItems = (items || []).filter((item) => {
        const matchesStatus =
            productStatus === "ALL" || item.status === productStatus;
        const matchesSearch =
            !search ||
            [item.name, item.sku, item.barcode, item.itemGroup?.name]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(search),
                );

        return matchesStatus && matchesSearch;
    });

    async function handleDelete(itemId: string, name?: string) {
        if (
            !window.confirm(
                `Delete ${name || "this item"}? This cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            await deleteItem(itemId).unwrap();
        } catch {
            // RTK Query exposes the request error below.
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Items"
                description="Manage the items and services available to your business."
                action={
                    <Button
                        render={<Link href="/inventory/new" />}
                        nativeButton={false}
                        className="h-11 gap-2 px-5"
                    >
                        <PackagePlus className="size-4" />
                        Create item
                    </Button>
                }
            />

            <section className="overflow-hidden rounded-2xl border border-[#e4eae2] bg-white shadow-[0_8px_30px_rgba(26,34,43,0.05)]">
                <div className="flex flex-col gap-3 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#7b857a]" />
                        <Input
                            value={productSearch}
                            onChange={(event) =>
                                dispatch(
                                    setProductSearch(event.target.value),
                                )
                            }
                            placeholder="Search name, SKU or barcode"
                            className={`${inventoryControlClassName} pl-10`}
                        />
                    </div>
                    <Select
                        value={productStatus}
                        onValueChange={(value) =>
                            dispatch(
                                setProductStatus(
                                    (value || "ALL") as
                                        | "ALL"
                                        | "ACTIVE"
                                        | "INACTIVE",
                                ),
                            )
                        }
                    >
                        <SelectTrigger
                            aria-label="Filter items by status"
                            className={`${inventoryControlClassName} w-full sm:w-44`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">
                                Inactive
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isLoading ? (
                    <InventoryLoading label="Loading items" />
                ) : error ? (
                    <InventoryError
                        message={getApiErrorMessage(
                            error,
                            "Unable to load items.",
                        )}
                        retry={refetch}
                    />
                ) : filteredItems.length === 0 ? (
                    <InventoryEmpty
                        title={
                            items?.length
                                ? "No matching items"
                                : "No items yet"
                        }
                        description={
                            items?.length
                                ? "Change the search or status filter."
                                : "Create your first item to begin tracking inventory."
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-[#f8faf7] text-xs font-semibold tracking-wide text-[#657064] uppercase">
                                <tr>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">
                                        Category
                                    </th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Price</th>
                                    <th className="px-5 py-3">Unit</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edf0ec]">
                                {filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="text-[#1a222b] hover:bg-[#fbfcfa]"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold">
                                                {item.name || "Unnamed"}
                                            </p>
                                            <p className="mt-1 text-xs text-[#7b857a]">
                                                {item.sku ||
                                                    item.barcode ||
                                                    "No SKU or barcode"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-[#657064]">
                                            {item.itemGroup?.name || "—"}
                                        </td>
                                        <td className="px-5 py-4 text-[#657064]">
                                            {item.itemType
                                                ?.toLowerCase()
                                                .replace(/^\w/, (letter) =>
                                                    letter.toUpperCase(),
                                                ) || "—"}
                                        </td>
                                        <td className="px-5 py-4 font-semibold">
                                            {formatMoney(item.price)}
                                        </td>
                                        <td className="px-5 py-4 text-[#657064]">
                                            {item.unit?.name || "—"}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}
                                            >
                                                {item.status || "INACTIVE"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon-sm"
                                                    render={
                                                        <Link
                                                            href={`/inventory/${item.id}/edit`}
                                                            aria-label={`Edit ${item.name || "item"}`}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                >
                                                    <Edit3 />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon-sm"
                                                    aria-label={`Delete ${item.name || "item"}`}
                                                    disabled={
                                                        deleteState.isLoading
                                                    }
                                                    onClick={() =>
                                                        handleDelete(
                                                            item.id,
                                                            item.name,
                                                        )
                                                    }
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {deleteState.error ? (
                    <p
                        className="border-t border-accent/20 bg-accent/5 px-5 py-3 text-sm text-accent"
                        role="alert"
                    >
                        {getApiErrorMessage(
                            deleteState.error,
                            "Unable to delete the item.",
                        )}
                    </p>
                ) : null}
            </section>
        </div>
    );
}
