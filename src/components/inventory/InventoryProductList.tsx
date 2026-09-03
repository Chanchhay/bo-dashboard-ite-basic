"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { useMoney } from "@/hooks/useMoney";
import { formatAmount } from "@/lib/inventory-config/units";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit3,
    Eye,
    LoaderCircle,
    Package,
    PackagePlus,
    RotateCcw,
    ScanBarcode,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";

import { BarcodeScannerOverlay } from "@/components/inventory/BarcodeScannerOverlay";
import {
    ColumnSelectDropdown,
    type ColumnConfig,
} from "@/components/ui/ColumnSelectDropdown";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
    ItemPreviewDialog,
    toPreviewItem,
    type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
import {
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
    inventoryItemQuerySchema,
    itemTypes,
    type AddOn,
    type InventoryItem,
    type InventoryItemQuery,
    type InventoryItemSort,
    type StoredItemType,
} from "@/lib/api/inventory";
import { exportItemsToExcel } from "@/lib/exportToExcel";
import { cn } from "@/lib/utils";
import {
    useDeleteInventoryItemMutation,
    useRestoreInventoryItemMutation,
    usePermanentDeleteInventoryItemMutation,
    useGetAddOnSetsQuery,
    useGetInventoryItemOptionsQuery,
    useGetInventoryItemsQuery,
    useLazyGetInventoryItemsQuery,
    useGetInventoryUnitsQuery,
    useGetItemGroupsQuery,
    useUpdateItemAddOnAvailabilityMutation,
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

function TreeHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {children}
        </p>
    );
}

function TreeBranch({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative ml-3 space-y-1.5 border-l-2 border-primary/20 pl-4 dark:border-primary/30">
            {children}
        </div>
    );
}

function TreeLeaf({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-2.5 transition-colors hover:border-border/40 hover:bg-muted/40",
                className,
            )}
        >
            <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 -translate-y-1/2 bg-primary/30 dark:bg-primary/40" />
            {children}
        </div>
    );
}

function ItemOptionsTree({ item }: { item: InventoryItem }) {
    const { format: formatMoney } = useMoney();
    const options = item.variants || [];

    if (!options.length) return null;

    return (
        <div className="space-y-2 py-1">
            <TreeHeading>Options · {options.length}</TreeHeading>

            <TreeBranch>
                {options.map((option, index) => {
                    const onSale = option.available !== false;

                    return (
                        <TreeLeaf
                            key={option.id || `${item.id}-option-${index}`}
                            className={onSale ? undefined : "bg-muted/30 opacity-60"}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {option.name || "Unnamed option"}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {option.sku || option.barcode || "No SKU or barcode"}
                                </p>
                            </div>

                            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
                                {option.price == null ? (
                                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                        Not priced
                                    </span>
                                ) : (
                                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                        {formatMoney(option.price)}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                        onSale
                                            ? "bg-success/10 text-success"
                                            : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {onSale ? "On sale" : "Off sale"}
                                </span>
                            </div>
                        </TreeLeaf>
                    );
                })}
            </TreeBranch>
        </div>
    );
}

function ItemAddOnsTreeRow({ item }: { item: InventoryItem }) {
    const setsQuery = useGetAddOnSetsQuery();
    const { format: formatMoney } = useMoney();
    const { toast } = useToast();
    const [setAvailability, saveState] = useUpdateItemAddOnAvailabilityMutation();
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
        new Set(),
    );

    const toggleCategory = (catId: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const listed = item.addOns || [];

    async function setOnSale(addOn: AddOn, available: boolean) {
        try {
            await setAvailability({
                itemId: item.id,
                addOnId: addOn.id,
                available,
            }).unwrap();
        } catch (error) {
            toast({
                tone: "error",
                title: "Add-on not changed",
                description: getApiErrorMessage(
                    error,
                    `Unable to take ${addOn.name || "that add-on"} ${available ? "back on" : "off"} sale.`,
                ),
            });
        }
    }

    if (!listed.length) {
        return null;
    }

    const sets = setsQuery.data || [];
    const grouped = sets
        .map((set) => ({
            id: `${set.id}-${item.id}`,
            name: set.name || "Unnamed set",
            addOns: listed.filter((addOn) =>
                (set.addOns || []).some((member) => member.id === addOn.id),
            ),
        }))
        .filter((group) => group.addOns.length);

    const grouping = grouped.flatMap((group) => group.addOns.map((a) => a.id));
    const ungrouped = listed.filter((addOn) => !grouping.includes(addOn.id));

    const categories = [
        ...grouped,
        ...(ungrouped.length
            ? [
                {
                    id: `ungrouped-${item.id}`,
                    name: "Not in a set",
                    addOns: ungrouped,
                },
            ]
            : []),
    ];

    return (
        <div className="space-y-2 py-1">
            <TreeHeading>Add-ons · {listed.length}</TreeHeading>

            {categories.map((category) => {
                const isCollapsed = collapsedCategories.has(category.id);
                const onSaleCount = category.addOns.filter(
                    (addOn) => addOn.available !== false,
                ).length;

                return (
                    <div key={category.id} className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            aria-expanded={!isCollapsed}
                            className="flex w-full cursor-pointer flex-wrap items-baseline gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40"
                        >
                            <ChevronDown
                                className={cn(
                                    "size-4 self-center text-muted-foreground transition-transform duration-200",
                                    isCollapsed ? "-rotate-90" : "rotate-0",
                                )}
                            />
                            <span className="truncate text-xs font-semibold text-foreground">
                                {category.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {onSaleCount} of {category.addOns.length} on sale
                            </span>
                        </button>

                        {!isCollapsed ? (
                            <TreeBranch>
                                {category.addOns.map((addOn) => {
                                    const unitLabel =
                                        addOn.baseUnit?.symbol || addOn.baseUnit?.name || "";

                                    const onSale = addOn.available !== false;

                                    return (
                                        <TreeLeaf
                                            key={addOn.id}
                                            className={onSale ? undefined : "bg-muted/30 opacity-60"}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {addOn.name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {addOn.price == null
                                                        ? "Not priced"
                                                        : `+${formatMoney(addOn.price)}`}
                                                    {" · "}
                                                    {formatAmount(addOn.usePerOrder ?? 1)} {unitLabel} per
                                                    order
                                                </p>
                                            </div>

                                            <div className="ml-auto shrink-0 sm:ml-0">
                                                <Switch
                                                    id={`switch-${item.id}-${addOn.id}`}
                                                    checked={onSale}
                                                    disabled={saveState.isLoading}
                                                    onCheckedChange={(checked) =>
                                                        setOnSale(addOn, checked)
                                                    }
                                                    aria-label={`Sell ${addOn.name} on ${item.name}`}
                                                    title={
                                                        onSale
                                                            ? "On sale with this item"
                                                            : "Off the menu for this item — still attached"
                                                    }
                                                />
                                            </div>
                                        </TreeLeaf>
                                    );
                                })}
                            </TreeBranch>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: "number", label: "#", visible: true },
    { id: "name", label: "Name", visible: true },
    { id: "category", label: "Category", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "unit", label: "Unit", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "actions", label: "Actions", visible: true },
];

export function InventoryProductList() {
    const { format: formatMoney } = useMoney();
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
    const [filterErrors, setFilterErrors] = useState<Record<string, string>>({});
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [expandedAddOnItemIds, setExpandedAddOnItemIds] = useState<Set<string>>(
        new Set(),
    );
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

    const toggleColumn = (id: string) => {
        setColumnConfigs((prev) =>
            prev.map((col) =>
                col.id === id ? { ...col, visible: !col.visible } : col,
            ),
        );
    };

    const resetColumnDefaults = () => {
        setColumnConfigs(DEFAULT_COLUMNS);
    };

    const isColVisible = (id: string) => {
        return columnConfigs.find((col) => col.id === id)?.visible ?? true;
    };

    const visibleColCount = Math.max(1, columnConfigs.filter((c) => c.visible).length);

    const toggleAddOnTree = (itemId: string) => {
        setExpandedAddOnItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedSearch(productSearch),
            350,
        );

        return () => window.clearTimeout(timer);
    }, [productSearch]);

    const [viewMode, setViewMode] = useState<"active" | "trash">("active");

    const query: InventoryItemQuery = {
        page: productPage,
        size: productPageSize,
        sort: productSort,
        isDeleted: viewMode === "trash",
        ...(debouncedSearch.trim() ? { keyword: debouncedSearch.trim() } : {}),
        ...(productStatus === "ALL" ? {} : { status: productStatus }),
        ...(productFilters.itemGroupId
            ? { itemGroupId: productFilters.itemGroupId }
            : {}),
        ...(productFilters.unitId ? { unitId: productFilters.unitId } : {}),
        ...(productFilters.itemType === "ALL"
            ? {}
            : {
                itemType: productFilters.itemType as StoredItemType,
            }),
        ...(productFilters.minPrice
            ? { minPrice: Number(productFilters.minPrice) }
            : {}),
        ...(productFilters.maxPrice
            ? { maxPrice: Number(productFilters.maxPrice) }
            : {}),
        ...(productFilters.sku.trim() ? { sku: productFilters.sku.trim() } : {}),
        ...(productFilters.barcode.trim()
            ? { barcode: productFilters.barcode.trim() }
            : {}),
    };

    const { data, error, isFetching, isLoading, refetch } =
        useGetInventoryItemsQuery(query);
    const [triggerGetItems, { isFetching: isExporting }] =
        useLazyGetInventoryItemsQuery();
    const groupsQuery = useGetItemGroupsQuery();
    const unitsQuery = useGetInventoryUnitsQuery();
    const [deleteItem, deleteState] = useDeleteInventoryItemMutation();
    const [restoreItem, restoreState] = useRestoreInventoryItemMutation();
    const [permanentDeleteItem, permanentDeleteState] = usePermanentDeleteInventoryItemMutation();
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        name?: string;
    } | null>(null);
    const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{
        id: string;
        name?: string;
    } | null>(null);

    /*
     * RTK Query keeps `data` pointing at the last successful result while a
     * new one is in flight, so it does not flicker between pages. That is
     * right for pagination, but wrong across the Recycle Bin switch: for one
     * request it means `data` is still last tab's rows — active items while
     * `viewMode` already reads "trash", or the reverse. Rendering it as-is
     * showed a flash of the wrong tab's items before the new fetch landed.
     * Content answers which tab it belongs to on its own — every row's
     * `isDeleted` either matches the tab being asked for or it does not — so
     * a result that does not match the one being asked for is treated as not
     * arrived yet, the same as if nothing had come back at all.
     */
    const wantsTrash = viewMode === "trash";
    const rawItems = data?.content ?? [];
    const dataMatchesView = rawItems.every(
        (item) => Boolean(item.isDeleted) === wantsTrash,
    );
    const items = dataMatchesView ? rawItems : [];
    const currentPage = dataMatchesView
        ? (data?.page?.number ?? productPage)
        : productPage;
    const totalElements = dataMatchesView
        ? (data?.page?.totalElements ?? items.length)
        : 0;
    const totalPages = dataMatchesView
        ? (data?.page?.totalPages ?? (items.length ? 1 : 0))
        : 0;
    const responsePageSize = dataMatchesView
        ? (data?.page?.size ?? productPageSize)
        : productPageSize;
    const isSwitchingView = isFetching && !dataMatchesView;
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
    const itemOptionsQuery = useGetInventoryItemOptionsQuery();

    const dynamicPriceRanges = useMemo(() => {
        const storeItems = itemOptionsQuery.data ?? [];
        const prices: number[] = [];

        for (const item of storeItems) {
            if (
                typeof item.price === "number" &&
                !isNaN(item.price) &&
                item.price >= 0
            ) {
                prices.push(item.price);
            }
            if (Array.isArray(item.variants)) {
                for (const v of item.variants) {
                    if (typeof v.price === "number" && !isNaN(v.price) && v.price >= 0) {
                        prices.push(v.price);
                    }
                }
            }
        }

        const candidateSteps = [
            1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 500,
            750, 1000, 1500, 2000, 5000, 10000,
        ];

        let boundaries: number[] = [];

        if (prices.length === 0) {
            boundaries = [5, 10, 20, 50];
        } else {
            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);

            const firstStepIndex = candidateSteps.findIndex((step) => step > minP);
            const startIndex = firstStepIndex !== -1 ? firstStepIndex : 0;

            const selectedSteps: number[] = [];
            let currIdx = startIndex;
            while (currIdx < candidateSteps.length && selectedSteps.length < 4) {
                const step = candidateSteps[currIdx];
                selectedSteps.push(step);
                if (step >= maxP) {
                    break;
                }
                currIdx++;
            }

            if (
                selectedSteps.length === 1 &&
                startIndex + 1 < candidateSteps.length
            ) {
                selectedSteps.push(candidateSteps[startIndex + 1]);
            }

            boundaries = selectedSteps.length > 0 ? selectedSteps : [5, 10, 20, 50];
        }

        const options: Array<{
            id: string;
            label: string;
            minPrice: string;
            maxPrice: string;
        }> = [];

        const b1 = boundaries[0];
        options.push({
            id: `under-${b1}`,
            label: `Under ${formatMoney(b1)}`,
            minPrice: "",
            maxPrice: String(b1),
        });

        for (let i = 0; i < boundaries.length - 1; i++) {
            const low = boundaries[i];
            const high = boundaries[i + 1];
            options.push({
                id: `${low}-${high}`,
                label: `${formatMoney(low)} – ${formatMoney(high)}`,
                minPrice: String(low),
                maxPrice: String(high),
            });
        }

        const lastB = boundaries[boundaries.length - 1];
        options.push({
            id: `${lastB}-plus`,
            label: `${formatMoney(lastB)}+`,
            minPrice: String(lastB),
            maxPrice: "",
        });

        return options;
    }, [itemOptionsQuery.data, formatMoney]);

    const selectedPriceRangeKey = useMemo(() => {
        const min = productDraftFilters.minPrice;
        const max = productDraftFilters.maxPrice;
        if (!min && !max) return "ALL";

        const match = dynamicPriceRanges.find(
            (r) => r.minPrice === min && r.maxPrice === max,
        );
        return match ? match.id : "ALL";
    }, [
        productDraftFilters.minPrice,
        productDraftFilters.maxPrice,
        dynamicPriceRanges,
    ]);

    function handlePriceRangeChange(value: string) {
        if (value === "ALL") {
            updateDraftFilter("minPrice", "");
            updateDraftFilter("maxPrice", "");
        } else {
            const option = dynamicPriceRanges.find((r) => r.id === value);
            if (option) {
                updateDraftFilter("minPrice", option.minPrice);
                updateDraftFilter("maxPrice", option.maxPrice);
            }
        }
    }

    const advancedFilterCount = Object.entries(productFilters).filter(
        ([key, value]) => (key === "itemType" ? value !== "ALL" : Boolean(value)),
    ).length;
    const hasFilters = Boolean(
        debouncedSearch.trim() || productStatus !== "ALL" || advancedFilterCount,
    );

    function updateDraftFilter(key: ProductAdvancedFilterKey, value: string) {
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
                    result.error.issues[0]?.message || "Check the highlighted filters.",
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
            toast({
                tone: "success",
                title: "Moved to Trash",
                description: deleteTarget.name
                    ? `${deleteTarget.name} was moved to the Recycle Bin. You can restore it anytime.`
                    : "Item moved to Recycle Bin.",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Failed to move to Trash",
                description: getApiErrorMessage(cause, "Unable to move the item to trash."),
            });
        } finally {
            setDeleteTarget(null);
        }
    }

    async function handleRestore(item: InventoryItem) {
        try {
            await restoreItem(item.id).unwrap();
            toast({
                tone: "success",
                title: "Item restored",
                description: item.name
                    ? `${item.name} has been restored to active inventory.`
                    : "Item restored.",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Restore failed",
                description: getApiErrorMessage(cause, "Unable to restore the item."),
            });
        }
    }

    async function handleConfirmPermanentDelete() {
        if (!permanentDeleteTarget) return;

        try {
            await permanentDeleteItem(permanentDeleteTarget.id).unwrap();

            if (items.length === 1 && productPage > 0) {
                dispatch(setProductPage(productPage - 1));
            }
            toast({
                tone: "success",
                title: "Item permanently deleted",
                description: permanentDeleteTarget.name
                    ? `${permanentDeleteTarget.name} was permanently erased from the system.`
                    : "Item permanently deleted.",
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Permanent delete failed",
                description: getApiErrorMessage(cause, "Unable to permanently delete the item."),
            });
        } finally {
            setPermanentDeleteTarget(null);
        }
    }

    async function handleExportExcel() {
        try {
            const fullData = await triggerGetItems({
                ...query,
                page: 0,
                size: 1000,
            }).unwrap();
            const exportList =
                fullData?.content && fullData.content.length ? fullData.content : items;
            exportItemsToExcel(exportList, categoryName, unitName);
            toast({
                tone: "success",
                title: "Dataset exported",
                description: `Exported ${exportList.length} item(s) to Excel format (.csv).`,
            });
        } catch {
            exportItemsToExcel(items, categoryName, unitName);
            toast({
                tone: "success",
                title: "Dataset exported",
                description: `Exported ${items.length} item(s) to Excel format (.csv).`,
            });
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header Section (sticky on desktop only) */}
            <div className="static lg:sticky lg:top-0 lg:z-30 pt-2 pb-2.5 bg-shell/95 lg:backdrop-blur-md transition-all w-full max-w-full min-w-0">
                <InventoryPageHeader
                    title="Master Items"
                    description="Manage the items and services available to your business."
                    className="flex-col sm:flex-row sm:items-start"
                    action={
                        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto">
                            <div data-tour="export-header-excel" className="w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleExportExcel}
                                    disabled={!items.length || isExporting}
                                    className="h-9 sm:h-10 w-full sm:w-auto px-2.5 sm:px-4 text-xs sm:text-sm gap-1.5 rounded-xl justify-center"
                                >
                                    {isExporting ? (
                                        <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                                    ) : (
                                        <Download className="size-4 shrink-0 text-primary" />
                                    )}
                                    <span className="truncate">{isExporting ? "Exporting..." : "Export Excel"}</span>
                                </Button>
                            </div>
                            <div data-tour="add-item" className="w-full sm:w-auto">
                                <Button
                                    render={<Link href="/inventory/new" />}
                                    nativeButton={false}
                                    className="h-9 sm:h-10 w-full sm:w-auto px-2.5 sm:px-4 text-xs sm:text-sm gap-1.5 rounded-xl justify-center"
                                >
                                    <PackagePlus className="size-4 shrink-0" />
                                    <span className="truncate">Create Master Item</span>
                                </Button>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* View Switcher: All Products vs Recycle Bin */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 border-b border-border pb-2.5 sm:pb-3 overflow-x-auto scrollbar-none flex-nowrap">
                <button
                    type="button"
                    onClick={() => {
                        setViewMode("active");
                        dispatch(setProductPage(0));
                    }}
                    className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer",
                        viewMode === "active"
                            ? "bg-primary/10 text-primary font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    <span>All Products</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setViewMode("trash");
                        dispatch(setProductPage(0));
                    }}
                    className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer",
                        viewMode === "trash"
                            ? "bg-red-50 dark:bg-red-950/40 text-brand-red font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <Trash2 className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", viewMode === "trash" ? "text-brand-red" : "text-muted-foreground")} />
                    <span>Recycle Bin</span>
                </button>
            </div>

            <section data-tour="item-list" className="overflow-clip rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-2.5 sm:gap-3 border-b border-border bg-card p-3 sm:p-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                        <div className="relative w-full sm:min-w-0 sm:flex-1" data-tour="item-search">
                            <Search className="pointer-events-none absolute top-1/2 left-3 sm:left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={productSearch}
                                onChange={(event) =>
                                    dispatch(setProductSearch(event.target.value))
                                }
                                placeholder={viewMode === "trash" ? "Search deleted items in trash..." : "Search items..."}
                                className="!h-9 sm:!h-10 py-0 pl-8 sm:pl-9 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground w-full shadow-xs"
                                aria-label="Search items"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                            <div className="flex-1 min-w-0 sm:w-44 sm:flex-initial">
                                <Select
                                    value={productStatus}
                                    onValueChange={(value) =>
                                        dispatch(
                                            setProductStatus(
                                                (value || "ALL") as "ALL" | "ACTIVE" | "INACTIVE",
                                            ),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        size="sm"
                                        data-tour="status-filter"
                                        aria-label="Filter items by status"
                                        className="!h-9 sm:!h-10 py-0 w-full sm:w-44 px-2.5 sm:px-3 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground justify-between items-center shadow-xs whitespace-nowrap"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All statuses</SelectItem>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-tour="advanced-filters"
                                aria-label="Advanced filters"
                                aria-expanded={filterPanelOpen}
                                aria-controls="inventory-advanced-filters"
                                onClick={() => setFilterPanelOpen((open) => !open)}
                                className="relative !h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
                                <span className="hidden sm:inline">Advanced Filters</span>
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
                                data-tour="scan-barcode"
                                aria-label="Scan barcode"
                                onClick={() => setScannerOpen(true)}
                                className="!h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <ScanBarcode className="size-4 shrink-0 text-muted-foreground" />
                                <span className="hidden sm:inline">Scan Barcode</span>
                            </Button>

                            <ColumnSelectDropdown
                                columns={columnConfigs}
                                onToggleColumn={toggleColumn}
                                onResetDefaults={resetColumnDefaults}
                            />
                        </div>
                    </div>

                    {filterPanelOpen ? (
                        <div
                            id="inventory-advanced-filters"
                            className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5"
                        >
                            <div className="flex flex-col gap-1">
                                <h2 className="font-semibold text-foreground">
                                    Advanced Filters
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Narrow the catalogue, then apply all fields together.
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-category">Category</Label>
                                    <Select
                                        value={productDraftFilters.itemGroupId || "ALL"}
                                        items={{
                                            ALL: "All categories",
                                            ...Object.fromEntries(
                                                categoryOptions.map((option) => [
                                                    option.id,
                                                    option.label,
                                                ]),
                                            ),
                                        }}
                                        onValueChange={(value) =>
                                            updateDraftFilter(
                                                "itemGroupId",
                                                value === "ALL" ? "" : value || "",
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-category">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All categories</SelectItem>
                                            {categoryOptions.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
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
                                    <Label htmlFor="item-filter-unit">Unit</Label>
                                    <Select
                                        value={productDraftFilters.unitId || "ALL"}
                                        onValueChange={(value) =>
                                            updateDraftFilter(
                                                "unitId",
                                                value === "ALL" ? "" : value || "",
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-unit">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All units</SelectItem>
                                            {(unitsQuery.data ?? []).map((unit) => (
                                                <SelectItem key={unit.id} value={unit.id}>
                                                    {unit.name || "Unnamed unit"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterErrors.unitId ? (
                                        <p className="text-xs text-danger">{filterErrors.unitId}</p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-type">Item type</Label>
                                    <Select
                                        value={productDraftFilters.itemType}
                                        onValueChange={(value) =>
                                            updateDraftFilter("itemType", value || "ALL")
                                        }
                                    >
                                        <SelectTrigger id="item-filter-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All item types</SelectItem>
                                            {itemTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
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
                                    <Label htmlFor="item-filter-sort">Sort by</Label>
                                    <Select
                                        value={productSort}
                                        onValueChange={(value) =>
                                            dispatch(
                                                setProductSort(
                                                    (value || "name,asc") as InventoryItemSort,
                                                ),
                                            )
                                        }
                                    >
                                        <SelectTrigger id="item-filter-sort">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(sortLabels).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-price-range">Price range</Label>
                                    <Select
                                        value={selectedPriceRangeKey}
                                        onValueChange={(value) =>
                                            handlePriceRangeChange(value || "ALL")
                                        }
                                    >
                                        <SelectTrigger id="item-filter-price-range">
                                            <SelectValue placeholder="All prices" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All prices</SelectItem>
                                            {dynamicPriceRanges.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterErrors.minPrice || filterErrors.maxPrice ? (
                                        <p className="text-xs text-danger">
                                            {filterErrors.minPrice || filterErrors.maxPrice}
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
                                            updateDraftFilter("sku", event.target.value)
                                        }
                                    />
                                    {filterErrors.sku ? (
                                        <p className="text-xs text-danger">{filterErrors.sku}</p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="item-filter-barcode">Barcode</Label>
                                    <Input
                                        id="item-filter-barcode"
                                        placeholder="Exact barcode"
                                        value={productDraftFilters.barcode}
                                        aria-invalid={Boolean(filterErrors.barcode)}
                                        onChange={(event) =>
                                            updateDraftFilter("barcode", event.target.value)
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
                                    Apply Filters
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetDraftFilters}
                                    className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-xl flex-1 sm:flex-initial"
                                >
                                    Reset Fields
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
                                    onRemove={() => dispatch(setProductSearch(""))}
                                />
                            ) : null}
                            {productStatus !== "ALL" ? (
                                <FilterChip
                                    label={`Status: ${titleCase(productStatus)}`}
                                    onRemove={() => dispatch(setProductStatus("ALL"))}
                                />
                            ) : null}
                            {productFilters.itemGroupId ? (
                                <FilterChip
                                    label={`Category: ${categoryName.get(productFilters.itemGroupId) || "Selected"}`}
                                    onRemove={() => dispatch(clearProductFilter("itemGroupId"))}
                                />
                            ) : null}
                            {productFilters.unitId ? (
                                <FilterChip
                                    label={`Unit: ${unitName.get(productFilters.unitId) || "Selected"}`}
                                    onRemove={() => dispatch(clearProductFilter("unitId"))}
                                />
                            ) : null}
                            {productFilters.itemType !== "ALL" ? (
                                <FilterChip
                                    label={`Type: ${titleCase(productFilters.itemType)}`}
                                    onRemove={() => dispatch(clearProductFilter("itemType"))}
                                />
                            ) : null}
                            {productFilters.minPrice || productFilters.maxPrice ? (
                                <FilterChip
                                    label={
                                        productFilters.minPrice && productFilters.maxPrice
                                            ? `Price: ${formatMoney(Number(productFilters.minPrice))} – ${formatMoney(Number(productFilters.maxPrice))}`
                                            : productFilters.maxPrice
                                                ? `Price: Under ${formatMoney(Number(productFilters.maxPrice))}`
                                                : `Price: ${formatMoney(Number(productFilters.minPrice))}+`
                                    }
                                    onRemove={() => {
                                        dispatch(clearProductFilter("minPrice"));
                                        dispatch(clearProductFilter("maxPrice"));
                                    }}
                                />
                            ) : null}
                            {productFilters.sku ? (
                                <FilterChip
                                    label={`SKU: ${productFilters.sku}`}
                                    onRemove={() => dispatch(clearProductFilter("sku"))}
                                />
                            ) : null}
                            {productFilters.barcode ? (
                                <FilterChip
                                    label={`Barcode: ${productFilters.barcode}`}
                                    onRemove={() => dispatch(clearProductFilter("barcode"))}
                                />
                            ) : null}
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={() => dispatch(clearAllProductFilters())}
                            >
                                Clear all
                            </Button>
                        </div>
                    ) : null}
                </div>


                {isLoading || isSwitchingView ? (
                    <InventoryLoading label="Loading items" />
                ) : error ? (
                    <InventoryError
                        message={getApiErrorMessage(error, "Unable to load items.")}
                        retry={refetch}
                    />
                ) : items.length === 0 ? (
                    <InventoryEmpty
                        title={
                            viewMode === "trash"
                                ? "Recycle Bin is empty"
                                : hasFilters
                                ? "No matching items"
                                : "No items yet"
                        }
                        description={
                            viewMode === "trash"
                                ? "Deleted products will appear here. You can restore them anytime or permanently erase them."
                                : hasFilters
                                ? "Change or clear some filters to broaden the results."
                                : "Create your first item to begin tracking inventory."
                        }
                    />
                ) : (
                    <>
                        {/* Mobile Cards (< md) */}
                        <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
                            {items.map((item, index) => {
                                const hasExpandableContent = Boolean(
                                    (item.variants && item.variants.length > 0) ||
                                    (item.addOns && item.addOns.length > 0),
                                );
                                const isExpanded = hasExpandableContent && expandedAddOnItemIds.has(item.id);
                                const itemNumber = firstResult + index;

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-muted-foreground">#{itemNumber}</span>
                                                    <span className="font-bold text-sm text-foreground dark:text-white truncate">
                                                        {item.name || "Unnamed"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                                    {item.sku || item.barcode || "No SKU / barcode"}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold mr-1 ${statusClassName(item.status)}`}
                                                >
                                                    {item.status || "INACTIVE"}
                                                </span>
                                                {viewMode === "trash" ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7 rounded-lg border-0 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors"
                                                            title="Restore product"
                                                            aria-label={`Restore ${item.name || "item"}`}
                                                            disabled={restoreState.isLoading}
                                                            onClick={() => handleRestore(item)}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7 rounded-lg border-0 bg-transparent text-brand-red hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-brand-red cursor-pointer transition-colors"
                                                            title="Delete permanently"
                                                            aria-label={`Permanently delete ${item.name || "item"}`}
                                                            disabled={permanentDeleteState.isLoading}
                                                            onClick={() =>
                                                                setPermanentDeleteTarget({
                                                                    id: item.id,
                                                                    name: item.name,
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7"
                                                            aria-label={`Preview ${item.name || "item"}`}
                                                            onClick={() => setPreviewItem(toPreviewItem(item))}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7"
                                                            render={
                                                                <Link
                                                                    href={`/inventory/${item.id}/edit`}
                                                                    aria-label={`Edit ${item.name || "item"}`}
                                                                />
                                                            }
                                                            nativeButton={false}
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-7 w-7 border-0 bg-transparent text-brand-red hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-brand-red cursor-pointer transition-colors"
                                                            aria-label={`Delete ${item.name || "item"}`}
                                                            disabled={deleteState.isLoading}
                                                            onClick={() =>
                                                                setDeleteTarget({
                                                                    id: item.id,
                                                                    name: item.name,
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Key-Value Rows */}
                                        <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                            <div className="flex items-center justify-between px-3.5 py-2.5">
                                                <span className="text-muted-foreground dark:text-slate-400">Category</span>
                                                <span className="font-medium text-foreground dark:text-slate-200">
                                                    {item.itemGroup?.name || "—"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between px-3.5 py-2.5">
                                                <span className="text-muted-foreground dark:text-slate-400">Type</span>
                                                <span className="font-medium text-foreground dark:text-slate-200">
                                                    {item.itemType ? titleCase(item.itemType) : "—"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between px-3.5 py-2.5">
                                                <span className="text-muted-foreground dark:text-slate-400">Unit</span>
                                                <span className="font-medium text-foreground dark:text-slate-200">
                                                    {item.unit?.name || "—"}
                                                </span>
                                            </div>

                                            {hasExpandableContent && (
                                                <div className="px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAddOnTree(item.id)}
                                                        className="w-full flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer"
                                                    >
                                                        <span>Options & Add-ons</span>
                                                        <ChevronDown
                                                            className={cn(
                                                                "size-4 transition-transform duration-200",
                                                                isExpanded ? "rotate-180" : "rotate-0"
                                                            )}
                                                        />
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-3 pt-3 border-t border-border/60">
                                                            <ItemOptionsTree item={item} />
                                                            <ItemAddOnsTreeRow item={item} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-auto max-h-[calc(100dvh-290px)] sm:max-h-[calc(100dvh-300px)]">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead className="sticky top-0 z-10 bg-card border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-xs">
                                    <tr>
                                        {isColVisible("number") && (
                                            <th className="w-14 px-5 py-3 text-muted-foreground bg-card">#</th>
                                        )}
                                        {isColVisible("name") && <th className="px-5 py-3 bg-card">Name</th>}
                                        {isColVisible("category") && <th className="px-5 py-3 bg-card">Category</th>}
                                        {isColVisible("type") && <th className="px-5 py-3 bg-card">Type</th>}
                                        {isColVisible("unit") && <th className="px-5 py-3 bg-card">Unit</th>}
                                        {isColVisible("status") && <th className="px-5 py-3 bg-card">Status</th>}
                                        {isColVisible("actions") && (
                                            <th className="px-5 py-3 text-right bg-card">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.flatMap((item, index) => {
                                        const hasExpandableContent = Boolean(
                                            (item.variants && item.variants.length > 0) ||
                                            (item.addOns && item.addOns.length > 0),
                                        );
                                        const isExpanded = hasExpandableContent && expandedAddOnItemIds.has(item.id);
                                        const itemNumber = firstResult + index;

                                        const mainRow = (
                                            <tr
                                                key={item.id}
                                                className={cn(
                                                    "text-foreground hover:bg-muted/50 transition-colors",
                                                    isExpanded && "bg-muted/30 font-medium",
                                                )}
                                            >
                                                {isColVisible("number") && (
                                                    <td className="px-5 py-4 text-xs font-semibold tabular-nums text-muted-foreground">
                                                        {itemNumber}
                                                    </td>
                                                )}
                                                {isColVisible("name") && (
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-semibold text-foreground">
                                                                    {item.name || "Unnamed"}
                                                                </p>
                                                                {hasExpandableContent ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleAddOnTree(item.id)}
                                                                        aria-label={`Toggle options and add-ons for ${item.name || "item"}`}
                                                                        aria-expanded={isExpanded}
                                                                        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full bg-muted/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus:outline-none"
                                                                        title="View options and add-ons"
                                                                    >
                                                                        <ChevronDown
                                                                            className={cn(
                                                                                "size-4 transition-transform duration-200",
                                                                                isExpanded
                                                                                    ? "rotate-180 text-primary"
                                                                                    : "rotate-0",
                                                                            )}
                                                                        />
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.sku || item.barcode || "No SKU or barcode"}
                                                            </p>
                                                        </div>
                                                    </td>
                                                )}
                                                {isColVisible("category") && (
                                                    <td className="px-5 py-4 text-muted-foreground">
                                                        {item.itemGroup?.name || "—"}
                                                    </td>
                                                )}
                                                {isColVisible("type") && (
                                                    <td className="px-5 py-4 text-muted-foreground">
                                                        {item.itemType ? titleCase(item.itemType) : "—"}
                                                    </td>
                                                )}
                                                {isColVisible("unit") && (
                                                    <td className="px-5 py-4 text-muted-foreground">
                                                        {item.unit?.name || "—"}
                                                    </td>
                                                )}
                                                {isColVisible("status") && (
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}
                                                        >
                                                            {item.status || "INACTIVE"}
                                                        </span>
                                                    </td>
                                                )}
                                                {isColVisible("actions") && (
                                                    <td className="px-5 py-4">
                                                        <div data-tour={items.indexOf(item) === 0 ? "item-actions" : undefined} className="flex justify-end gap-2">
                                                            {viewMode === "trash" ? (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 px-3 rounded-xl border-0 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-none"
                                                                        aria-label={`Restore ${item.name || "item"}`}
                                                                        disabled={restoreState.isLoading}
                                                                        onClick={() => handleRestore(item)}
                                                                    >
                                                                        <RotateCcw className="size-3.5 text-primary" />
                                                                        <span>Restore</span>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 px-3 rounded-xl border-0 bg-transparent text-brand-red hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-brand-red gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-none"
                                                                        aria-label={`Delete forever ${item.name || "item"}`}
                                                                        disabled={permanentDeleteState.isLoading}
                                                                        onClick={() =>
                                                                            setPermanentDeleteTarget({
                                                                                id: item.id,
                                                                                name: item.name,
                                                                            })
                                                                        }
                                                                    >
                                                                        <Trash2 className="size-3.5 text-brand-red" />
                                                                        <span>Delete Forever</span>
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon-sm"
                                                                        aria-label={`Preview ${item.name || "item"} in the store`}
                                                                        onClick={() => setPreviewItem(toPreviewItem(item))}
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
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        className="cursor-pointer border-0 bg-transparent text-brand-red hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-brand-red transition-colors"
                                                                        aria-label={`Delete ${item.name || "item"}`}
                                                                        disabled={deleteState.isLoading}
                                                                        onClick={() =>
                                                                            setDeleteTarget({
                                                                                id: item.id,
                                                                                name: item.name,
                                                                            })
                                                                        }
                                                                    >
                                                                        <Trash2 className="size-4 text-brand-red" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );

                                        if (!isExpanded) return [mainRow];

                                        const treeRow = (
                                            <tr key={`${item.id}-addons-tree`} className="bg-muted/20">
                                                <td
                                                    colSpan={visibleColCount}
                                                    className="border-b border-border px-5 py-4"
                                                >
                                                    <ItemOptionsTree item={item} />
                                                    <ItemAddOnsTreeRow item={item} />
                                                </td>
                                            </tr>
                                        );

                                        return [mainRow, treeRow];
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!error && totalElements ? (
                    <PaginationBar
                        page={currentPage}
                        size={productPageSize}
                        totalElements={totalElements}
                        totalPages={totalPages}
                        onPageChange={(next) => dispatch(setProductPage(next))}
                        onSizeChange={(next) => dispatch(setProductPageSize(next))}
                        isLoading={isFetching}
                        itemLabel="row"
                        itemLabelPlural="rows"
                    />
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
            <BarcodeScannerOverlay open={scannerOpen} onOpenChange={setScannerOpen} />
            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                tone="info"
                title={
                    deleteTarget?.name ? `Move ${deleteTarget.name} to Trash?` : "Move item to Trash?"
                }
                description={
                    deleteTarget?.name ? (
                        <>
                            Are you sure you want to move{" "}
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>{" "}
                            to the Recycle Bin? It will be hidden from POS and storefronts, and you can restore it anytime.
                        </>
                    ) : (
                        "Are you sure you want to move this item to the Recycle Bin? You can restore it anytime."
                    )
                }
                confirmLabel="Move to Trash"
                cancelLabel="Cancel"
                isPending={deleteState.isLoading}
                onConfirm={handleConfirmDelete}
            />

            <DestructiveConfirmDialog
                open={Boolean(permanentDeleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setPermanentDeleteTarget(null);
                }}
                tone="danger"
                title={
                    permanentDeleteTarget?.name
                        ? `Permanently delete ${permanentDeleteTarget.name}?`
                        : "Permanently delete item?"
                }
                description={
                    permanentDeleteTarget?.name ? (
                        <>
                            Are you sure you want to permanently delete{" "}
                            <strong className="font-semibold text-foreground">
                                {permanentDeleteTarget.name}
                            </strong>
                            ? This action cannot be undone. All images and product records will be erased. Past receipts will preserve the snapshot name and price for accounting.
                        </>
                    ) : (
                        "Are you sure you want to permanently delete this item? This action cannot be undone."
                    )
                }
                confirmLabel="Delete Forever"
                cancelLabel="Cancel"
                isPending={permanentDeleteState.isLoading}
                onConfirm={handleConfirmPermanentDelete}
            />
        </div>
    );
}
