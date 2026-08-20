"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Globe,
    LoaderCircle,
    MessageSquare,
    Scale,
    Search,
    Send,
    ShoppingBag,
    Store,
    Tag,
} from "lucide-react";

import { stockTargetKey } from "@/components/inventory/stock/useStockLevels";
import { BarcodeScannerOverlay } from "@/components/inventory/BarcodeScannerOverlay";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { MultiChannelPublishDialog } from "@/components/menu/MultiChannelPublishDialog";
import { SplitStockDialog } from "@/components/menu/SplitStockDialog";
import { ChannelPriceDialog } from "@/components/sales/pricing/ChannelPriceDialog";
import {
    linesOf,
    toOverride,
    type SoldLine,
} from "@/components/sales/pricing/channel-lines";
import { ChannelScheduleCard } from "@/components/sales/pricing/ChannelScheduleCard";
import {
    countActiveFilters,
    filterAndSortItems,
    initialFilters,
    ItemPricingFilters,
    type AdvancedFilterState,
} from "@/components/sales/pricing/ItemPricingFilters";
import {
    ItemPricingTable,
    pageSizes,
    TablePagination,
} from "@/components/sales/pricing/ItemPricingTable";
import { SetPriceDialog } from "@/components/sales/pricing/SetPriceDialog";
import {
    soldAsKey,
    type PriceDrafts,
} from "@/components/sales/pricing/sold-as";
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
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    toChannelDraft,
    type ChannelDraft,
} from "@/lib/sale-pricing/channel-draft";
import {
    overrideKindLabels,
    overrideKinds,
    type OverrideKind,
    type PriceOverride,
} from "@/lib/sale-pricing/pricing";
import {
    emptySchedule,
    isOpenAt,
    type ChannelSchedule,
} from "@/lib/sale-pricing/schedule";
import {
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";
import {
    useGetChannelListingQuery,
    useGetSalesChannelsQuery,
    useSaveChannelListingMutation,
} from "@/services/salesChannelApi";

/**
 * Everything a shop does to an item's price, on one screen.
 *
 * Set Price, Channel Pricing and the channel matrix each held a third of the
 * same job and rebuilt the same catalogue to do it — three search bars, two
 * price forms, and two places to say whether an item is sold on a channel. The
 * thing that actually changes between them is only ever the scope: whose price
 * is being set. So the scope becomes a control, and everything else is shared.
 *
 * Base scope sets what the business charges. A channel scope never sets a price
 * from scratch — it says what it sells, what it charges instead, and when it is
 * open, which is why the two are one screen and not one form.
 */

const channelIcons: Record<string, React.ElementType> = {
    POS: Store,
    WEB: Globe,
    ONLINE: Globe,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
};

/** The scope showing what the business charges, before any channel. */
const baseScope = "BASE";

/**
 * One channel to price for, showing whether it is taking orders right now.
 *
 * Each chip reads its own listing rather than only the one being edited: a
 * channel that quietly went dark is the thing the strip exists to show. It
 * hands the item ids back up as well, so the row chips can say where an item
 * sells without a request per item. The reads are cached, so the whole strip
 * costs one request per channel for the session.
 */
function ChannelScopeChip({
    channel,
    active,
    showCode,
    liveSchedule,
    onSelect,
    onListingLoaded,
}: {
    channel: SalesChannel;
    active: boolean;
    /** Set when another channel shares this name and the two must be told apart. */
    showCode: boolean;
    /** The hours being edited, which outrank the saved ones on the open chip. */
    liveSchedule?: ChannelSchedule;
    onSelect: () => void;
    onListingLoaded: (channelId: string, enabledItemIds: string[]) => void;
}) {
    const listingQuery = useGetChannelListingQuery(channel.id);
    const Icon =
        channelIcons[(channel.code || "").toUpperCase()] ?? ShoppingBag;
    const enabledItemIds = listingQuery.data?.enabledItemIds;

    useEffect(() => {
        if (enabledItemIds) onListingLoaded(channel.id, enabledItemIds);
    }, [channel.id, enabledItemIds, onListingLoaded]);

    const schedule =
        liveSchedule ??
        (listingQuery.data?.schedule
            ? (listingQuery.data.schedule as ChannelSchedule)
            : // Nobody has said it closes, which is read as always open.
              { ...emptySchedule(), alwaysOpen: true });
    const open = isOpenAt(schedule, new Date());

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                active
                    ? "border-primary bg-primary/10 font-bold text-primary shadow-xs ring-1 ring-primary/30"
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
            {channel.name}
            {showCode ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                    {channel.code}
                </span>
            ) : null}
            <span
                className={`size-2 shrink-0 rounded-full ${
                    open ? "bg-success" : "bg-muted-foreground/40"
                }`}
                title={open ? "Open now" : "Closed now"}
            />
        </button>
    );
}

/** The markup control, said the same way whichever scope it belongs to. */
function RuleControl({
    kind,
    value,
    label,
    onKindChange,
    onValueChange,
}: {
    kind: OverrideKind;
    value: string;
    label: string;
    onKindChange: (kind: OverrideKind) => void;
    onValueChange: (value: string) => void;
}) {
    return (
        <>
            <div className="w-40 shrink-0 sm:w-44">
                <Select
                    value={kind}
                    items={overrideKindLabels}
                    onValueChange={(next) =>
                        onKindChange((next || "INHERIT") as OverrideKind)
                    }
                >
                    <SelectTrigger
                        size="sm"
                        aria-label={label}
                        className={`${controlClassName} !h-10 shrink-0 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold`}
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
            </div>

            {kind === "INHERIT" ? null : (
                <div className="relative flex items-center">
                    <Input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(event) => onValueChange(event.target.value)}
                        placeholder="0"
                        aria-label={`${label} amount`}
                        className={`${controlClassName} !h-10 w-24 rounded-xl bg-card pr-7 pl-3.5 text-sm font-semibold`}
                    />
                    <span className="pointer-events-none absolute right-2.5 text-xs font-bold text-muted-foreground">
                        {kind === "MARKUP_PERCENT" ? "%" : "$"}
                    </span>
                </div>
            )}
        </>
    );
}

export function ItemPricingTab() {
    const { format } = useMoney();
    const { toast } = useToast();

    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const channelsQuery = useGetSalesChannelsQuery();

    /** Whose price is being set: the business, or one channel. */
    const [scope, setScope] = useState<string>(baseScope);
    const channelId = scope === baseScope ? "" : scope;

    // Shared across both scopes: the same catalogue, asked the same questions.
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [draftFilters, setDraftFilters] =
        useState<AdvancedFilterState>(initialFilters);
    const [appliedFilters, setAppliedFilters] =
        useState<AdvancedFilterState>(initialFilters);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(pageSizes[0]);
    /** The item whose prices are being set, if any. */
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    /** The item whose channels are being chosen, if any. */
    const [publishingItemId, setPublishingItemId] = useState<string | null>(
        null,
    );
    /** Whether the bulk "divide the shelf by a rule" form is open. */
    const [splittingStock, setSplittingStock] = useState(false);

    // Base scope only.
    const [drafts, setDrafts] = useState<PriceDrafts>({});
    const [costRule, setCostRule] = useState<OverrideKind>("INHERIT");
    const [costRuleValue, setCostRuleValue] = useState("0");

    // Channel scope only.
    const [draft, setDraft] = useState<ChannelDraft | null>(null);
    const [seededFor, setSeededFor] = useState<string | null>(null);
    const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
    const [dirty, setDirty] = useState(false);
    const [statusFilter, setStatusFilter] = useState<
        "ALL" | "OVERRIDDEN" | "DEFAULT"
    >("ALL");

    /** Which channels sell each item, gathered from the scope chips. */
    const [liveOn, setLiveOn] = useState<Record<string, string[]>>({});

    const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);
    const channels = useMemo(
        () => channelsQuery.data || [],
        [channelsQuery.data],
    );
    const channel = channels.find((entry) => entry.id === channelId);

    const listingQuery = useGetChannelListingQuery(channelId, {
        skip: !channelId,
    });
    const [saveListing, saveState] = useSaveChannelListingMutation();

    // A channel's saved state seeds the form once. Typing after that is the
    // shop's, and is only thrown away when it asks or when it saves.
    //
    // Keyed on the read having settled, not on it having returned something: a
    // channel nobody has set up yet answers with nothing, and it still has to
    // open on an empty form rather than sit on a spinner forever.
    if (channelId && listingQuery.isSuccess && seededFor !== channelId) {
        setSeededFor(channelId);
        setDraft(toChannelDraft(listingQuery.data));
        setEditingKeys(new Set());
        setDirty(false);
    }

    const collectListing = useCallback(
        (id: string, enabledItemIds: string[]) => {
            setLiveOn((current) => {
                const previous = current[id];

                // Cached reads re-report the same ids on every render pass, and
                // a fresh array each time would never settle.
                if (
                    previous &&
                    previous.length === enabledItemIds.length &&
                    previous.every(
                        (itemId, index) => itemId === enabledItemIds[index],
                    )
                ) {
                    return current;
                }

                return { ...current, [id]: enabledItemIds };
            });
        },
        [],
    );

    /** Item id -> the channels selling it, for the chips on each row. */
    const channelsByItem = useMemo(() => {
        const byItem = new Map<string, Set<string>>();

        for (const [id, itemIds] of Object.entries(liveOn)) {
            for (const itemId of itemIds) {
                const existing = byItem.get(itemId);
                if (existing) existing.add(id);
                else byItem.set(itemId, new Set([id]));
            }
        }

        // The channel being edited answers from the form, not from the last
        // read: an item just switched off should stop claiming it sells there.
        if (channelId && draft) {
            for (const [itemId, ids] of byItem) {
                if (!draft.enabled.has(itemId)) ids.delete(channelId);
            }

            for (const itemId of draft.enabled) {
                const existing = byItem.get(itemId);
                if (existing) existing.add(channelId);
                else byItem.set(itemId, new Set([channelId]));
            }
        }

        return byItem;
    }, [liveOn, channelId, draft]);

    /**
     * What one base unit of each item costs.
     *
     * The API works it out from the batch the next unit will come out of, so
     * it is what the stock actually cost rather than an average.
     *
     * Keyed per option, not per item. Each option is its own shelf and is
     * received on its own: S/Black bought at $2.00 sits beside S/Blue bought
     * at $1.50, and one figure for the whole item quoted the wrong margin on
     * every option but whichever the API happened to list first.
     */
    const unitCosts = useMemo(() => {
        const costs = new Map<string, number>();

        for (const summary of stockQuery.data || []) {
            if (!summary.itemId || summary.unitCost === undefined) continue;

            const key = stockTargetKey(summary.itemId, summary.variantId);
            if (!costs.has(key)) costs.set(key, summary.unitCost);

            // The item's own key answers for a row with no option — and backs
            // up an option received before it was split out.
            if (!costs.has(summary.itemId)) {
                costs.set(summary.itemId, summary.unitCost);
            }
        }

        return costs;
    }, [stockQuery.data]);

    /**
     * What one base unit of a given option cost, falling back to the item.
     *
     * The fallback matters for an option added after stock was already taken
     * in against the item as a whole: it has no shelf of its own yet, and the
     * item's figure is the honest answer until it does.
     */
    const unitCostFor = useCallback(
        (itemId: string) => (variantId?: string) =>
            unitCosts.get(stockTargetKey(itemId, variantId)) ??
            unitCosts.get(itemId),
        [unitCosts],
    );

    /** The same for add-ons, which are stocked and costed in their own right. */
    const addOnCosts = useMemo(() => {
        const costs = new Map<string, number>();

        for (const summary of stockQuery.data || []) {
            if (!summary.addOnId || summary.unitCost === undefined) continue;
            costs.set(summary.addOnId, summary.unitCost);
        }

        return costs;
    }, [stockQuery.data]);

    const filteredItems = useMemo(() => {
        const matched = filterAndSortItems(items, searchQuery, appliedFilters);

        // Only a channel has overrides to filter on.
        if (scope === baseScope || statusFilter === "ALL") return matched;

        const overrides = draft?.overrides || {};

        return matched.filter((item) => {
            const changed = linesOf(item).some((line) => overrides[line.key]);

            return statusFilter === "OVERRIDDEN" ? changed : !changed;
        });
    }, [
        items,
        searchQuery,
        appliedFilters,
        scope,
        statusFilter,
        draft?.overrides,
    ]);

    // Clamped rather than reset in an effect: narrowing the search while on
    // page nine should land on the last page there is, not flash an empty one.
    const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pageItems = filteredItems.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    const activeFilterCount = countActiveFilters(appliedFilters);

    function handleResetFilters() {
        setDraftFilters(initialFilters);
        setAppliedFilters(initialFilters);
        setSearchQuery("");
        setStatusFilter("ALL");
        setPage(1);
    }

    /**
     * Fills every base price from what the stock cost.
     *
     * "Same as base" sells at cost; the other two add a margin on top of it. A
     * pack is worked out from what the whole pack cost, so a case of
     * twenty-four is marked up on twenty-four units rather than on one.
     *
     * Nothing is sent: this fills the boxes, and each item is still saved on
     * its own, so a rule can be looked over before it becomes the price. It
     * runs over everything the filters matched, not only the page on screen.
     */
    function applyCostRule() {
        const amount = Number(costRuleValue) || 0;
        const priced = (cost: number) => {
            if (costRule === "MARKUP_PERCENT") return cost * (1 + amount / 100);
            if (costRule === "MARKUP_AMOUNT") return cost + amount;

            return cost;
        };

        setDrafts((current) => {
            const next = { ...current };

            for (const item of filteredItems) {
                const cost = unitCosts.get(item.id);

                if (cost === undefined) continue;

                // An item sold in options is never sold as itself.
                if (!(item.variants || []).some((option) => option.id)) {
                    next[soldAsKey(item.id, "BASE")] = priced(cost).toFixed(2);
                }

                for (const option of item.variants || []) {
                    if (!option.id) continue;
                    next[soldAsKey(item.id, "OPTION", option.id)] =
                        priced(cost).toFixed(2);
                }

                // A conversion already says which option it is for, so each
                // one is a price of its own.
                for (const conversion of item.uomConversions || []) {
                    if (!conversion.unit?.id) continue;

                    next[
                        soldAsKey(
                            item.id,
                            "PACK",
                            conversion.unit.id,
                            conversion.variantId || undefined,
                        )
                    ] = priced(cost * (conversion.factor ?? 1)).toFixed(2);
                }
            }

            return next;
        });
    }

    function resetCostRule() {
        setCostRule("INHERIT");
        setCostRuleValue("0");
        // Typed prices go too: the boxes go back to what is actually saved.
        setDrafts({});
    }

    function editDraft(patch: (current: ChannelDraft) => ChannelDraft) {
        setDraft((current) => (current ? patch(current) : current));
        setDirty(true);
    }

    function toggleItem(itemId: string, on: boolean) {
        editDraft((current) => {
            const enabled = new Set(current.enabled);
            if (on) enabled.add(itemId);
            else enabled.delete(itemId);
            return { ...current, enabled };
        });
    }

    function setGlobalRule(kind: OverrideKind, raw: string) {
        editDraft((current) => ({
            ...current,
            globalKind: kind,
            globalValue: kind === "INHERIT" ? "" : raw,
        }));
    }

    /**
     * Sets or clears one line's exception.
     *
     * "Same as base" removes the row rather than storing a rule of zero: the
     * two charge the same today and part ways the moment the business price
     * moves, which is the whole reason an exception is a rule and not a number.
     */
    function setOverride(line: SoldLine, kind: OverrideKind, raw: string) {
        editDraft((current) => {
            const overrides = { ...current.overrides };

            if (kind === "INHERIT") {
                delete overrides[line.key];
            } else {
                overrides[line.key] = {
                    itemId: line.key.split(":")[0],
                    ...(line.variantId ? { variantId: line.variantId } : {}),
                    ...(line.unitId ? { unitId: line.unitId } : {}),
                    kind,
                    value: raw,
                };
            }

            return { ...current, overrides };
        });

        if (kind === "INHERIT") {
            setEditingKeys((current) => {
                const next = new Set(current);
                next.delete(line.key);
                return next;
            });
        }
    }

    function toggleEditingOverride(key: string) {
        setEditingKeys((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    async function handleSaveChannel() {
        if (!draft || !channelId) return;

        try {
            const saved = await saveListing({
                channelId,
                body: {
                    globalRule: {
                        kind: draft.globalKind,
                        value:
                            draft.globalKind === "INHERIT"
                                ? 0
                                : Number(draft.globalValue) || 0,
                    },
                    schedule: draft.schedule,
                    enabledItemIds: [...draft.enabled],
                    overrides: Object.values(draft.overrides)
                        .filter((entry) => entry.kind !== "INHERIT")
                        .map((entry) => ({
                            itemId: entry.itemId,
                            variantId: entry.variantId ?? null,
                            unitId: entry.unitId ?? null,
                            kind: entry.kind,
                            value: Number(entry.value) || 0,
                        })),
                },
            }).unwrap();

            setDraft(toChannelDraft(saved));
            setDirty(false);
            toast({
                tone: "success",
                title: "Pricing rules saved",
                description: `Updated pricing for ${channel?.name ?? "channel"}.`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Channel not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save this channel.",
                ),
            });
        }
    }

    function handleResetChannel() {
        setDraft(toChannelDraft(listingQuery.data));
        setEditingKeys(new Set());
        setDirty(false);
        toast({ tone: "info", title: "Changes reset to original state" });
    }

    /**
     * Names more than one channel goes by.
     *
     * Two channels can be set up with the same name — and once they are, the
     * chips are indistinguishable and the shop cannot tell which one it is
     * pricing. Those chips show their code as well.
     */
    const repeatedNames = useMemo(() => {
        const seen = new Set<string>();
        const repeated = new Set<string>();

        for (const entry of channels) {
            const name = (entry.name || "").trim().toLowerCase();
            if (seen.has(name)) repeated.add(name);
            else seen.add(name);
        }

        return repeated;
    }, [channels]);

    if (itemsQuery.isLoading || channelsQuery.isLoading) {
        return <InventoryLoading label="Loading items and pricing" />;
    }

    if (itemsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error,
                    "Unable to load items to price.",
                )}
                retry={itemsQuery.refetch}
            />
        );
    }

    const isBase = scope === baseScope;
    const editingItem = items.find((item) => item.id === editingItemId);
    const globalRule: PriceOverride | undefined = draft
        ? toOverride(draft.globalKind, draft.globalValue)
        : undefined;
    const globalKind = draft?.globalKind ?? "INHERIT";
    const listedCount = draft?.enabled.size ?? 0;
    const overrideCount = Object.keys(draft?.overrides || {}).length;
    const openNow = draft ? isOpenAt(draft.schedule, new Date()) : true;

    return (
        <div className="flex flex-col gap-4">
            {/* Whose price is being set. */}
            <div data-tour="pricing-scope-selector" className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setScope(baseScope)}
                    aria-pressed={isBase}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        isBase
                            ? "border-primary bg-primary/10 font-bold text-primary shadow-xs ring-1 ring-primary/30"
                            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                    <span
                        className={`grid size-7 place-items-center rounded-lg ${
                            isBase
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        }`}
                    >
                        <Tag className="size-4 shrink-0" />
                    </span>
                    Base price
                </button>

                {channels.length ? (
                    <span
                        aria-hidden
                        className="mx-1 h-8 w-px shrink-0 bg-border"
                    />
                ) : null}

                {channels.map((entry) => (
                    <ChannelScopeChip
                        key={entry.id}
                        channel={entry}
                        active={entry.id === scope}
                        showCode={repeatedNames.has(
                            (entry.name || "").trim().toLowerCase(),
                        )}
                        liveSchedule={
                            entry.id === channelId ? draft?.schedule : undefined
                        }
                        onSelect={() => setScope(entry.id)}
                        onListingLoaded={collectListing}
                    />
                ))}
            </div>

            {/* When this channel takes orders, and which others keep the same
                hours. Orders arriving while it is shut are turned away, so this
                is not a note to self. */}
            {isBase ? null : (
                <>
                    {listingQuery.error ? (
                        <InventoryError
                            message={getApiErrorMessage(
                                listingQuery.error,
                                "Unable to load this channel.",
                            )}
                            retry={listingQuery.refetch}
                        />
                    ) : null}

                    <ChannelScheduleCard
                        channelName={channel?.name ?? "This channel"}
                        schedule={draft?.schedule ?? emptySchedule()}
                        onChange={(next) =>
                            editDraft((current) => ({
                                ...current,
                                schedule: next,
                            }))
                        }
                    />
                </>
            )}

            {/* Finding the item and pricing the lot, in one bar. The rule and
                the search belong together: the rule only ever applies to what
                the search left showing. */}
            <div data-tour="pricing-filter-bar" className="rounded-2xl border border-border bg-card p-3 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-4 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <ItemPricingFilters
                    items={items}
                    searchQuery={searchQuery}
                    onSearchChange={(value) => {
                        setSearchQuery(value);
                        setPage(1);
                    }}
                    onScan={() => setScannerOpen(true)}
                    panelOpen={filterPanelOpen}
                    onPanelOpenChange={setFilterPanelOpen}
                    draftFilters={draftFilters}
                    onDraftFiltersChange={setDraftFilters}
                    onApply={() => {
                        setAppliedFilters({ ...draftFilters });
                        setPage(1);
                    }}
                    onReset={handleResetFilters}
                    activeFilterCount={activeFilterCount}
                    extra={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPublishingItemId("")}
                                className="!h-10 shrink-0 gap-2 rounded-xl px-3.5 text-sm font-semibold"
                            >
                                <ShoppingBag className="size-4 shrink-0" />
                                <span>Manage channels</span>
                            </Button>

                            {/* The same allocation the item form asks for one
                                number at a time, arrived at by a rule instead
                                — which is the only way to do it to eighty
                                items at once. */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSplittingStock(true)}
                                className="!h-10 shrink-0 gap-2 rounded-xl px-3.5 text-sm font-semibold"
                            >
                                <Scale className="size-4 shrink-0" />
                                <span>Split stock</span>
                            </Button>
                        </>
                    }
                />

                {/* The rule sits under the search because it only ever applies
                    to what the search left showing — and on its own line so the
                    row above stays four things wide however narrow the window. */}
                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-border/50 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                        {isBase ? "Price from cost" : "Channel markup"}
                    </p>

                    {isBase ? (
                        <RuleControl
                            kind={costRule}
                            value={costRuleValue}
                            label="Pricing rule"
                            onKindChange={setCostRule}
                            onValueChange={setCostRuleValue}
                        />
                    ) : (
                        <RuleControl
                            kind={globalKind}
                            value={draft?.globalValue ?? ""}
                            label="Global channel rule"
                            onKindChange={(kind) =>
                                setGlobalRule(kind, draft?.globalValue ?? "")
                            }
                            onValueChange={(value) =>
                                setGlobalRule(globalKind, value)
                            }
                        />
                    )}

                    {/* A channel's rule is saved with the rest of the channel,
                        so it has nothing to apply on its own. */}
                    {isBase ? (
                        <div className="ml-auto flex items-center gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetCostRule}
                                className="!h-10 shrink-0 rounded-xl px-3.5 text-sm font-semibold"
                            >
                                Reset
                            </Button>
                            <Button
                                type="button"
                                onClick={applyCostRule}
                                className="!h-10 shrink-0 rounded-xl px-4 text-sm font-semibold shadow-xs"
                            >
                                Apply to all
                            </Button>
                        </div>
                    ) : (
                        <div className="ml-auto w-36 shrink-0">
                            <Select
                                value={statusFilter}
                                items={{
                                    ALL: "All items",
                                    OVERRIDDEN: "With overrides",
                                    DEFAULT: "Channel default",
                                }}
                                onValueChange={(value) => {
                                    setStatusFilter(
                                        (value || "ALL") as
                                            | "ALL"
                                            | "OVERRIDDEN"
                                            | "DEFAULT",
                                    );
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label="Show items"
                                    className={`${controlClassName} !h-10 shrink-0 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">
                                        All items
                                    </SelectItem>
                                    <SelectItem value="OVERRIDDEN">
                                        With overrides
                                    </SelectItem>
                                    <SelectItem value="DEFAULT">
                                        Channel default
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Unsaved channel edits, said where they can be acted on. */}
            {!isBase && dirty ? (
                <div className="sticky bottom-4 z-10 flex animate-in flex-wrap items-center gap-2.5 rounded-2xl border border-warning/40 bg-card p-3 shadow-lg fade-in duration-200">
                    <span className="mr-auto text-sm font-semibold text-warning">
                        Unsaved changes on {channel?.name}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saveState.isLoading}
                        onClick={handleResetChannel}
                        className="!h-10 rounded-xl px-4 text-sm font-semibold"
                    >
                        Reset
                    </Button>
                    <Button
                        type="button"
                        disabled={saveState.isLoading}
                        onClick={handleSaveChannel}
                        className="!h-10 gap-2 rounded-xl px-5 text-sm font-semibold shadow-xs"
                    >
                        {saveState.isLoading ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : null}
                        Save Changes
                    </Button>
                </div>
            ) : null}

            {/* The catalogue. */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                {/* The counts live on the pagination bar below, so the heading
                    only has to say which catalogue this is. */}
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-4 sm:px-5">
                    <h2 className="text-base font-semibold text-foreground">
                        {isBase ? "Base prices" : `${channel?.name} catalogue`}
                    </h2>
                    {isBase ? null : (
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                openNow
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {openNow ? "Open now" : "Closed now"}
                        </span>
                    )}
                    {isBase || !listedCount ? null : (
                        <span className="text-xs text-muted-foreground">
                            {listedCount} listed
                            {overrideCount ? ` · ${overrideCount} override${overrideCount === 1 ? "" : "s"}` : ""}
                        </span>
                    )}
                </div>

                {!isBase && (listingQuery.isLoading || !draft) ? (
                    <InventoryLoading label="Loading this channel" />
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <Search className="mx-auto mb-2 size-8 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">
                            {items.length
                                ? "No matching items found"
                                : "No items yet"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {items.length
                                ? "Try adjusting your search query or filters."
                                : "Create an item in Inventory before pricing it."}
                        </p>
                        {items.length ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                className="mt-4 rounded-xl text-xs font-semibold"
                            >
                                Clear All Filters
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <ItemPricingTable
                            scope={isBase ? "BASE" : "CHANNEL"}
                            items={pageItems}
                            channels={channels}
                            channelsByItem={channelsByItem}
                            format={format}
                            unitCosts={unitCosts}
                            unitCostFor={unitCostFor}
                            addOnCosts={addOnCosts}
                            drafts={drafts}
                            overrides={draft?.overrides || {}}
                            enabled={draft?.enabled || new Set()}
                            globalRule={globalRule}
                            channelName={channel?.name}
                            onEdit={setEditingItemId}
                            onToggle={toggleItem}
                            onManageChannels={setPublishingItemId}
                        />

                        <TablePagination
                            total={filteredItems.length}
                            page={currentPage}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                        />
                    </>
                )}
            </section>

            {/* The price form for whichever scope is open. */}
            {editingItem && isBase ? (
                <SetPriceDialog
                    item={editingItem}
                    unitCostFor={unitCostFor(editingItem.id)}
                    addOnCosts={addOnCosts}
                    drafts={drafts}
                    open
                    onOpenChange={(next) =>
                        setEditingItemId(next ? editingItem.id : null)
                    }
                    onDraftChange={(key, value) =>
                        setDrafts((current) => ({ ...current, [key]: value }))
                    }
                />
            ) : null}

            {editingItem && !isBase ? (
                <ChannelPriceDialog
                    item={editingItem}
                    lines={linesOf(editingItem)}
                    overrides={draft?.overrides || {}}
                    globalRule={globalRule}
                    globalKind={globalKind}
                    channelName={channel?.name}
                    editingKeys={editingKeys}
                    open
                    format={format}
                    onOpenChange={(next) =>
                        setEditingItemId(next ? editingItem.id : null)
                    }
                    onSetOverride={setOverride}
                    onToggleEditing={toggleEditingOverride}
                />
            ) : null}

            {/* Where an item sells, changed in one go — the job the separate
                channel matrix screen was doing on its own. */}
            {/* An empty id opens it with nothing picked, which is how the
                toolbar button gets to the same form as a row's chips. */}
            <MultiChannelPublishDialog
                open={publishingItemId !== null}
                onClose={() => setPublishingItemId(null)}
                inventoryItems={items}
                salesChannels={channels}
                initialItemId={publishingItemId || ""}
                onSuccess={() => {
                    channelsQuery.refetch();
                    if (channelId) listingQuery.refetch();
                }}
            />

            <SplitStockDialog
                open={splittingStock}
                onClose={() => setSplittingStock(false)}
                inventoryItems={items}
                salesChannels={channels}
            />

            <BarcodeScannerOverlay
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={(item) => {
                    // Scanning is how you say "this one" — so it opens the
                    // form rather than leaving a filter to click through. On a
                    // channel, only for an item it actually sells: there is
                    // nothing to price on one that is switched off.
                    const known = isBase
                        ? items.some((entry) => entry.id === item.id)
                        : Boolean(draft?.enabled.has(item.id));

                    if (known) {
                        setSearchQuery("");
                        setPage(1);
                        setEditingItemId(item.id);
                        return;
                    }

                    // Not sold here, or not known to this screen. Searching for
                    // it says so, where opening nothing would look broken.
                    setSearchQuery(item.barcode || item.sku || item.name || "");
                    setPage(1);
                }}
            />
        </div>
    );
}
