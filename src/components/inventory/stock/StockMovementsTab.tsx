"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import {
    StockMovementDetailDialog,
    type MovementDetail,
} from "@/components/inventory/stock/StockMovementDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { stockEntryTypeLabels, type StockEntry } from "@/lib/api/inventory";
import { staffFullName } from "@/lib/api/user-management";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";
import { useGetStaffQuery } from "@/services/userManagementApi";
import { useGetUserProfileQuery } from "@/services/userProfileApi";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

const pageSizes = [10, 25, 50, 100];

type MovementKind = "ALL" | "IN" | "OUT" | "ADJUST";

/** What the movements tab needs to know about a target to read accurately. */
export type MovementTargetInfo = {
    name: string;
    unitLabel: string;
    /** On hand after every recorded entry. */
    onHand: number;
};

/** The table and the detail dialog read the same record. */
type LedgerRow = MovementDetail;

function targetKey(kind: "ITEM" | "ADDON", id: string, variantId?: string) {
    return variantId ? `${kind}:${id}:${variantId}` : `${kind}:${id}`;
}

/**
 * What an entry was written against.
 *
 * Exactly one of `itemId` / `addOnId` is set — an add-on holds stock of its
 * own — so an entry that carries an add-on must be looked up under the add-on
 * key. Reading every entry as an item is what left add-on movements nameless.
 *
 * An option narrows it further: each keeps its own running balance, so two
 * entries on the same item belong to different chains when they name
 * different options.
 */
function entryTargetKey(entry: StockEntry) {
    return entry.addOnId
        ? targetKey("ADDON", entry.addOnId)
        : targetKey("ITEM", entry.itemId || "", entry.variantId);
}

/**
 * How the entry got written, for the rows that carry no linked record.
 *
 * `referenceType` is the only trace of where an entry came from once it is
 * saved, so it is worth reading out rather than printing the raw enum.
 */
const referenceTypeLabels: Record<string, string> = {
    ADJUSTMENT_FORM: "Manual adjustment"
};

const kindBadgeClassName: Record<LedgerRow["kind"], string> = {
    IN: "bg-success/10 text-success border-success/20",
    OUT: "bg-danger/10 text-danger border-danger/20",
    ADJUST: "bg-warning/10 text-warning border-warning/20",
};

const kindLabels: Record<LedgerRow["kind"], string> = {
    IN: "Stock in",
    OUT: "Stock out",
    ADJUST: "Adjustment",
};

/**
 * The ledger, drafts first with filter controls.
 *
 * Every row is read as a step in a running balance rather than as a standalone
 * number: it shows what the target stood at before the movement and what it
 * left behind. Adjustments are the reason this matters — an adjustment only
 * means something against the stock in and out around it, and a bare "-3" says
 * nothing about whether the count is now right.
 */
export function StockMovementsTab({
    entries,
    targets,
}: {
    entries: readonly StockEntry[];
    /** Keyed by `ITEM:<id>` / `ADDON:<id>` — see {@link targetKey}. */
    targets: Map<string, MovementTargetInfo>;
}) {
    // Entries carry only the id of whoever wrote them, so names are looked up.
    const staffQuery = useGetStaffQuery();
    const profileQuery = useGetUserProfileQuery();

    /**
     * Everything an entry might be signed with, pointing at a person's name.
     *
     * The backend signs an entry with the username on the token, not with an
     * id, so ids alone never matched and every row read "Unknown user". Each
     * account is filed under all three — id, username, email — so whichever
     * one an entry carries finds its way to a name.
     */
    const actorNames = useMemo(() => {
        const names = new Map<string, string>();

        const remember = (
            name: string | undefined,
            ...keys: (string | undefined)[]
        ) => {
            if (!name) return;

            for (const key of keys) {
                const trimmed = key?.trim();
                if (trimmed) names.set(trimmed.toLowerCase(), name);
            }
        };

        for (const member of staffQuery.data || []) {
            remember(
                staffFullName(member),
                member.id,
                member.username,
                member.email,
            );
        }

        const profile = profileQuery.data;
        remember(
            [profile?.firstName, profile?.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
                profile?.username ||
                profile?.email,
            profile?.userId,
            profile?.username,
            profile?.email,
        );

        return names;
    }, [staffQuery.data, profileQuery.data]);

    const [kindFilter, setKindFilter] = useState<MovementKind>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [datePreset, setDatePreset] = useState<string>("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [openedRow, setOpenedRow] = useState<LedgerRow | null>(null);

    /**
     * Narrowing the list must not leave you stranded on a page past the end, so
     * everything that changes what is in the list goes through here and starts
     * again from the first page.
     */
    function applyFilter(change: () => void) {
        change();
        setPage(1);
    }

    function handlePresetChange(preset: string) {
        setDatePreset(preset);
        setPage(1);
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        if (preset === "ALL") {
            setStartDate("");
            setEndDate("");
        } else if (preset === "TODAY") {
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === "7DAYS") {
            const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(past.toISOString().split("T")[0]);
            setEndDate(todayStr);
        } else if (preset === "30DAYS") {
            const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setStartDate(past.toISOString().split("T")[0]);
            setEndDate(todayStr);
        }
    }

    /**
     * Recorded balances come from the entry itself when the backend sent them.
     * When it did not, they are reconstructed by walking each item's ledger
     * backwards from the quantity it holds today — the only anchor that is
     * certain — so the column is never a guess built forward from zero.
     */
    const recordedRows: LedgerRow[] = useMemo(() => {
        // Each target keeps its own running balance, add-ons included.
        const byTarget = new Map<string, StockEntry[]>();

        for (const entry of entries) {
            const key = entryTargetKey(entry);
            const list = byTarget.get(key);

            if (list) {
                list.push(entry);
            } else {
                byTarget.set(key, [entry]);
            }
        }

        const balances = new Map<
            string,
            { before?: number; after?: number }
        >();

        for (const [key, list] of byTarget) {
            let running = targets.get(key)?.onHand;

            const newestFirst = [...list].sort(
                (left, right) =>
                    new Date(right.createdDate || 0).getTime() -
                    new Date(left.createdDate || 0).getTime(),
            );

            for (const entry of newestFirst) {
                const change = entry.quantityChange || 0;
                const after = entry.quantityAfter ?? running;
                const before =
                    entry.quantityBefore ??
                    (after === undefined ? undefined : after - change);

                balances.set(entry.id, { before, after });
                running = before;
            }
        }

        const byId = new Map(entries.map((entry) => [entry.id, entry]));

        /**
         * Who recorded the entry, and the account they signed it with.
         *
         * An account that matches nobody on staff — an owner, or someone since
         * removed — is still shown by the name it signed with. It is a real
         * account, and printing "Unknown user" over it hid the one clue the
         * row had about where the movement came from.
         */
        function describeActor(entry: StockEntry) {
            const signature = entry.createdBy?.trim();
            if (!signature) return undefined;

            const name = actorNames.get(signature.toLowerCase());

            return { name: name || signature, account: signature };
        }

        /**
         * What an adjustment was made against. An adjustment on its own says
         * nothing — "-3" is only meaningful once you can see it corrects a
         * stock in of 20 from Tuesday.
         */
        function describeLinkedRecord(entry: StockEntry) {
            const linked = entry.referenceId
                ? byId.get(entry.referenceId)
                : undefined;

            if (!linked) {
                return entry.referenceType
                    ? referenceTypeLabels[entry.referenceType]
                    : undefined;
            }

            const label = linked.entryType
                ? stockEntryTypeLabels[linked.entryType]
                : "Stock entry";
            const change = linked.quantityChange || 0;

            return [
                `Adjusts ${label.toLowerCase()}`,
                `${change > 0 ? "+" : ""}${formatAmount(change)}`,
                linked.referenceNumber,
                linked.createdDate
                    ? dateTimeFormat.format(new Date(linked.createdDate))
                    : "",
            ]
                .filter(Boolean)
                .join(" · ");
        }

        return [...entries]
            .sort(
                (left, right) =>
                    new Date(right.createdDate || 0).getTime() -
                    new Date(left.createdDate || 0).getTime(),
            )
            .map((entry) => {
                let kind: "IN" | "OUT" | "ADJUST" = "ADJUST";
                if (entry.entryType === "STOCK_IN") {
                    kind = "IN";
                } else if (entry.entryType === "STOCK_OUT") {
                    kind = "OUT";
                } else if (entry.entryType === "ADJUSTMENT") {
                    kind = "ADJUST";
                } else if ((entry.quantityChange || 0) > 0) {
                    kind = "IN";
                } else if ((entry.quantityChange || 0) < 0) {
                    kind = "OUT";
                }

                const isAddOn = Boolean(entry.addOnId);
                const target = targets.get(entryTargetKey(entry));
                // The entry carries the option's name, so a movement still
                // reads correctly after that option is renamed or removed.
                const optionName = entry.variantName;
                const unitLabel = target?.unitLabel || "";
                const balance = balances.get(entry.id);

                return {
                    id: entry.id,
                    // Named after what it actually moved. Only a target that no
                    // longer exists falls back, and it says which kind it was.
                    name:
                        target?.name ||
                        (isAddOn ? "Deleted add-on" : "Deleted item"),
                    isAddOn,
                    ...(optionName ? { optionName } : {}),
                    typeLabel: entry.entryType
                        ? stockEntryTypeLabels[entry.entryType]
                        : "Stock entry",
                    note: [
                        entry.unitCost !== undefined
                            ? `${formatAmount(entry.unitCost)} / ${unitLabel || "unit"}`
                            : "",
                        entry.referenceNumber,
                        entry.reason,
                    ]
                        .filter(Boolean)
                        .join(" · "),
                    kind,
                    change: entry.quantityChange || 0,
                    unitLabel,
                    before: balance?.before,
                    after: balance?.after,
                    actor: describeActor(entry),
                    linkedRecord: describeLinkedRecord(entry),
                    at: entry.createdDate,
                    entry,
                };
            });
    }, [entries, targets, actorNames]);

    const allRows = useMemo(
        () => recordedRows,
        [recordedRows],
    );

    // Filtered rows based on selected movement kind, search text, and date range
    const filteredRows = useMemo(() => {
        return allRows.filter((row) => {
            if (kindFilter !== "ALL" && row.kind !== kindFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    row.name,
                    row.optionName,
                    row.typeLabel,
                    row.note,
                    // Searchable by either, since the row shows both.
                    row.actor?.name,
                    row.actor?.account,
                    row.linkedRecord,
                ];
                if (
                    !haystack.some((value) =>
                        (value || "").toLowerCase().includes(q),
                    )
                ) {
                    return false;
                }
            }
            if (row.at) {
                const rowTime = new Date(row.at).getTime();
                if (startDate) {
                    const startMs = new Date(`${startDate}T00:00:00`).getTime();
                    if (rowTime < startMs) return false;
                }
                if (endDate) {
                    const endMs = new Date(`${endDate}T23:59:59`).getTime();
                    if (rowTime > endMs) return false;
                }
            }
            return true;
        });
    }, [allRows, kindFilter, searchQuery, startDate, endDate]);

    /** Counts drive the filter chips; they describe everything, unfiltered. */
    const kindCounts = useMemo(
        () => ({
            ALL: allRows.length,
            IN: allRows.filter((row) => row.kind === "IN").length,
            OUT: allRows.filter((row) => row.kind === "OUT").length,
            ADJUST: allRows.filter((row) => row.kind === "ADJUST").length,
        }),
        [allRows],
    );

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const firstIndex = (currentPage - 1) * pageSize;
    const pageRows = filteredRows.slice(firstIndex, firstIndex + pageSize);

    if (allRows.length === 0) {
        return (
            <InventoryEmpty
                title="No movements yet"
                description="Record a stock entry or adjustment and it will appear here."
            />
        );
    }

    const filterChips: {
        id: MovementKind;
        label: string;
        dot?: string;
        active: string;
    }[] = [
        {
            id: "ALL",
            label: "All Movements",
            active: "bg-card text-foreground shadow-xs border border-border",
        },
        {
            id: "IN",
            label: "Stock In",
            dot: "bg-success",
            active: "bg-success/15 text-success border border-success/30 shadow-xs",
        },
        {
            id: "OUT",
            label: "Stock Out",
            dot: "bg-danger",
            active: "bg-danger/15 text-danger border border-danger/30 shadow-xs",
        },
        {
            id: "ADJUST",
            label: "Adjustments",
            dot: "bg-warning",
            active: "bg-warning/15 text-warning border border-warning/30 shadow-xs",
        },
    ];

    return (
        <div className="flex flex-col">
            {/* Filter Toolbar */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 border-b border-border bg-card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Movement Filter Buttons */}
                    <div data-tour="movements-filter-chips" className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-border bg-muted/30">
                        {filterChips.map((chip) => (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() =>
                                    applyFilter(() =>
                                        setKindFilter(chip.id),
                                    )
                                }
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                    kindFilter === chip.id
                                        ? chip.active
                                        : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                                )}
                            >
                                {chip.id === "ADJUST" ? (
                                    <SlidersHorizontal className="size-4" />
                                ) : chip.dot ? (
                                    <span
                                        className={cn(
                                            "size-2.5 rounded-full",
                                            chip.dot,
                                        )}
                                    />
                                ) : null}
                                <span>{chip.label}</span>
                                <span className="text-xs font-medium opacity-70">
                                    {kindCounts[chip.id]}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div data-tour="movements-search" className="relative min-w-60 flex-1 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) =>
                                applyFilter(() =>
                                    setSearchQuery(e.target.value),
                                )
                            }
                            placeholder="Search item, reason, or person..."
                            className="pl-10 h-10 text-sm rounded-xl border-border bg-background"
                        />
                    </div>
                </div>

                {/* Styled Date Filter Bar */}
                <div data-tour="movements-date-filter" className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-sm">
                    {/* Date Presets */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground mr-1 flex items-center gap-1.5">
                            <Calendar className="size-4 text-primary" />
                            <span>Date:</span>
                        </span>
                        {[
                            { id: "ALL", label: "All Time" },
                            { id: "TODAY", label: "Today" },
                            { id: "7DAYS", label: "Last 7 Days" },
                            { id: "30DAYS", label: "Last 30 Days" },
                        ].map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handlePresetChange(p.id)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
                                    datePreset === p.id && !startDate && !endDate
                                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                        : datePreset === p.id
                                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Clean Custom Calendar Inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">From:</span>
                            <div className="relative flex items-center">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        applyFilter(() => {
                                            setStartDate(e.target.value);
                                            setDatePreset("CUSTOM");
                                        })
                                    }
                                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">To:</span>
                            <div className="relative flex items-center">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) =>
                                        applyFilter(() => {
                                            setEndDate(e.target.value);
                                            setDatePreset("CUSTOM");
                                        })
                                    }
                                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                />
                            </div>
                        </div>

                        {startDate || endDate ? (
                            <button
                                type="button"
                                onClick={() =>
                                    applyFilter(() => {
                                        setStartDate("");
                                        setEndDate("");
                                        setDatePreset("ALL");
                                    })
                                }
                                className="text-sm font-medium text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {filteredRows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                    No movements match your selected filter.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Movement</th>
                                <th className="px-5 py-3 text-right">Change</th>
                                <th className="px-5 py-3 text-right">
                                    Balance
                                </th>
                                <th className="px-5 py-3">Recorded by</th>
                                <th className="px-5 py-3 text-right">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {pageRows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => setOpenedRow(row)}
                                    className="cursor-pointer align-top text-foreground transition-colors hover:bg-muted/40"
                                >
                                    {/* Date over time, so a column of dates lines up */}
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {row.at ? (
                                            <>
                                                <p className="font-medium">
                                                    {dateFormat.format(
                                                        new Date(row.at),
                                                    )}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {timeFormat.format(
                                                        new Date(row.at),
                                                    )}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        {/* Also the keyboard way into the
                                            details, since the row click is
                                            only reachable with a pointer. */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenedRow(row)
                                                }
                                                className="cursor-pointer text-left font-semibold hover:underline"
                                            >
                                                {row.name}
                                            </button>
                                            {/* An add-on and an item can share
                                                a name, so the row says which
                                                one moved. */}
                                            {row.isAddOn ? (
                                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                    Add-on
                                                </span>
                                            ) : null}
                                            {/* Which option moved — its own
                                                balance, not the item's. */}
                                            {row.optionName ? (
                                                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                                    {row.optionName}
                                                </span>
                                            ) : null}
                                        </div>
                                        {row.unitLabel ? (
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                in {row.unitLabel}
                                            </p>
                                        ) : null}
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                                    kindBadgeClassName[
                                                        row.kind
                                                    ],
                                                )}
                                            >
                                                {row.typeLabel ||
                                                    kindLabels[row.kind]}
                                            </span>
                                        </div>

                                        {/* The record this movement acts on */}
                                        {row.linkedRecord ? (
                                            <p
                                                className={cn(
                                                    "mt-1.5 max-w-[26rem] text-xs",
                                                    row.kind === "ADJUST"
                                                        ? "text-warning"
                                                        : "text-muted-foreground",
                                                )}
                                            >
                                                {row.linkedRecord}
                                            </p>
                                        ) : null}

                                        {row.note ? (
                                            <p className="mt-1 max-w-[26rem] text-xs text-muted-foreground">
                                                {row.note}
                                            </p>
                                        ) : null}
                                    </td>

                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                                                row.kind === "ADJUST"
                                                    ? "text-warning"
                                                    : row.change >= 0
                                                      ? "text-success"
                                                      : "text-danger",
                                            )}
                                        >
                                            {row.kind === "ADJUST" ? (
                                                <SlidersHorizontal className="size-3.5" />
                                            ) : row.change >= 0 ? (
                                                <ArrowDownToLine className="size-3.5" />
                                            ) : (
                                                <ArrowUpFromLine className="size-3.5" />
                                            )}
                                            {row.change > 0 ? "+" : ""}
                                            {formatAmount(row.change)}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4 text-right whitespace-nowrap tabular-nums">
                                        {row.after === undefined ? (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-muted-foreground">
                                                    {formatAmount(
                                                        row.before ?? 0,
                                                    )}
                                                </span>
                                                <span className="px-1 text-muted-foreground">
                                                    →
                                                </span>
                                                <span className="font-semibold">
                                                    {formatAmount(row.after)}
                                                </span>
                                            </>
                                        )}
                                    </td>

                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {row.actor ? (
                                            <>
                                                <p className="font-medium">
                                                    {row.actor.name}
                                                </p>
                                                {/* The account behind the
                                                    name, so two people who
                                                    share one are still told
                                                    apart. */}
                                                {row.actor.account !==
                                                row.actor.name ? (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {row.actor.account}
                                                    </p>
                                                ) : null}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Not signed
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <div
                                            className="flex items-center justify-end gap-1"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            {(row.entry?.itemId ||
                                                row.entry?.addOnId) &&
                                            row.kind !== "ADJUST" ? (
                                                <Button
                                                    data-tour="movements-row-adjust"
                                                    variant="outline"
                                                    size="sm"
                                                    nativeButton={false}
                                                    render={
                                                        <Link
                                                            href={`/inventory/stock/adjust?${row.entry.addOnId ? `addOnId=${row.entry.addOnId}` : `itemId=${row.entry.itemId}${row.entry.variantId ? `&variantId=${row.entry.variantId}` : ""}`}&entryId=${row.id}`}
                                                        />
                                                    }
                                                    aria-label={`Adjust ${row.name} against this movement`}
                                                >
                                                    <SlidersHorizontal className="size-3.5" />
                                                    Adjust
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {filteredRows.length ? (
                <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page</span>
                        <SelectField
                            id="movements-page-size"
                            name="movements-page-size"
                            value={String(pageSize)}
                            onValueChange={(value) =>
                                applyFilter(() => setPageSize(Number(value)))
                            }
                            options={pageSizes.map((size) => ({
                                value: String(size),
                                label: String(size),
                            }))}
                            className="h-9 w-20 rounded-xl"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            {firstIndex + 1}–
                            {firstIndex + pageRows.length} of{" "}
                            {filteredRows.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Previous page"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                            >
                                <ChevronLeft />
                            </Button>
                            <span className="text-sm font-medium text-foreground">
                                Page {currentPage} of {pageCount}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Next page"
                                disabled={currentPage >= pageCount}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(pageCount, current + 1),
                                    )
                                }
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            <StockMovementDetailDialog
                open={Boolean(openedRow)}
                onOpenChange={(next) => {
                    if (!next) setOpenedRow(null);
                }}
                movement={openedRow}
            />
        </div>
    );
}
