"use client";

import { useMemo, useState } from "react";
import { Zap, RotateCcw, Plus, Check, Save, Store, Globe, Send, MessageSquare, ShoppingBag, Search, X, Filter, Layers, SlidersHorizontal, ScanBarcode } from "lucide-react";

import { useMoney } from "@/hooks/useMoney";
import { useToast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeScannerDialog } from "@/components/inventory/BarcodeScannerDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    buildOverride,
    describeOverride,
    effectivePrice,
    isOverridden,
    listingKey,
    overrideKindLabels,
    overrideKinds,
    overrideValue,
    type ChannelListing,
    type OverrideKind,
    type PriceOverride,
} from "@/lib/sale-pricing/pricing";
import {
    sampleChannels,
    sampleGroups,
    sampleListings,
    samplePricedItems,
    sampleSchedules,
} from "@/lib/sale-pricing/sample-data";
import { ChannelScheduleCard } from "@/components/sales/pricing/ChannelScheduleCard";
import {
    emptySchedule,
    isOpenAt,
    type ChannelSchedule,
} from "@/lib/sale-pricing/schedule";

const channelIcons: Record<string, React.ElementType> = {
    POS: Store,
    WEB: Globe,
    ONLINE: Globe,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
};

export interface AdvancedFilterState {
    category: string;
    unit: string;
    itemType: string;
    sortBy: string;
    minPrice: string;
    maxPrice: string;
    sku: string;
    barcode: string;
}

const initialFilters: AdvancedFilterState = {
    category: "ALL",
    unit: "ALL",
    itemType: "ALL",
    sortBy: "name,asc",
    minPrice: "",
    maxPrice: "",
    sku: "",
    barcode: "",
};

/**
 * Enhanced Selling Products Tab:
 * - Global Channel Rule (e.g. +10% across entire channel)
 * - Clean Inline Overrides (clutter-free by default, expand on edit)
 * - Sticky Save Action Bar for dirty state feedback
 * - Advanced Filters panel matching standard catalogue design
 */
export function SellingProductsTab() {
    const { format } = useMoney();
    const { toast } = useToast();

    const [listings, setListings] =
        useState<ChannelListing[]>(sampleListings);
    const [schedules, setSchedules] =
        useState<Record<string, ChannelSchedule>>(sampleSchedules);
    const [channelId, setChannelId] = useState(sampleChannels[0]?.id ?? "");
    const [editingOverrideKeys, setEditingOverrideKeys] = useState<Set<string>>(
        new Set(),
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Filter & UI states
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const [draftFilters, setDraftFilters] = useState<AdvancedFilterState>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<AdvancedFilterState>(initialFilters);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERRIDDEN" | "DEFAULT">("ALL");

    const channel = sampleChannels.find((entry) => entry.id === channelId);
    const listing = listings.find((entry) => entry.channelId === channelId);

    function updateListing(next: Partial<ChannelListing>) {
        setListings((current) =>
            current.map((entry) =>
                entry.channelId === channelId ? { ...entry, ...next } : entry,
            ),
        );
        setHasUnsavedChanges(true);
    }

    function toggleItem(itemId: string, on: boolean) {
        if (!listing) return;

        updateListing({
            itemIds: on
                ? [...listing.itemIds, itemId]
                : listing.itemIds.filter((id) => id !== itemId),
        });
    }

    function setGlobalRule(kind: OverrideKind, raw: string) {
        if (!listing) return;

        const globalRule =
            kind === "INHERIT" ? undefined : buildOverride(kind, raw);
        updateListing({ globalRule });
    }

    function setOverride(
        itemId: string,
        unitId: string,
        kind: OverrideKind,
        raw: string,
    ) {
        if (!listing) return;

        const key = listingKey(itemId, unitId);
        const next = { ...listing.overrides };

        if (kind === "INHERIT") {
            delete next[key];
            setEditingOverrideKeys((current) => {
                const copy = new Set(current);
                copy.delete(key);
                return copy;
            });
        } else {
            next[key] = buildOverride(kind, raw);
        }

        updateListing({ overrides: next });
    }

    function toggleEditingOverride(key: string) {
        setEditingOverrideKeys((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function handleSaveChanges() {
        setHasUnsavedChanges(false);
        toast({
            tone: "success",
            title: "Pricing rules saved",
            description: `Updated pricing for ${channel?.name ?? "channel"}.`,
        });
    }

    function handleResetChanges() {
        setListings(sampleListings);
        setEditingOverrideKeys(new Set());
        setHasUnsavedChanges(false);
        toast({
            tone: "info",
            title: "Changes reset to original state",
        });
    }

    const listedCount = listing?.itemIds.length ?? 0;
    const overrideCount = Object.keys(listing?.overrides ?? {}).length;
    const globalRule = listing?.globalRule;
    const globalKind = globalRule?.kind ?? "INHERIT";

    const categoryOptionsMap = useMemo(() => {
        return {
            ALL: "All categories",
            ...Object.fromEntries(sampleGroups.map((g) => [g.id, g.name])),
        };
    }, []);

    const statusDisplayMap = useMemo(() => {
        return {
            ALL: "ALL",
            OVERRIDDEN: "With Overrides",
            DEFAULT: "Channel Default",
        };
    }, []);

    const unitOptions = useMemo(() => {
        const set = new Set<string>();
        samplePricedItems.forEach((item) => {
            item.units.forEach((u) => set.add(u.label));
        });
        return Array.from(set).map((label) => ({ id: label, label }));
    }, []);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (appliedFilters.category !== "ALL") count++;
        if (appliedFilters.unit !== "ALL") count++;
        if (appliedFilters.itemType !== "ALL") count++;
        if (appliedFilters.minPrice !== "") count++;
        if (appliedFilters.maxPrice !== "") count++;
        if (appliedFilters.sku !== "") count++;
        if (appliedFilters.barcode !== "") count++;
        if (appliedFilters.sortBy !== "name,asc") count++;
        return count;
    }, [appliedFilters]);

    function handleApplyFilters() {
        setAppliedFilters({ ...draftFilters });
    }

    function handleResetFilters() {
        setDraftFilters(initialFilters);
        setAppliedFilters(initialFilters);
        setSearchQuery("");
        setStatusFilter("ALL");
    }

    function updateDraftFilter<K extends keyof AdvancedFilterState>(
        field: K,
        value: AdvancedFilterState[K],
    ) {
        setDraftFilters((current) => ({
            ...current,
            [field]: value,
        }));
    }

    // Filter and sort items based on search query, advanced filters, and rule status
    const filteredItems = useMemo(() => {
        let result = samplePricedItems.filter((item) => {
            // Live Search Query (Name, SKU, Barcode)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesName = item.name.toLowerCase().includes(query);
                const matchesSku = item.sku.toLowerCase().includes(query);
                const matchesBarcode = item.barcode?.toLowerCase().includes(query) ?? false;
                if (!matchesName && !matchesSku && !matchesBarcode) return false;
            }

            // Category Filter
            if (appliedFilters.category !== "ALL" && item.groupId !== appliedFilters.category) {
                return false;
            }

            // Unit Filter
            if (appliedFilters.unit !== "ALL") {
                const hasUnit = item.units.some(
                    (u) => u.id === appliedFilters.unit || u.label === appliedFilters.unit,
                );
                if (!hasUnit) return false;
            }

            // Item Type Filter
            if (appliedFilters.itemType !== "ALL" && (item.itemType ?? "Standard") !== appliedFilters.itemType) {
                return false;
            }

            // SKU Filter
            if (appliedFilters.sku.trim()) {
                const targetSku = appliedFilters.sku.toLowerCase().trim();
                if (!item.sku.toLowerCase().includes(targetSku)) return false;
            }

            // Barcode Filter
            if (appliedFilters.barcode.trim()) {
                const targetBc = appliedFilters.barcode.toLowerCase().trim();
                if (!item.barcode || !item.barcode.toLowerCase().includes(targetBc)) return false;
            }

            // Price Range Filter
            const prices = Object.values(item.basePrices).filter((p): p is number => p !== undefined);
            const minItemPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxItemPrice = prices.length > 0 ? Math.max(...prices) : 0;

            if (appliedFilters.minPrice !== "") {
                const minVal = Number(appliedFilters.minPrice);
                if (Number.isFinite(minVal) && maxItemPrice < minVal) return false;
            }

            if (appliedFilters.maxPrice !== "") {
                const maxVal = Number(appliedFilters.maxPrice);
                if (Number.isFinite(maxVal) && minItemPrice > maxVal) return false;
            }

            // Status Filter (ALL, OVERRIDDEN, DEFAULT)
            if (statusFilter !== "ALL") {
                const hasAnyOverride = item.units.some((unit) => {
                    const key = listingKey(item.id, unit.id);
                    return listing?.overrides[key] !== undefined;
                });
                if (statusFilter === "OVERRIDDEN" && !hasAnyOverride) return false;
                if (statusFilter === "DEFAULT" && hasAnyOverride) return false;
            }

            return true;
        });

        // Sorting
        return [...result].sort((a, b) => {
            switch (appliedFilters.sortBy) {
                case "name,desc":
                    return b.name.localeCompare(a.name);
                case "sku,asc":
                    return a.sku.localeCompare(b.sku);
                case "price,asc": {
                    const aPrices = Object.values(a.basePrices).filter((p): p is number => p !== undefined);
                    const bPrices = Object.values(b.basePrices).filter((p): p is number => p !== undefined);
                    const aMin = aPrices.length ? Math.min(...aPrices) : 0;
                    const bMin = bPrices.length ? Math.min(...bPrices) : 0;
                    return aMin - bMin;
                }
                case "price,desc": {
                    const aPrices = Object.values(a.basePrices).filter((p): p is number => p !== undefined);
                    const bPrices = Object.values(b.basePrices).filter((p): p is number => p !== undefined);
                    const aMax = aPrices.length ? Math.max(...aPrices) : 0;
                    const bMax = bPrices.length ? Math.max(...bPrices) : 0;
                    return bMax - aMax;
                }
                case "name,asc":
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }, [appliedFilters, searchQuery, statusFilter, listing]);

    return (
        <div className="flex flex-col gap-4 relative pb-16">
            {/* Channel Tabs with Matching Icons */}
            <div className="flex flex-wrap gap-2">
                {sampleChannels.map((entry) => {
                    const active = entry.id === channelId;
                    const Icon = channelIcons[entry.code.toUpperCase()] ?? ShoppingBag;
                    const open = isOpenAt(
                        schedules[entry.id] ?? emptySchedule(),
                        new Date(),
                    );

                    return (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => setChannelId(entry.id)}
                            aria-pressed={active}
                            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                active
                                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <span
                                className={`grid size-7 place-items-center rounded-lg ${
                                    active
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                <Icon className="size-4 shrink-0" />
                            </span>
                            {entry.name}
                            <span
                                className={`size-2 shrink-0 rounded-full ${
                                    open ? "bg-success" : "bg-muted-foreground/40"
                                }`}
                                title={open ? "Open now" : "Closed now"}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Operating Hours Card */}
            <ChannelScheduleCard
                channelName={channel?.name ?? "This channel"}
                schedule={schedules[channelId] ?? emptySchedule()}
                onChange={(next) => {
                    setSchedules((current) => ({
                        ...current,
                        [channelId]: next,
                    }));
                    setHasUnsavedChanges(true);
                }}
            />

            {/* Global Channel Markup Rule Card */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Zap className="size-5" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                                    Global Channel Markup Rule
                                </h3>
                                {globalKind !== "INHERIT" && (
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                                        Active: {describeOverride(globalRule)}
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                                Default pricing rule for all items on{" "}
                                <strong className="font-medium text-foreground">
                                    {channel?.name}
                                </strong>
                                . Individual item overrides take precedence.
                            </p>
                        </div>
                    </div>

                    {/* Clean Rule Select Controls */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <Select
                            value={globalKind}
                            onValueChange={(val) =>
                                setGlobalRule(
                                    (val || "INHERIT") as OverrideKind,
                                    overrideValue(globalRule),
                                )
                            }
                            items={overrideKindLabels}
                        >
                            <SelectTrigger
                                size="sm"
                                aria-label="Global channel rule"
                                className={`${controlClassName} !h-10 w-48 bg-card px-3.5 text-sm font-semibold rounded-xl border border-border shadow-2xs hover:border-primary/40`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {overrideKinds.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {overrideKindLabels[option]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {globalKind !== "INHERIT" && (
                            <div className="relative flex items-center">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={overrideValue(globalRule)}
                                    placeholder="0"
                                    onChange={(e) =>
                                        setGlobalRule(globalKind, e.target.value)
                                    }
                                    className={`${controlClassName} !h-10 w-28 bg-card pl-3.5 pr-7 text-sm font-semibold rounded-xl`}
                                />
                                <span className="absolute right-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
                                    {globalKind === "MARKUP_PERCENT" ? "%" : "$"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Action Buttons Inside Global Rule Card */}
                {hasUnsavedChanges && (
                    <div className="mt-3.5 flex items-center justify-end gap-2.5 animate-in fade-in duration-200">
                        <Button
                            type="button"
                            onClick={handleResetChanges}
                            className="!h-10 px-4 text-sm font-semibold bg-[#D14341] text-white hover:bg-[#D14341]/90 rounded-xl shadow-xs transition-colors"
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveChanges}
                            className="!h-10 px-5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
                        >
                            Save Changes
                        </Button>
                    </div>
                )}
            </section>

            {/* Product Pricing Section Header */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                {/* Header Title & Counter */}
                <div className="border-b border-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-semibold text-foreground text-base">
                            {channel?.name} Catalogue
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {channel?.description} · {listedCount} item
                            {listedCount === 1 ? "" : "s"} listed ·{" "}
                            {overrideCount} item override
                            {overrideCount === 1 ? "" : "s"}
                        </p>
                    </div>

                    <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                        Showing {filteredItems.length} of {samplePricedItems.length} items
                    </span>
                </div>

                    {/* Advanced Filter Toolbar matching provided UI designs */}
                <div className="p-3 sm:p-4 border-b border-border bg-muted/15 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Live Search Input */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search items..."
                                className={`${controlClassName} !h-10 pl-10 pr-9 text-sm font-medium bg-card rounded-xl border-border`}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>

                        {/* Advanced Filters Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFilterPanelOpen((prev) => !prev)}
                            className="!h-10 px-3.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-all shrink-0 gap-2"
                        >
                            <SlidersHorizontal className="size-4 shrink-0" />
                            <span>Advanced filters</span>
                            {activeFilterCount > 0 && (
                                <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        {/* Scan Barcode Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setScannerOpen(true)}
                            className="!h-10 px-3.5 text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground shrink-0 gap-2"
                        >
                            <ScanBarcode className="size-4 shrink-0" />
                            <span>Scan barcode</span>
                        </Button>

                        {/* Status Filter */}
                        <div className="w-32 sm:w-36 shrink-0">
                            <Select
                                value={statusFilter}
                                items={statusDisplayMap}
                                onValueChange={(val) =>
                                    setStatusFilter((val || "ALL") as any)
                                }
                            >
                                <SelectTrigger size="sm" aria-label="Rule Status Filter" className={`${controlClassName} !h-10 px-3.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-all shrink-0`}>
                                    <SelectValue placeholder="ALL" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ALL</SelectItem>
                                    <SelectItem value="OVERRIDDEN">With Overrides</SelectItem>
                                    <SelectItem value="DEFAULT">Channel Default</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Expandable Advanced Filters Box */}
                    {filterPanelOpen && (
                        <div className="mt-2.5 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-foreground text-base sm:text-lg">
                                    Advanced filters
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Narrow the catalogue, then apply all fields together.
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Row 1: Category */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Category
                                    </Label>
                                    <Select
                                        value={draftFilters.category}
                                        items={categoryOptionsMap}
                                        onValueChange={(val) => updateDraftFilter("category", val || "ALL")}
                                    >
                                        <SelectTrigger className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium border-border px-3.5`}>
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All categories</SelectItem>
                                            {sampleGroups.map((g) => (
                                                <SelectItem key={g.id} value={g.id}>
                                                    {g.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Unit */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Unit
                                    </Label>
                                    <Select
                                        value={draftFilters.unit}
                                        onValueChange={(val) => updateDraftFilter("unit", val || "ALL")}
                                    >
                                        <SelectTrigger className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium border-border px-3.5`}>
                                            <SelectValue placeholder="ALL" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">ALL</SelectItem>
                                            {unitOptions.map((unit) => (
                                                <SelectItem key={unit.id} value={unit.id}>
                                                    {unit.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Item type */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Item type
                                    </Label>
                                    <Select
                                        value={draftFilters.itemType}
                                        onValueChange={(val) => updateDraftFilter("itemType", val || "ALL")}
                                    >
                                        <SelectTrigger className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium border-border px-3.5`}>
                                            <SelectValue placeholder="ALL" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">ALL</SelectItem>
                                            <SelectItem value="Standard">Standard</SelectItem>
                                            <SelectItem value="Combo">Combo</SelectItem>
                                            <SelectItem value="Service">Service</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sort by */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Sort by
                                    </Label>
                                    <Select
                                        value={draftFilters.sortBy}
                                        onValueChange={(val) => updateDraftFilter("sortBy", val || "name,asc")}
                                    >
                                        <SelectTrigger className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium border-border px-3.5`}>
                                            <SelectValue placeholder="name,asc" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="name,asc">name,asc</SelectItem>
                                            <SelectItem value="name,desc">name,desc</SelectItem>
                                            <SelectItem value="price,asc">price,asc</SelectItem>
                                            <SelectItem value="price,desc">price,desc</SelectItem>
                                            <SelectItem value="sku,asc">sku,asc</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Row 2: Minimum price */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Minimum price
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={draftFilters.minPrice}
                                        onChange={(e) => updateDraftFilter("minPrice", e.target.value)}
                                        className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium px-3.5`}
                                    />
                                </div>

                                {/* Maximum price */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Maximum price
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="No maximum"
                                        value={draftFilters.maxPrice}
                                        onChange={(e) => updateDraftFilter("maxPrice", e.target.value)}
                                        className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium px-3.5`}
                                    />
                                </div>

                                {/* SKU */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        SKU
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Exact SKU"
                                        value={draftFilters.sku}
                                        onChange={(e) => updateDraftFilter("sku", e.target.value)}
                                        className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium px-3.5`}
                                    />
                                </div>

                                {/* Barcode */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Barcode
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Exact barcode"
                                        value={draftFilters.barcode}
                                        onChange={(e) => updateDraftFilter("barcode", e.target.value)}
                                        className={`${controlClassName} h-10 bg-card rounded-xl text-sm font-medium px-3.5`}
                                    />
                                </div>
                            </div>

                            {/* Bottom Action Buttons */}
                            <div className="mt-6 flex items-center justify-end gap-3">
                                <Button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="h-10 px-6 text-sm font-semibold bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl shadow-xs transition-colors"
                                >
                                    Apply filters
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResetFilters}
                                    className="h-10 px-5 text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors"
                                >
                                    Reset fields
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-border">
                    {filteredItems.length === 0 ? (
                        <div className="p-12 text-center">
                            <Search className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                            <p className="text-sm font-semibold text-foreground">No matching items found</p>
                            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or filters.</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                className="mt-4 text-xs font-semibold rounded-xl"
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                        const listed = listing?.itemIds.includes(item.id);
                        const sellable = item.available;

                        return (
                            <div key={item.id} className="p-4 sm:p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-foreground">
                                                {item.name}
                                            </p>
                                            {sellable ? null : (
                                                <span
                                                    className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                                                    title="Unavailable in Inventory"
                                                >
                                                    Unavailable in Inventory
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {item.sku}
                                        </p>
                                    </div>

                                    <label className="flex shrink-0 items-center gap-2.5 text-sm">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {listed ? "Selling" : "Not selling"}
                                        </span>
                                        <Switch
                                            checked={Boolean(listed)}
                                            disabled={!sellable}
                                            onCheckedChange={(checked) =>
                                                toggleItem(
                                                    item.id,
                                                    Boolean(checked),
                                                )
                                            }
                                            aria-label={`Sell ${item.name} on ${channel?.name}`}
                                        />
                                    </label>
                                </div>

                                {listed ? (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full min-w-[620px] text-left text-sm">
                                            <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                <tr>
                                                    <th className="pb-2 pr-4">
                                                        Sold as
                                                    </th>
                                                    <th className="pb-2 pr-4">
                                                        Base Sell Price
                                                    </th>
                                                    <th className="pb-2 pr-4">
                                                        Sells for
                                                    </th>
                                                    <th className="pb-2 text-right">
                                                        Pricing Rule &amp; Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {item.units.map((unit) => {
                                                    const base =
                                                        item.basePrices[unit.id];
                                                    const key = listingKey(
                                                        item.id,
                                                        unit.id,
                                                    );
                                                    const override =
                                                        listing?.overrides[key];
                                                    const itemHasOverride =
                                                        isOverridden(override);
                                                    const isEditing =
                                                        editingOverrideKeys.has(
                                                            key,
                                                        ) || itemHasOverride;

                                                    const effective =
                                                        effectivePrice(
                                                            base,
                                                            override,
                                                            globalRule,
                                                        );

                                                    if (
                                                        base === undefined &&
                                                        !itemHasOverride
                                                    ) {
                                                        return (
                                                            <tr key={unit.id}>
                                                                <td className="py-2.5 pr-4 font-medium text-muted-foreground">
                                                                    {unit.label}
                                                                </td>
                                                                <td
                                                                    colSpan={3}
                                                                    className="py-2.5 text-xs text-muted-foreground"
                                                                >
                                                                    No base price
                                                                    — not sold
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    const kind =
                                                        override?.kind ??
                                                        "INHERIT";

                                                    return (
                                                        <tr key={unit.id}>
                                                            <td className="py-2.5 pr-4 font-medium text-foreground">
                                                                {unit.label}
                                                            </td>
                                                            <td className="py-2.5 pr-4 text-muted-foreground">
                                                                {base ===
                                                                undefined
                                                                    ? "—"
                                                                    : format(
                                                                          base,
                                                                      )}
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-foreground text-sm">
                                                                        {effective ===
                                                                        undefined
                                                                            ? "—"
                                                                            : format(
                                                                                  effective,
                                                                              )}
                                                                    </span>
                                                                    {itemHasOverride ? (
                                                                        <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                                                                            Item override ({describeOverride(override)})
                                                                        </span>
                                                                    ) : globalRule &&
                                                                      globalRule.kind !==
                                                                          "INHERIT" ? (
                                                                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                                            Global ({describeOverride(globalRule)})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                                                            Same as base
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 text-right">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-end gap-2.5">
                                                                        <Select
                                                                            value={
                                                                                kind
                                                                            }
                                                                            onValueChange={(
                                                                                val,
                                                                            ) =>
                                                                                setOverride(
                                                                                    item.id,
                                                                                    unit.id,
                                                                                    (val ||
                                                                                        "INHERIT") as OverrideKind,
                                                                                    overrideValue(
                                                                                        override,
                                                                                    ),
                                                                                )
                                                                            }
                                                                            items={
                                                                                overrideKindLabels
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                size="sm"
                                                                                aria-label={`${unit.label} price rule`}
                                                                                className={`${controlClassName} !h-10 w-44 bg-card px-3.5 text-sm font-semibold rounded-xl border border-border shadow-2xs hover:border-primary/40`}
                                                                            >
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {overrideKinds.map(
                                                                                    (
                                                                                        opt,
                                                                                    ) => (
                                                                                        <SelectItem
                                                                                            key={
                                                                                                opt
                                                                                            }
                                                                                            value={
                                                                                                opt
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                overrideKindLabels[
                                                                                                    opt
                                                                                                ]
                                                                                            }
                                                                                        </SelectItem>
                                                                                    ),
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {kind !==
                                                                            "INHERIT" && (
                                                                            <div className="relative flex items-center">
                                                                                <Input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={overrideValue(
                                                                                        override,
                                                                                    )}
                                                                                    placeholder="0"
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        setOverride(
                                                                                            item.id,
                                                                                            unit.id,
                                                                                            kind,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    className={`${controlClassName} !h-10 w-28 bg-card pl-3.5 pr-7 text-sm font-semibold rounded-xl shadow-2xs`}
                                                                                />
                                                                                <span className="absolute right-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
                                                                                    {kind === "MARKUP_PERCENT" ? "%" : "$"}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            title="Reset to channel default"
                                                                            onClick={() =>
                                                                                setOverride(
                                                                                    item.id,
                                                                                    unit.id,
                                                                                    "INHERIT",
                                                                                    "",
                                                                                )
                                                                            }
                                                                            className="!size-10 rounded-xl p-0"
                                                                        >
                                                                            <RotateCcw className="size-4 text-muted-foreground hover:text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            toggleEditingOverride(
                                                                                key,
                                                                            )
                                                                        }
                                                                        className="!h-10 px-3.5 text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all gap-1.5"
                                                                    >
                                                                        <Plus className="size-4" />
                                                                        Add Override
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </div>
                        );
                    }))}
                </div>
            </section>

            <BarcodeScannerDialog
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={(item) => {
                    if (item.barcode) {
                        updateDraftFilter("barcode", item.barcode);
                        setAppliedFilters((curr) => ({ ...curr, barcode: item.barcode ?? "" }));
                    } else if (item.sku) {
                        updateDraftFilter("sku", item.sku);
                        setAppliedFilters((curr) => ({ ...curr, sku: item.sku ?? "" }));
                    }
                }}
            />
        </div>
    );
}
