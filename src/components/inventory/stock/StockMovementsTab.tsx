"use client";

import { useMemo, useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Calendar,
    Search,
    SlidersHorizontal,
    Undo2,
} from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import type { DraftMovement } from "@/components/inventory/stock/stock-draft";
import { signedChange } from "@/components/inventory/stock/stock-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stockEntryTypeLabels, type StockEntry } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

type MovementKind = "ALL" | "IN" | "OUT" | "ADJUST";

type LedgerRow = {
    id: string;
    name: string;
    detail: string;
    kind: "IN" | "OUT" | "ADJUST";
    change: number;
    unitLabel: string;
    at?: string;
    /** Draft rows can still be taken back; recorded ones never can. */
    draft?: DraftMovement;
};

/**
 * The ledger, drafts first with filter controls.
 */
export function StockMovementsTab({
    drafts,
    entries,
    itemNames,
    onUndo,
    onClearDrafts,
}: {
    drafts: readonly DraftMovement[];
    entries: readonly StockEntry[];
    itemNames: Map<string, string>;
    onUndo: (id: string) => void;
    onClearDrafts: () => void;
}) {
    const [kindFilter, setKindFilter] = useState<MovementKind>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [datePreset, setDatePreset] = useState<string>("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    function handlePresetChange(preset: string) {
        setDatePreset(preset);
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

    const draftRows: LedgerRow[] = useMemo(
        () =>
            [...drafts]
                .sort((left, right) => right.at.localeCompare(left.at))
                .map((movement) => ({
                    id: movement.id,
                    name: movement.targetName,
                    detail: [
                        movement.direction === "IN" ? "Stock in" : "Stock out",
                        movement.enteredUnitLabel !== movement.baseUnitLabel
                            ? `${formatAmount(movement.enteredQuantity)} ${movement.enteredUnitLabel}`
                            : "",
                        movement.reason,
                    ]
                        .filter(Boolean)
                        .join(" · "),
                    kind: movement.direction === "IN" ? "IN" : "OUT",
                    change: signedChange(movement),
                    unitLabel: movement.baseUnitLabel,
                    at: movement.at,
                    draft: movement,
                })),
        [drafts],
    );

    const recordedRows: LedgerRow[] = useMemo(
        () =>
            [...entries]
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

                    return {
                        id: entry.id,
                        name: itemNames.get(entry.itemId || "") || "Unknown item",
                        detail: [
                            entry.entryType
                                ? stockEntryTypeLabels[entry.entryType]
                                : "Stock entry",
                            entry.reason,
                        ]
                            .filter(Boolean)
                            .join(" · "),
                        kind,
                        change: entry.quantityChange || 0,
                        unitLabel: "",
                        at: entry.createdDate,
                    };
                }),
        [entries, itemNames],
    );

    const allRows = useMemo(
        () => [...draftRows, ...recordedRows],
        [draftRows, recordedRows],
    );

    // Filtered rows based on selected movement kind, search text, and date range
    const filteredRows = useMemo(() => {
        return allRows.filter((row) => {
            if (kindFilter !== "ALL" && row.kind !== kindFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = row.name.toLowerCase().includes(q);
                const matchDetail = row.detail.toLowerCase().includes(q);
                if (!matchName && !matchDetail) return false;
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

    if (allRows.length === 0) {
        return (
            <InventoryEmpty
                title="No movements yet"
                description="Record a stock entry or adjustment and it will appear here."
            />
        );
    }

    return (
        <div className="flex flex-col">
            {/* Unsaved draft warning */}
            {draftRows.length ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-warning/10 px-5 py-3">
                    <p className="text-xs font-semibold text-warning">
                        {draftRows.length} unsaved movement
                        {draftRows.length === 1 ? "" : "s"} — preview only,
                        nothing has been sent.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClearDrafts}
                    >
                        Discard all
                    </Button>
                </div>
            ) : null}

            {/* Filter Toolbar */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 border-b border-border bg-card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Movement Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-border bg-muted/30">
                        <button
                            type="button"
                            onClick={() => setKindFilter("ALL")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                kindFilter === "ALL"
                                    ? "bg-card text-foreground shadow-xs border border-border"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                            )}
                        >
                            <span>All Movements</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setKindFilter("IN")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                kindFilter === "IN"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                            )}
                        >
                            <span className="size-2.5 rounded-full bg-emerald-500" />
                            <span>Stock In</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setKindFilter("OUT")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                kindFilter === "OUT"
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                            )}
                        >
                            <span className="size-2.5 rounded-full bg-rose-500" />
                            <span>Stock Out</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setKindFilter("ADJUST")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                kindFilter === "ADJUST"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                            )}
                        >
                            <SlidersHorizontal className="size-4 text-amber-500" />
                            <span>Adjustments</span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search item or reason..."
                            className="pl-10 h-10 text-sm rounded-xl border-border bg-background"
                        />
                    </div>
                </div>

                {/* Styled Date Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-sm">
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
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setDatePreset("CUSTOM");
                                    }}
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
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setDatePreset("CUSTOM");
                                    }}
                                    className="h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                />
                            </div>
                        </div>

                        {startDate || endDate ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setDatePreset("ALL");
                                }}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* List Table */}
            {filteredRows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                    No movements match your selected filter.
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {filteredRows.map((row) => (
                        <li
                            key={row.id}
                            className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-5 hover:bg-muted/20 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground">
                                        {row.name}
                                    </p>
                                    {row.kind === "IN" ? (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            Stock In
                                        </span>
                                    ) : row.kind === "OUT" ? (
                                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            Stock Out
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            Adjustment
                                        </span>
                                    )}

                                    {row.draft ? (
                                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                            Unsaved
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {row.detail}
                                </p>
                            </div>

                            <p
                                className={`flex items-center gap-1.5 font-semibold ${
                                    row.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}
                            >
                                {row.change >= 0 ? (
                                    <ArrowDownToLine className="size-3.5" />
                                ) : (
                                    <ArrowUpFromLine className="size-3.5" />
                                )}
                                {row.change > 0 ? "+" : ""}
                                {formatAmount(row.change)}{" "}
                                <span className="font-normal text-muted-foreground">
                                    {row.unitLabel}
                                </span>
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {row.at ? dateFormat.format(new Date(row.at)) : "—"}
                            </p>

                            <div className="flex justify-end">
                                {row.draft ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Undo ${row.name} movement`}
                                        onClick={() => onUndo(row.id)}
                                    >
                                        <Undo2 />
                                    </Button>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
