"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Calendar,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import {
    StockMovementDetailDialog,
    type MovementDetail,
} from "@/components/inventory/stock/StockMovementDetailDialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
    entryLotNumber,
    stockEntryTypeLabels,
    type StockEntry,
} from "@/lib/api/inventory";
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

const pageSizes = [10, 20, 25, 50, 100];

type MovementKind = "ALL" | "IN" | "OUT" | "ADJUST";

export type MovementTargetInfo = {
    name: string;
    unitLabel: string;
    onHand: number;
};

type LedgerRow = MovementDetail;

function targetKey(kind: "ITEM" | "ADDON", id: string, variantId?: string) {
    return variantId ? `${kind}:${id}:${variantId}` : `${kind}:${id}`;
}

function entryTargetKey(entry: StockEntry) {
    return entry.addOnId
        ? targetKey("ADDON", entry.addOnId)
        : targetKey("ITEM", entry.itemId || "", entry.variantId);
}

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

export function StockMovementsTab({
    entries,
    targets,
}: {
    entries: readonly StockEntry[];
    targets: Map<string, MovementTargetInfo>;
}) {
    const staffQuery = useGetStaffQuery();
    const profileQuery = useGetUserProfileQuery();

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

    const recordedRows: LedgerRow[] = useMemo(() => {
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

        function describeActor(entry: StockEntry) {
            const signature = entry.createdBy?.trim();
            if (!signature) return undefined;

            const name = actorNames.get(signature.toLowerCase());

            return { name: name || signature, account: signature };
        }

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
                const optionName = entry.variantName;
                const unitLabel = target?.unitLabel || "";
                const balance = balances.get(entry.id);

                return {
                    id: entry.id,
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
                        entryLotNumber(entry)
                            ? `Lot ${entryLotNumber(entry)}`
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

    const baseFilteredRows = useMemo(() => {
        return allRows.filter((row) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    row.name,
                    row.optionName,
                    row.typeLabel,
                    row.note,
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
    }, [allRows, searchQuery, startDate, endDate]);

    const filteredRows = useMemo(() => {
        return baseFilteredRows.filter((row) => {
            if (kindFilter !== "ALL" && row.kind !== kindFilter) {
                return false;
            }
            return true;
        });
    }, [baseFilteredRows, kindFilter]);

    const kindCounts = useMemo(
        () => ({
            ALL: baseFilteredRows.length,
            IN: baseFilteredRows.filter((row) => row.kind === "IN").length,
            OUT: baseFilteredRows.filter((row) => row.kind === "OUT").length,
            ADJUST: baseFilteredRows.filter((row) => row.kind === "ADJUST").length,
        }),
        [baseFilteredRows],
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
            <div className="flex flex-col gap-3 sm:gap-4 p-3.5 sm:p-5 border-b border-border bg-card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
                    <div data-tour="movements-filter-chips" className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl border border-border bg-muted/30 overflow-x-auto no-scrollbar w-full lg:w-auto">
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
                                    "shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    kindFilter === chip.id
                                        ? chip.active
                                        : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                                )}
                            >
                                {chip.id === "ADJUST" ? (
                                    <SlidersHorizontal className="size-3.5 sm:size-4" />
                                ) : chip.dot ? (
                                    <span
                                        className={cn(
                                            "size-2 sm:size-2.5 rounded-full",
                                            chip.dot,
                                        )}
                                    />
                                ) : null}
                                <span>{chip.label}</span>
                                <span className="text-[11px] sm:text-xs font-medium opacity-70">
                                    {kindCounts[chip.id]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div data-tour="movements-search" className="relative w-full sm:w-80 lg:w-96 flex-1 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) =>
                                applyFilter(() =>
                                    setSearchQuery(e.target.value),
                                )
                            }
                            placeholder="Search item, lot, reason, or person..."
                            className="pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-xl border-border bg-background w-full shadow-xs"
                        />
                    </div>
                </div>

                <div data-tour="movements-date-filter" className="flex flex-col gap-3 pt-3 border-t border-border/60 text-sm lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto py-0.5">
                        <span className="font-semibold text-foreground mr-1 flex items-center gap-1.5 shrink-0 text-xs sm:text-sm">
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
                                    "shrink-0 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap",
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

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">From:</span>
                            <div className="flex-1 sm:w-40 md:w-44 min-w-0">
                                <DatePicker
                                    value={startDate}
                                    max={endDate || undefined}
                                    placeholder="Any date"
                                    className="h-9 text-xs sm:text-sm"
                                    onValueChange={(value) =>
                                        applyFilter(() => {
                                            setStartDate(value);
                                            setDatePreset("CUSTOM");
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">To:</span>
                            <div className="flex-1 sm:w-40 md:w-44 min-w-0">
                                <DatePicker
                                    value={endDate}
                                    min={startDate || undefined}
                                    placeholder="Any date"
                                    className="h-9 text-xs sm:text-sm"
                                    onValueChange={(value) =>
                                        applyFilter(() => {
                                            setEndDate(value);
                                            setDatePreset("CUSTOM");
                                        })
                                    }
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
                                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
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
                <>
                    <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
                        {pageRows.map((row) => (
                            <div
                                key={row.id}
                                onClick={() => setOpenedRow(row)}
                                className="rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all cursor-pointer hover:border-primary/40 active:scale-[0.99]"
                            >
                                <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-sm text-foreground dark:text-white truncate">
                                                {row.name}
                                            </span>
                                            {row.isAddOn && (
                                                <span className="rounded-full border border-border bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground">
                                                    Add-on
                                                </span>
                                            )}
                                            {row.optionName && (
                                                <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                                                    {row.optionName}
                                                </span>
                                            )}
                                        </div>
                                        {row.unitLabel && (
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                                in {row.unitLabel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                            className={cn(
                                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                kindBadgeClassName[row.kind],
                                            )}
                                        >
                                            {row.typeLabel || kindLabels[row.kind]}
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Date & Time</span>
                                        <span className="text-muted-foreground dark:text-slate-300">
                                            {row.at ? `${dateFormat.format(new Date(row.at))} · ${timeFormat.format(new Date(row.at))}` : "—"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Change</span>
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 font-bold text-sm tabular-nums",
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
                                    </div>

                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Balance</span>
                                        <div className="text-xs font-semibold tabular-nums text-foreground dark:text-slate-200">
                                            {row.after === undefined ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (
                                                <>
                                                    <span className="text-muted-foreground font-normal">{formatAmount(row.before ?? 0)}</span>
                                                    <span className="px-1 text-muted-foreground">→</span>
                                                    <span>{formatAmount(row.after)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30">
                                        <span className="text-muted-foreground dark:text-slate-400">Recorded By</span>
                                        <span className="font-medium text-foreground dark:text-slate-200">
                                            {row.actor ? row.actor.name : "Not signed"}
                                        </span>
                                    </div>

                                    {(row.linkedRecord || row.note) && (
                                        <div className="px-3.5 py-2 text-[11px] text-muted-foreground bg-muted/5">
                                            {row.linkedRecord && <p className="font-medium text-foreground/80">{row.linkedRecord}</p>}
                                            {row.note && <p className="mt-0.5 italic">{row.note}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-auto max-h-[calc(100dvh-340px)] sm:max-h-[calc(100dvh-360px)]">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-card border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-xs">
                                <tr>
                                    <th className="px-5 py-3 bg-card">Date</th>
                                    <th className="px-5 py-3 bg-card">Item</th>
                                    <th className="px-5 py-3 bg-card">Movement</th>
                                    <th className="px-5 py-3 text-right bg-card">Change</th>
                                    <th className="px-5 py-3 text-right bg-card">
                                        Balance
                                    </th>
                                    <th className="px-5 py-3 bg-card">Recorded by</th>
                                    <th className="px-5 py-3 text-right bg-card">
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
                                            {row.isAddOn ? (
                                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                    Add-on
                                                </span>
                                            ) : null}
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
                </>
            )}

            {filteredRows.length ? (
                <PaginationBar
                    page={currentPage - 1}
                    size={pageSize}
                    totalElements={filteredRows.length}
                    totalPages={pageCount}
                    onPageChange={(nextPage) => setPage(nextPage + 1)}
                    onSizeChange={(nextSize) =>
                        applyFilter(() => setPageSize(nextSize))
                    }
                    sizeOptions={pageSizes}
                    itemLabel="movement"
                />
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
