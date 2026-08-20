"use client";

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
    PackagePlus,
    ScanBarcode,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";

import { BarcodeScannerOverlay } from "@/components/inventory/BarcodeScannerOverlay";
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

/**
 * A heading over one branch of the tree, in the same shape Stock uses.
 */
function TreeHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {children}
        </p>
    );
}

/**
 * The rail every branch of the tree hangs off, with a stub to each row.
 */
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

/**
 * The item's options — the same item in another size or pack.
 *
 * Each is scanned, counted and priced on its own, which is the whole reason it
 * exists as a row rather than a note on the item. Everything here is set where
 * the item is edited or in Sale Management; this is the read of it.
 */
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
                                    {option.sku ||
                                        option.barcode ||
                                        "No SKU or barcode"}
                                </p>
                            </div>

                            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
                                {/* Priced per sales channel in Sale Management,
                                    so an option can sit here unpriced. */}
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

/**
 * The add-ons this item offers, grouped by the sets they belong to.
 *
 * Everything here is the item's own: the add-ons attached to it, what each one
 * costs, and how much of it one order uses. The sets are the shop's own
 * groupings — an add-on in none of them is still offered, so it is listed
 * rather than hidden.
 *
 * Only what this item offers is listed. An add-on belongs to the items that
 * carry it, so a drink's row has no business showing toppings that belong to
 * something else.
 *
 * The switch decides whether the item sells it. Off is not detached — the
 * item still offers it and keeps its setup, it is simply off the menu today,
 * which is what a shop that has run out of pearls actually wants. Attaching
 * and detaching is done where the item is edited.
 */
function ItemAddOnsTreeRow({ item }: { item: InventoryItem }) {
    const setsQuery = useGetAddOnSetsQuery();
    const { format: formatMoney } = useMoney();
    const { toast } = useToast();
    const [setAvailability, saveState] =
        useUpdateItemAddOnAvailabilityMutation();
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
        return (
            <p className="py-1 text-xs text-muted-foreground">
                No add-ons on this item. Attach them from the item&apos;s
                Add-ons section when you edit it.
            </p>
        );
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

    // An add-on in no set can still be offered, and still has to be seen.
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
                        {/* The shop's own grouping of its add-ons. Collapsible,
                            because a long menu is mostly things you are not
                            looking at. */}
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
                                {onSaleCount} of {category.addOns.length} on
                                sale
                            </span>
                        </button>

                        {!isCollapsed ? (
                            <TreeBranch>
                                {category.addOns.map((addOn) => {
                                    const unitLabel =
                                        addOn.baseUnit?.symbol ||
                                        addOn.baseUnit?.name ||
                                        "";

                                    const onSale = addOn.available !== false;

                                    return (
                                        <TreeLeaf
                                            key={addOn.id}
                                            className={
                                                onSale
                                                    ? undefined
                                                    : "bg-muted/30 opacity-60"
                                            }
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {addOn.name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {/* Priced once for the whole
                                                        business, in Sale Management. */}
                                                    {addOn.price == null
                                                        ? "Not priced"
                                                        : `+${formatMoney(addOn.price)}`}
                                                    {" · "}
                                                    {formatAmount(
                                                        addOn.usePerOrder ?? 1,
                                                    )}{" "}
                                                    {unitLabel} per order
                                                </p>
                                            </div>

                                            <div className="ml-auto shrink-0 sm:ml-0">
                                                <Switch
                                                    id={`switch-${item.id}-${addOn.id}`}
                                                    checked={onSale}
                                                    disabled={
                                                        saveState.isLoading
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setOnSale(
                                                            addOn,
                                                            checked,
                                                        )
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
    const [filterErrors, setFilterErrors] = useState<
        Record<string, string>
    >({});
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [expandedAddOnItemIds, setExpandedAddOnItemIds] = useState<Set<string>>(
        new Set(),
    );

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
                  itemType: productFilters.itemType as StoredItemType,
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
    const [triggerGetItems, { isFetching: isExporting }] =
        useLazyGetInventoryItemsQuery();
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
    const itemOptionsQuery = useGetInventoryItemOptionsQuery();

    const dynamicPriceRanges = useMemo(() => {
        const storeItems = itemOptionsQuery.data ?? [];
        const prices: number[] = [];

        for (const item of storeItems) {
            if (typeof item.price === "number" && !isNaN(item.price) && item.price >= 0) {
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
            1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 5000, 10000,
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

            if (selectedSteps.length === 1 && startIndex + 1 < candidateSteps.length) {
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
    }, [productDraftFilters.minPrice, productDraftFilters.maxPrice, dynamicPriceRanges]);

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
            toast({
                tone: "success",
                title: "Item deleted",
                description: deleteTarget.name
                    ? `${deleteTarget.name} is no longer in your inventory.`
                    : undefined,
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Delete failed",
                description: getApiErrorMessage(
                    cause,
                    "Unable to delete the item.",
                ),
            });
        } finally {
            // The outcome is a toast either way, so the dialog has nothing
            // left to say once the request settles.
            setDeleteTarget(null);
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
                fullData?.content && fullData.content.length
                    ? fullData.content
                    : items;
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
            <InventoryPageHeader
                title="Items"
                description="Manage the items and services available to your business."
                action={
                    <div className="flex items-center gap-2">
                        <div data-tour="export-header-excel" className="inline-flex">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleExportExcel}
                                disabled={!items.length || isExporting}
                                className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 rounded-xl shrink-0"
                            >
                                {isExporting ? (
                                    <LoaderCircle className="size-4 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <Download className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
                            </Button>
                        </div>
                        <div data-tour="add-item" className="inline-flex">
                            <Button
                                render={<Link href="/inventory/new" />}
                                nativeButton={false}
                                className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 rounded-xl shrink-0"
                            >
                                <PackagePlus className="size-4 shrink-0" />
                                <span>Create item</span>
                            </Button>
                        </div>
                    </div>
                }
            />

            <section data-tour="item-list" className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 border-b border-border p-4">
                    <div className="flex flex-row items-center gap-2">
                        <div className="relative min-w-0 flex-1" data-tour="item-search">
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
                                    data-tour="status-filter"
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
                                data-tour="advanced-filters"
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
                                data-tour="scan-barcode"
                                aria-label="Scan barcode"
                                onClick={() => setScannerOpen(true)}
                                className="!h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5"
                            >
                                <ScanBarcode className="size-4 shrink-0" />
                                <span className="hidden sm:inline">Scan barcode</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-tour="export-excel"
                                aria-label="Export to Excel"
                                onClick={handleExportExcel}
                                disabled={!items.length || isExporting}
                                className="!h-9 !w-9 sm:!h-10 sm:!w-auto p-0 sm:px-3.5 text-xs sm:text-sm rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 flex items-center justify-center gap-1.5"
                            >
                                {isExporting ? (
                                    <LoaderCircle className="size-4 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <Download className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span className="hidden sm:inline">
                                    {isExporting ? "Exporting..." : "Export Excel"}
                                </span>
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
                                    <Label htmlFor="item-filter-price-range">
                                        Price range
                                    </Label>
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
                                            <SelectItem value="ALL">
                                                All prices
                                            </SelectItem>
                                            {dynamicPriceRanges.map((option) => (
                                                <SelectItem
                                                    key={option.id}
                                                    value={option.id}
                                                >
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
                                {items.flatMap((item) => {
                                    const isExpanded = expandedAddOnItemIds.has(item.id);

                                    const mainRow = (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                "text-foreground hover:bg-muted/50 transition-colors",
                                                isExpanded && "bg-muted/30 font-medium",
                                            )}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-foreground">
                                                            {item.name || "Unnamed"}
                                                        </p>
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
                                                                    isExpanded ? "rotate-180 text-primary" : "rotate-0",
                                                                )}
                                                            />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.sku ||
                                                            item.barcode ||
                                                            "No SKU or barcode"}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {item.itemGroup?.name || "—"}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {item.itemType
                                                    ? titleCase(item.itemType)
                                                    : "—"}
                                            </td>
                                            <td
                                                className={
                                                    item.price === undefined ||
                                                    item.price === null
                                                        ? "px-5 py-4 text-muted-foreground"
                                                        : "px-5 py-4 font-semibold"
                                                }
                                            >
                                                {formatMoney(item.price, undefined, {
                                                    fallback: "Not set",
                                                })}
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
                                                <div data-tour={items.indexOf(item) === 0 ? "item-actions" : undefined} className="flex justify-end gap-2">
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
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="cursor-pointer transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
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
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    if (!isExpanded) return [mainRow];

                                    const treeRow = (
                                        <tr key={`${item.id}-addons-tree`} className="bg-muted/20">
                                            <td colSpan={7} className="border-b border-border px-5 py-4">
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
                )}

                {!error && totalElements ? (
                    <nav
                        aria-label="Item pages"
                        className="flex flex-col gap-3 border-t border-border px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                            <Label
                                htmlFor="item-page-size"
                                className="shrink-0 text-[11px] font-medium text-muted-foreground"
                            >
                                Items per page
                            </Label>
                            <Select
                                value={String(productPageSize)}
                                onValueChange={(value) =>
                                    dispatch(
                                        setProductPageSize(
                                            Number(value),
                                        ),
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="item-page-size"
                                    aria-label="Items per page"
                                    className="!h-7 px-2 text-[11px] font-medium rounded-lg border border-border bg-card text-foreground min-w-[58px] justify-between items-center"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="min-w-[58px] w-[58px] p-1 text-[11px]">
                                    <SelectItem value="10" className="text-[11px] py-1 px-1.5">10</SelectItem>
                                    <SelectItem value="20" className="text-[11px] py-1 px-1.5">20</SelectItem>
                                    <SelectItem value="50" className="text-[11px] py-1 px-1.5">50</SelectItem>
                                    <SelectItem value="100" className="text-[11px] py-1 px-1.5">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Showing {firstResult}–{lastResult} of {totalElements}
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
            <BarcodeScannerOverlay
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
