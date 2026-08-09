"use client";

import { useState } from "react";
import { Zap, RotateCcw, Plus, Check, Save, Store, Globe, Send, MessageSquare, ShoppingBag, Search, X, Filter, Layers } from "lucide-react";

import { useMoney } from "@/hooks/useMoney";
import { useToast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
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

/**
 * Enhanced Selling Products Tab:
 * - Global Channel Rule (e.g. +10% across entire channel)
 * - Clean Inline Overrides (clutter-free by default, expand on edit)
 * - Sticky Save Action Bar for dirty state feedback
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

    // Large Catalogue UX state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState("ALL");
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

    // Filter items based on search query, category, and override status
    const filteredItems = samplePricedItems.filter((item) => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchesName = item.name.toLowerCase().includes(query);
            const matchesSku = item.sku.toLowerCase().includes(query);
            if (!matchesName && !matchesSku) return false;
        }

        if (selectedGroupId !== "ALL" && item.groupId !== selectedGroupId) {
            return false;
        }

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

    return (
        <div className="flex flex-col gap-4 relative pb-16">
            {/* Channel Tabs with Matching Icons */}
            <div className="flex flex-wrap gap-2">
                {sampleChannels.map((entry) => {
                    const active = entry.id === channelId;
                    const Icon = channelIcons[entry.code.toUpperCase()] ?? ShoppingBag;
                    const count =
                        listings.find((row) => row.channelId === entry.id)
                            ?.itemIds.length ?? 0;
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

            {/* Global Channel Markup Rule Card (Matching Schedule Card style) */}
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
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
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
                    <div className="flex items-center gap-2 shrink-0">
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
                                aria-label="Global channel rule"
                                className={`${controlClassName} h-9.5 w-44 bg-card px-3.5 text-xs font-semibold border-border shadow-2xs hover:border-primary/40`}
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
                                    className={`${controlClassName} h-9.5 w-28 bg-card pl-3 pr-7 text-xs font-semibold shadow-2xs`}
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
                    <div className="mt-3 flex items-center justify-end gap-2.5 animate-in fade-in duration-200">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleResetChanges}
                            className="h-9 px-4 text-xs font-semibold bg-[#D14341] text-white hover:bg-[#D14341]/90 rounded-xl shadow-xs transition-colors"
                        >
                            Reset
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveChanges}
                            className="h-9 px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
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

                {/* Search & Category Filter Toolbar for Large Catalogues */}
                <div className="border-b border-border bg-muted/20 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Live Search Input */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search item name or SKU..."
                            className={`${controlClassName} h-9 pl-9 pr-8 text-xs bg-card`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category & Status Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Category Filter */}
                        <div className="flex items-center gap-1 bg-card rounded-xl border border-border p-1 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setSelectedGroupId("ALL")}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                    selectedGroupId === "ALL"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                All Categories
                            </button>
                            {sampleGroups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => setSelectedGroupId(group.id)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                        selectedGroupId === group.id
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {group.name}
                                </button>
                            ))}
                        </div>

                        {/* Status Filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={(val) =>
                                setStatusFilter((val || "ALL") as any)
                            }
                        >
                            <SelectTrigger aria-label="Rule Status Filter" className={`${controlClassName} h-9 w-36 text-xs bg-card font-semibold`}>
                                <SelectValue placeholder="All States" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Rule States</SelectItem>
                                <SelectItem value="OVERRIDDEN">With Overrides</SelectItem>
                                <SelectItem value="DEFAULT">Channel Default</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedGroupId("ALL");
                                    setStatusFilter("ALL");
                                }}
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
                                                        Base Price
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
                                                                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                                                            Item override ({describeOverride(override)})
                                                                        </span>
                                                                    ) : globalRule &&
                                                                      globalRule.kind !==
                                                                          "INHERIT" ? (
                                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                                                            Global ({describeOverride(globalRule)})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                                                            Same as base
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 text-right">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-end gap-2">
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
                                                                                aria-label={`${unit.label} price rule`}
                                                                                className={`${controlClassName} h-8 w-36 px-2.5 text-xs`}
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
                                                                                    className={`${controlClassName} h-8 w-24 bg-card pl-2.5 pr-6 text-xs font-semibold shadow-2xs`}
                                                                                />
                                                                                <span className="absolute right-2 text-xs font-bold text-muted-foreground pointer-events-none">
                                                                                    {kind === "MARKUP_PERCENT" ? "%" : "$"}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon-xs"
                                                                            title="Reset to channel default"
                                                                            onClick={() =>
                                                                                setOverride(
                                                                                    item.id,
                                                                                    unit.id,
                                                                                    "INHERIT",
                                                                                    "",
                                                                                )
                                                                            }
                                                                        >
                                                                            <RotateCcw className="size-3.5 text-muted-foreground hover:text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="xs"
                                                                        onClick={() =>
                                                                            toggleEditingOverride(
                                                                                key,
                                                                            )
                                                                        }
                                                                        className="h-8 gap-1 rounded-lg text-xs font-semibold"
                                                                    >
                                                                        <Plus className="size-3" />
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

        </div>
    );
}
