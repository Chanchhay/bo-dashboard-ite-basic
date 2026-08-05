"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    Eye,
    LoaderCircle,
    PackagePlus,
    ScanBarcode,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";

import { BarcodeScannerDialog } from "@/components/inventory/BarcodeScannerDialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
    ItemPreviewDialog,
    toPreviewItem,
    type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
    inventoryItemQuerySchema,
    itemTypes,
    type InventoryItemQuery,
    type InventoryItemSort,
} from "@/lib/api/inventory";
import {
    useDeleteInventoryItemMutation,
    useGetInventoryItemsQuery,
    useGetInventoryUnitsQuery,
    useGetItemGroupsQuery,
} from "@/services/inventoryApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    applyProductFilters,
    clearAllProductFilters,
    clearProductFilter,
    resetProductDraftFilters,
    setProductDraftFilter,
    setProductPage,
    setProductPageSize,
    setProductSearch,
    setProductSort,
    setProductStatus,
    type ProductAdvancedFilterKey,
} from "@/store/inventoryUiSlice";

const pageSizes = [10, 20, 50] as const;

const sortLabels: Record<InventoryItemSort, string> = {
    "name,asc": "Name: A to Z",
    "name,desc": "Name: Z to A",
    "price,asc": "Price: low to high",
    "price,desc": "Price: high to low",
};

function statusClassName(status: string | undefined) {
    return status === "ACTIVE"
        ? "bg-success/10 text-success"
        : "bg-muted text-muted-foreground";
}

function titleCase(value: string) {
    return value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/^\w/, (letter) => letter.toUpperCase());
}

function FilterChip({
    label,
    onRemove,
}: {
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-success/20 bg-success/5 px-3 text-xs font-medium text-success">
            {label}
            <button
                type="button"
                onClick={onRemove}
                className="-mr-1 grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-success/10 hover:text-success focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={`Remove ${label} filter`}
            >
                <X className="size-3.5" />
            </button>
        </span>
    );
}

export function InventoryProductList() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const {
        productSearch,
        productStatus,
        productDraftFilters,
        productFilters,
        productSort,
        productPage,
        productPageSize,
    } = useAppSelector((state) => state.inventoryUi);
    const [debouncedSearch, setDebouncedSearch] = useState(productSearch);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [filterErrors, setFilterErrors] = useState<
        Record<string, string>
    >({});
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedSearch(productSearch),
            350,
        );

        return () => window.clearTimeout(timer);
    }, [productSearch]);

    const query: InventoryItemQuery = {
        page: productPage,
        size: productPageSize,
        sort: productSort,
        ...(debouncedSearch.trim()
            ? { keyword: debouncedSearch.trim() }
            : {}),
        ...(productStatus === "ALL" ? {} : { status: productStatus }),
        ...(productFilters.itemGroupId
            ? { itemGroupId: productFilters.itemGroupId }
            : {}),
        ...(productFilters.unitId
            ? { unitId: productFilters.unitId }
            : {}),
        ...(productFilters.itemType === "ALL"
            ? {}
            : {
                  itemType: productFilters.itemType as
                      | "DIGITAL"
                      | "SERVICE"
                      | "PHYSICAL",
              }),
        ...(productFilters.minPrice
            ? { minPrice: Number(productFilters.minPrice) }
            : {}),
        ...(productFilters.maxPrice
            ? { maxPrice: Number(productFilters.maxPrice) }
            : {}),
        ...(productFilters.sku.trim()
            ? { sku: productFilters.sku.trim() }
            : {}),
        ...(productFilters.barcode.trim()
            ? { barcode: productFilters.barcode.trim() }
            : {}),
    };

    const { data, error, isFetching, isLoading, refetch } =
        useGetInventoryItemsQuery(query);
    const groupsQuery = useGetItemGroupsQuery();
    const unitsQuery = useGetInventoryUnitsQuery();
    const [deleteItem, deleteState] = useDeleteInventoryItemMutation();
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

    const items = data?.content ?? [];
    const currentPage = data?.page?.number ?? productPage;
    const totalElements = data?.page?.totalElements ?? items.length;
    const totalPages = data?.page?.totalPages ?? (items.length ? 1 : 0);
    const responsePageSize = data?.page?.size ?? productPageSize;
    const firstResult = totalElements ? currentPage * responsePageSize + 1 : 0;
    const lastResult = totalElements
        ? Math.min(firstResult + items.length - 1, totalElements)
        : 0;

    const categoryOptions = (groupsQuery.data ?? []).flatMap((group) => [
        {
            id: group.id,
            label: group.name || "Unnamed category",
        },
        ...(group.subGroups ?? []).map((subGroup) => ({
            id: subGroup.id,
            label: `${group.name || "Category"} / ${subGroup.name || "Unnamed"}`,
        })),
    ]);
    const categoryName = new Map(
        categoryOptions.map((option) => [option.id, option.label]),
    );
    const unitName = new Map(
        (unitsQuery.data ?? []).map((unit) => [
            unit.id,
            unit.name || "Unnamed unit",
        ]),
    );

    const advancedFilterCount = Object.entries(productFilters).filter(
        ([key, value]) => key === "itemType" ? value !== "ALL" : Boolean(value),
    ).length;
    const hasFilters = Boolean(
        debouncedSearch.trim() ||
            productStatus !== "ALL" ||
            advancedFilterCount,
    );

    function updateDraftFilter(
        key: ProductAdvancedFilterKey,
        value: string,
    ) {
        dispatch(setProductDraftFilter({ key, value }));
        setFilterErrors((current) => {
            if (!current[key]) {
                return current;
            }

            const next = { ...current };
            delete next[key];
            return next;
        });
    }

    function handleApplyFilters() {
        const result = inventoryItemQuerySchema.safeParse({
            page: 0,
            size: productPageSize,
            sort: productSort,
            itemGroupId: productDraftFilters.itemGroupId || undefined,
            unitId: productDraftFilters.unitId || undefined,
            itemType:
                productDraftFilters.itemType === "ALL"
                    ? undefined
                    : productDraftFilters.itemType,
            minPrice: productDraftFilters.minPrice || undefined,
            maxPrice: productDraftFilters.maxPrice || undefined,
            sku: productDraftFilters.sku || undefined,
            barcode: productDraftFilters.barcode || undefined,
        });

        if (!result.success) {
            const nextErrors: Record<string, string> = {};

            for (const issue of result.error.issues) {
                nextErrors[String(issue.path[0] || "filters")] ||= issue.message;
            }

            setFilterErrors(nextErrors);
            toast({
                tone: "error",
                title: "Filters not applied",
                description:
                    result.error.issues[0]?.message ||
                    "Check the highlighted filters.",
            });
            return;
        }

        setFilterErrors({});
        dispatch(applyProductFilters());
        setFilterPanelOpen(false);
    }

    function resetDraftFilters() {
        setFilterErrors({});
        dispatch(resetProductDraftFilters());
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            await deleteItem(deleteTarget.id).unwrap();

            if (items.length === 1 && productPage > 0) {
                dispatch(setProductPage(productPage - 1));
            }
            setDeleteTarget(null);
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
                        className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 rounded-xl shrink-0"
                    >
                        <PackagePlus className="size-4 shrink-0" />
                        <span>Create item</span>
                    </Button>
                }
            />

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 border-b border-border p-4">
                    <div className="flex flex-row items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 sm:left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={productSearch}
                                onChange={(event) =>
                                    dispatch(
                                        setProductSearch(event.target.value),
                                    )
                                }
                                placeholder="Search items..."
                                className="!h-9 sm:!h-10 py-0 pl-8 sm:pl-9 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground"
                                aria-label="Search items"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                                    size="sm"
                                    aria-label="Filter items by status"
                                    className="!h-9 sm:!h-10 py-0 min-w-[68px] sm:w-44 px-2 sm:px-3 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground justify-between items-center"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="ACTIVE">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="INACTIVE">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label="Advanced filters"
                                aria-expanded={filterPanelOpen}
                                aria-controls="inventory-advanced-filters"
                                onClick={() =>
                                    setFilterPanelOpen((open) => !open)
                                }
                                className="relative !h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5"
                            >
                                <SlidersHorizontal className="size-4 shrink-0" />
                                <span className="hidden sm:inline">Advanced filters</span>
                                {advancedFilterCount ? (
                                    <span className="absolute -top-1 -right-1 sm:static grid size-4 sm:size-5 place-items-center rounded-full bg-primary text-[10px] sm:text-[11px] font-semibold text-white">
                                        {advancedFilterCount}
                                    </span>
                                ) : null}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label="Scan barcode"
                                onClick={() => setScannerOpen(true)}
                                className="!h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5"
                            >
                                <ScanBarcode className="size-4 shrink-0" />
                                <span className="hidden sm:inline">Scan barcode</span>
                            </Button>
                        </div>
                    </div>

                    {filterPanelOpen ? (
                        <div
                            id="inventory-advanced-filters"
                            className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5"
                        >
                            <div className="flex flex-col gap-1">
                                <h2 className="font-semibold text-foreground">
                                    Advanced filters
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Narrow the catalogue, then apply all fields
                                    together.
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-category">
                                        Category
                                    </Label>
                                    <Select
                                        value={
                                            productDraftFilters.itemGroupId ||
                                            "ALL"
                                        }
                                        items={{
                                            ALL: "All categories",
                                            ...Object.fromEntries(
                                                categoryOptions.map(
                                                    (option) => [
                                                        option.id,
                                                        option.label,
                                                    ],
                                                ),
                                            ),
                                        }}
                                        onValueChange={(value) =>
                                            updateDraftFilter(
                                                "itemGroupId",
                                                value === "ALL"
                                                    ? ""
                                                    : value || "",
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-category">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">
                                                All categories
                                            </SelectItem>
                                            {categoryOptions.map((option) => (
                                                <SelectItem
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterErrors.itemGroupId ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.itemGroupId}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-unit">
                                        Unit
                                    </Label>
                                    <Select
                                        value={
                                            productDraftFilters.unitId || "ALL"
                                        }
                                        onValueChange={(value) =>
                                            updateDraftFilter(
                                                "unitId",
                                                value === "ALL"
                                                    ? ""
                                                    : value || "",
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-unit">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">
                                                All units
                                            </SelectItem>
                                            {(unitsQuery.data ?? []).map(
                                                (unit) => (
                                                    <SelectItem
                                                        key={unit.id}
                                                        value={unit.id}
                                                    >
                                                        {unit.name ||
                                                            "Unnamed unit"}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {filterErrors.unitId ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.unitId}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-type">
                                        Item type
                                    </Label>
                                    <Select
                                        value={productDraftFilters.itemType}
                                        onValueChange={(value) =>
                                            updateDraftFilter(
                                                "itemType",
                                                value || "ALL",
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">
                                                All item types
                                            </SelectItem>
                                            {itemTypes.map((type) => (
                                                <SelectItem
                                                    key={type}
                                                    value={type}
                                                >
                                                    {titleCase(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterErrors.itemType ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.itemType}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-sort">
                                        Sort by
                                    </Label>
                                    <Select
                                        value={productSort}
                                        onValueChange={(value) =>
                                            dispatch(
                                                setProductSort(
                                                    (value ||
                                                        "name,asc") as InventoryItemSort,
                                                ),
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-sort">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(sortLabels).map(
                                                ([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-min-price">
                                        Minimum price
                                    </Label>
                                    <Input
                                        id="item-filter-min-price"
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={productDraftFilters.minPrice}
                                        aria-invalid={Boolean(
                                            filterErrors.minPrice,
                                        )}
                                        onChange={(event) =>
                                            updateDraftFilter(
                                                "minPrice",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {filterErrors.minPrice ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.minPrice}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-max-price">
                                        Maximum price
                                    </Label>
                                    <Input
                                        id="item-filter-max-price"
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        placeholder="No maximum"
                                        value={productDraftFilters.maxPrice}
                                        aria-invalid={Boolean(
                                            filterErrors.maxPrice,
                                        )}
                                        onChange={(event) =>
                                            updateDraftFilter(
                                                "maxPrice",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {filterErrors.maxPrice ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.maxPrice}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-sku">SKU</Label>
                                    <Input
                                        id="item-filter-sku"
                                        placeholder="Exact SKU"
                                        value={productDraftFilters.sku}
                                        aria-invalid={Boolean(filterErrors.sku)}
                                        onChange={(event) =>
                                            updateDraftFilter(
                                                "sku",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {filterErrors.sku ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.sku}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-barcode">
                                        Barcode
                                    </Label>
                                    <Input
                                        id="item-filter-barcode"
                                        placeholder="Exact barcode"
                                        value={productDraftFilters.barcode}
                                        aria-invalid={Boolean(
                                            filterErrors.barcode,
                                        )}
                                        onChange={(event) =>
                                            updateDraftFilter(
                                                "barcode",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {filterErrors.barcode ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.barcode}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-5 flex flex-row items-center justify-end gap-2.5 sm:gap-3">
                                <Button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-xl flex-1 sm:flex-initial"
                                >
                                    Apply filters
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetDraftFilters}
                                    className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-xl flex-1 sm:flex-initial"
                                >
                                    Reset fields
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {hasFilters ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Active filters
                            </span>
                            {debouncedSearch.trim() ? (
                                <FilterChip
                                    label={`Search: ${debouncedSearch.trim()}`}
                                    onRemove={() =>
                                        dispatch(setProductSearch(""))
                                    }
                                />
                            ) : null}
                            {productStatus !== "ALL" ? (
                                <FilterChip
                                    label={`Status: ${titleCase(productStatus)}`}
                                    onRemove={() =>
                                        dispatch(setProductStatus("ALL"))
                                    }
                                />
                            ) : null}
                            {productFilters.itemGroupId ? (
                                <FilterChip
                                    label={`Category: ${categoryName.get(productFilters.itemGroupId) || "Selected"}`}
                                    onRemove={() =>
                                        dispatch(
                                            clearProductFilter("itemGroupId"),
                                        )
                                    }
                                />
                            ) : null}
                            {productFilters.unitId ? (
                                <FilterChip
                                    label={`Unit: ${unitName.get(productFilters.unitId) || "Selected"}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("unitId"))
                                    }
                                />
                            ) : null}
                            {productFilters.itemType !== "ALL" ? (
                                <FilterChip
                                    label={`Type: ${titleCase(productFilters.itemType)}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("itemType"))
                                    }
                                />
                            ) : null}
                            {productFilters.minPrice ? (
                                <FilterChip
                                    label={`Min: ${formatMoney(Number(productFilters.minPrice))}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("minPrice"))
                                    }
                                />
                            ) : null}
                            {productFilters.maxPrice ? (
                                <FilterChip
                                    label={`Max: ${formatMoney(Number(productFilters.maxPrice))}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("maxPrice"))
                                    }
                                />
                            ) : null}
                            {productFilters.sku ? (
                                <FilterChip
                                    label={`SKU: ${productFilters.sku}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("sku"))
                                    }
                                />
                            ) : null}
                            {productFilters.barcode ? (
                                <FilterChip
                                    label={`Barcode: ${productFilters.barcode}`}
                                    onRemove={() =>
                                        dispatch(clearProductFilter("barcode"))
                                    }
                                />
                            ) : null}
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={() =>
                                    dispatch(clearAllProductFilters())
                                }
                            >
                                Clear all
                            </Button>
                        </div>
                    ) : null}
                </div>

                <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-2.5 text-sm text-muted-foreground">
                    <p aria-live="polite">
                        {isFetching ? (
                            <span className="inline-flex items-center gap-2">
                                <LoaderCircle className="size-4 animate-spin text-success" />
                                Updating items
                            </span>
                        ) : totalElements ? (
                            `Showing ${firstResult}–${lastResult} of ${totalElements} items`
                        ) : (
                            "0 items"
                        )}
                    </p>
                    <p>Sorted by {sortLabels[productSort].toLowerCase()}</p>
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
                ) : items.length === 0 ? (
                    <InventoryEmpty
                        title={hasFilters ? "No matching items" : "No items yet"}
                        description={
                            hasFilters
                                ? "Change or clear some filters to broaden the results."
                                : "Create your first item to begin tracking inventory."
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Category</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Price</th>
                                    <th className="px-5 py-3">Unit</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="text-foreground hover:bg-muted/50"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold">
                                                {item.name || "Unnamed"}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.sku ||
                                                    item.barcode ||
                                                    "No SKU or barcode"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {item.itemGroup?.name || "—"}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {item.itemType
                                                ? titleCase(item.itemType)
                                                : "—"}
                                        </td>
                                        <td className="px-5 py-4 font-semibold">
                                            {formatMoney(item.price)}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
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
                                                    type="button"
                                                    variant="outline"
                                                    size="icon-sm"
                                                    aria-label={`Preview ${item.name || "item"} in the store`}
                                                    onClick={() =>
                                                        setPreviewItem(
                                                            toPreviewItem(item),
                                                        )
                                                    }
                                                >
                                                    <Eye />
                                                </Button>
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
                                                    disabled={deleteState.isLoading}
                                                    onClick={() =>
                                                        setDeleteTarget({
                                                            id: item.id,
                                                            name: item.name,
                                                        })
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

                {!error && totalElements ? (
                    <nav
                        aria-label="Item pages"
                        className="flex flex-col gap-3 border-t border-border px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Label
                                htmlFor="item-page-size"
                                className="shrink-0 text-xs font-semibold text-muted-foreground"
                            >
                                Items per page
                            </Label>
                            <select
                                id="item-page-size"
                                value={productPageSize}
                                onChange={(e) =>
                                    dispatch(
                                        setProductPageSize(
                                            Number(e.target.value),
                                        ),
                                    )
                                }
                                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>
                                Showing {firstResult}–{lastResult} of{" "}
                                {totalElements}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 0 || isFetching}
                                onClick={() =>
                                    dispatch(setProductPage(currentPage - 1))
                                }
                            >
                                <ChevronLeft className="size-4" />
                                Previous
                            </Button>
                            <span className="px-2 text-xs font-medium text-muted-foreground">
                                Page {currentPage + 1} of {totalPages || 1}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                    currentPage + 1 >= totalPages || isFetching
                                }
                                onClick={() =>
                                    dispatch(setProductPage(currentPage + 1))
                                }
                            >
                                Next
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </nav>
                ) : null}

                {deleteState.isError ? (
                    <p
                        role="alert"
                        className="border-t border-border px-5 py-3 text-xs text-danger"
                    >
                        {getApiErrorMessage(
                            deleteState.error,
                            "Unable to delete the item.",
                        )}
                    </p>
                ) : null}
            </section>

            <ItemPreviewDialog
                open={Boolean(previewItem)}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewItem(null);
                    }
                }}
                item={previewItem}
            />
            <BarcodeScannerDialog
                open={scannerOpen}
                onOpenChange={setScannerOpen}
            />
            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={deleteTarget?.name ? `Delete ${deleteTarget.name}?` : "Delete item?"}
                description={
                    deleteTarget?.name ? (
                        <>
                            Are you sure you want to delete{" "}
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>
                            ? This action cannot be undone.
                        </>
                    ) : (
                        "Are you sure you want to delete this item? This action cannot be undone."
                    )
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isPending={deleteState.isLoading}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
