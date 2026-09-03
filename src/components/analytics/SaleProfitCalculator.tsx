"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Calculator,
    Target,
    DollarSign,
    ShoppingBag,
    Percent,
    Coins,
    Receipt,
    CheckCircle2,
    Search,
    Sparkles,
    Download,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import type {
    SaleProfitCalculatorItem,
    SaleProfitCalculatorMode,
    SaleProfitCalculatorRequest,
} from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useCalculateSaleProfitQuery } from "@/services/salesReportApi";

type CalculatorMode = SaleProfitCalculatorMode;

const modeOptions: {
    value: CalculatorMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    {
        value: "PER_ITEM",
        label: "1. Margin per item",
        description: "Experiment with per-product margins & prices",
        icon: Calculator,
    },
    {
        value: "BUSINESS_TARGET",
        label: "2. Business target",
        description: "Scale all catalog prices to hit a gross margin target",
        icon: Target,
    },
];

/** Margin starts here for every item — a neutral guess, not a real number. */
const DEFAULT_MARGIN_PERCENT = 40;
const DEFAULT_TARGET_MARGIN_PERCENT = 50;
const DEFAULT_OPERATING_EXPENSE = 1200;
/** Long enough that a typed digit isn't cut off by its own request. */
const RECOMPUTE_DEBOUNCE_MS = 350;

function downloadCsvFile(filename: string, rows: (string | number | null | undefined)[][]) {
    const csvContent = rows
        .map((row) =>
            row
                .map((cell) => {
                    if (cell === null || cell === undefined) return "";
                    const value = String(cell);
                    return /[",\n]/.test(value)
                        ? `"${value.replaceAll('"', '""')}"`
                        : value;
                })
                .join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportMarginPerItemCsv(
    rows: SaleProfitCalculatorItem[],
    kpis: {
        revenue: number;
        cost: number;
        grossProfit: number;
        grossMargin: number;
        operatingExpense: number;
        netProfit: number;
        netMarginPercent: number;
    },
) {
    const dateStr = new Date().toISOString().split("T")[0];
    const dataRows: (string | number | null | undefined)[][] = [
        ["=== SALE PROFIT CALCULATOR - MARGIN PER ITEM REPORT ==="],
        ["Generated Date", new Date().toLocaleString()],
        ["Mode", "Margin Per Item"],
        ["Operating Expense ($)", kpis.operatingExpense.toFixed(2)],
        ["Total Revenue ($)", kpis.revenue.toFixed(2)],
        ["Cost of Goods ($)", kpis.cost.toFixed(2)],
        ["Gross Profit ($)", kpis.grossProfit.toFixed(2)],
        ["Gross Margin (%)", `${kpis.grossMargin.toFixed(1)}%`],
        ["Estimated Net Profit ($)", kpis.netProfit.toFixed(2)],
        ["Estimated Net Margin (%)", `${kpis.netMarginPercent.toFixed(1)}%`],
        [],
        [
            "Item Name",
            "Unit Cost ($)",
            "Quantity",
            "Margin (%)",
            "Predicted Price ($)",
            "Predicted Revenue ($)",
            "Predicted Profit ($)",
        ],
    ];

    for (const row of rows) {
        dataRows.push([
            row.name,
            row.cost.toFixed(2),
            row.qty,
            `${row.marginPercent.toFixed(1)}%`,
            row.price === null ? "—" : row.price.toFixed(2),
            row.revenue.toFixed(2),
            row.price === null ? "—" : row.profit.toFixed(2),
        ]);
    }

    downloadCsvFile(`sale-profit-margin-per-item-${dateStr}.csv`, dataRows);
}

function exportBusinessTargetCsv(
    rows: SaleProfitCalculatorItem[],
    kpis: {
        targetMarginPercent: number;
        revenue: number;
        cost: number;
        grossProfit: number;
        grossMargin: number;
        operatingExpense: number;
        netProfit: number;
        netMarginPercent: number;
    },
) {
    const dateStr = new Date().toISOString().split("T")[0];
    const dataRows: (string | number | null | undefined)[][] = [
        ["=== SALE PROFIT CALCULATOR - BUSINESS TARGET REPORT ==="],
        ["Generated Date", new Date().toLocaleString()],
        ["Mode", "Business Target"],
        ["Target Gross Margin Goal (%)", `${kpis.targetMarginPercent.toFixed(1)}%`],
        ["Operating Expense ($)", kpis.operatingExpense.toFixed(2)],
        ["Target Total Revenue ($)", kpis.revenue.toFixed(2)],
        ["Cost of Goods ($)", kpis.cost.toFixed(2)],
        ["Target Gross Profit ($)", kpis.grossProfit.toFixed(2)],
        ["Target Gross Margin (%)", `${kpis.grossMargin.toFixed(1)}%`],
        ["Estimated Net Profit ($)", kpis.netProfit.toFixed(2)],
        ["Estimated Net Margin (%)", `${kpis.netMarginPercent.toFixed(1)}%`],
        [],
        [
            "Item Name",
            "Unit Cost ($)",
            "Quantity",
            "Current Price ($)",
            "Target Price ($)",
            "Target Margin (%)",
            "Target Revenue ($)",
            "Target Profit ($)",
        ],
    ];

    for (const row of rows) {
        const targetRev = row.newPrice === null ? 0 : row.newPrice * row.qty;
        const targetProfit = row.newPrice === null ? 0 : (row.newPrice - row.cost) * row.qty;
        dataRows.push([
            row.name,
            row.cost.toFixed(2),
            row.qty,
            row.price === null ? "—" : row.price.toFixed(2),
            row.newPrice === null ? "—" : row.newPrice.toFixed(2),
            row.newMarginPercent === null ? "—" : `${row.newMarginPercent.toFixed(1)}%`,
            targetRev.toFixed(2),
            row.newPrice === null ? "—" : targetProfit.toFixed(2),
        ]);
    }

    downloadCsvFile(`sale-profit-business-target-${dateStr}.csv`, dataRows);
}

export function SaleProfitCalculator() {
    const { format } = useMoney();
    const [mode, setMode] = useState<CalculatorMode>("PER_ITEM");
    const [operatingExpense, setOperatingExpense] = useState(DEFAULT_OPERATING_EXPENSE);
    const [targetMarginPercent, setTargetMarginPercent] = useState(DEFAULT_TARGET_MARGIN_PERCENT);
    const [defaultMarginPercent, setDefaultMarginPercent] = useState(DEFAULT_MARGIN_PERCENT);
    const [itemMargins, setItemMargins] = useState<Record<string, number>>({});
    const [bulkMarginPercent, setBulkMarginPercent] = useState(DEFAULT_MARGIN_PERCENT);

    // Cost, quantity, price and profit are all worked out server-side against
    // a fresh read of inventory — this only decides which margins to ask for.
    const request: SaleProfitCalculatorRequest = useMemo(
        () => ({
            mode,
            defaultMarginPercent,
            itemMargins: Object.entries(itemMargins).map(([itemId, marginPercent]) => ({
                itemId,
                marginPercent,
            })),
            targetMarginPercent,
            operatingExpense,
        }),
        [mode, defaultMarginPercent, itemMargins, targetMarginPercent, operatingExpense],
    );

    // Debounced so a fast typist doesn't fire a request per keystroke — the
    // margin inputs below stay controlled by local state either way, so
    // nothing the user sees resets while a request is in flight.
    const [debouncedRequest, setDebouncedRequest] = useState(request);
    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedRequest(request),
            RECOMPUTE_DEBOUNCE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [request]);

    const calcQuery = useCalculateSaleProfitQuery(debouncedRequest);
    const items = useMemo(() => calcQuery.data?.items ?? [], [calcQuery.data]);
    const recomputing = calcQuery.isFetching && !calcQuery.isLoading;

    function draftMarginFor(itemId: string) {
        return itemMargins[itemId] ?? defaultMarginPercent;
    }

    function updateMargin(itemId: string, marginPercent: number) {
        setItemMargins((prev) => ({ ...prev, [itemId]: marginPercent }));
    }

    function applyMarginToAll() {
        setDefaultMarginPercent(bulkMarginPercent);
        setItemMargins({});
    }

    const revenue = calcQuery.data?.revenue ?? 0;
    const cost = calcQuery.data?.cost ?? 0;
    const grossProfit = calcQuery.data?.grossProfit ?? 0;
    const grossMargin = calcQuery.data?.grossMarginPercent ?? 0;
    const netProfit = calcQuery.data?.netProfit ?? 0;
    const netMarginPercent = calcQuery.data?.netMarginPercent ?? 0;

    const atTarget =
        calcQuery.data?.mode === "BUSINESS_TARGET" &&
        items.length > 0 &&
        items.every(
            (row) =>
                row.price === null ||
                row.newPrice === null ||
                Math.abs(row.newPrice - row.price) < 0.01,
        );

    const handleExportPerItem = () => {
        if (!calcQuery.data) return;
        exportMarginPerItemCsv(items, {
            revenue,
            cost,
            grossProfit,
            grossMargin,
            operatingExpense: calcQuery.data.operatingExpense,
            netProfit,
            netMarginPercent,
        });
    };

    const handleExportTarget = () => {
        if (!calcQuery.data) return;
        exportBusinessTargetCsv(items, {
            targetMarginPercent,
            revenue,
            cost,
            grossProfit,
            grossMargin,
            operatingExpense: calcQuery.data.operatingExpense,
            netProfit,
            netMarginPercent,
        });
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Mode Switcher Tabs */}
            <div
                role="tablist"
                aria-label="Sale profit method"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
                {modeOptions.map((option) => {
                    const isSelected = mode === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setMode(option.value)}
                            className={cn(
                                "flex flex-col rounded-2xl border p-4 text-left transition-all duration-200",
                                isSelected
                                    ? "border-primary bg-primary/5 text-primary shadow-xs ring-2 ring-primary/20"
                                    : "border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground",
                            )}
                        >
                            <span className="text-sm font-bold text-foreground">
                                {option.label}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                                {option.description}
                            </span>
                        </button>
                    );
                })}
            </div>

            {calcQuery.isLoading ? (
                <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-xs">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Sparkles className="size-6 animate-pulse" />
                    </div>
                    <p className="mt-3 text-base font-bold text-foreground">
                        Loading your inventory catalog…
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Calculating unit costs & stock counts to seed your profit model.
                    </p>
                </div>
            ) : calcQuery.isError ? (
                <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-xs">
                    <p className="text-sm font-bold text-danger">
                        Failed to calculate sale profit.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => calcQuery.refetch()}
                        className="mt-3 rounded-xl"
                    >
                        Try again
                    </Button>
                </div>
            ) : (
                <>
                    {/* Mode Specific Controller */}
                    {mode === "BUSINESS_TARGET" ? (
                        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                                        <Target className="size-5 stroke-[2.2]" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground">
                                            Business Target Profit Percentage
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Sets your overall gross profit percentage target across all inventory items
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={95}
                                            step="1"
                                            value={targetMarginPercent}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => {
                                                const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                                                const next = Number(cleaned);
                                                setTargetMarginPercent(
                                                    Number.isFinite(next)
                                                        ? Math.min(
                                                              95,
                                                              Math.max(1, next),
                                                          )
                                                        : 1,
                                                );
                                            }}
                                            aria-label="Target margin"
                                            className="h-9 w-24 rounded-xl pr-7 text-right text-base font-black text-primary tabular-nums"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm font-bold text-primary">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : null}

                    {/* KPI Metric Cards Grid */}
                    <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recomputing ? (
                            <Loader2 className="absolute -top-3 right-0 size-4 animate-spin text-muted-foreground" />
                        ) : null}
                        {/* 1. Revenue KPI */}
                        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {mode === "PER_ITEM" ? "Total Revenue" : "Target Revenue"}
                                    </p>
                                    <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-foreground">
                                        {format(revenue)}
                                    </p>
                                </div>
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                    <DollarSign className="size-6 stroke-[2.5]" />
                                </div>
                            </div>
                        </Card>

                        {/* 2. Cost of Goods KPI */}
                        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Cost of Goods
                                    </p>
                                    <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-foreground">
                                        {format(cost)}
                                    </p>
                                </div>
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                    <ShoppingBag className="size-6 stroke-[2.5]" />
                                </div>
                            </div>
                        </Card>

                        {/* 3. Gross Profit KPI */}
                        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Gross Profit
                                    </p>
                                    <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-foreground">
                                        {format(grossProfit)}
                                    </p>
                                </div>
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                    <Coins className="size-6 stroke-[2.5]" />
                                </div>
                            </div>
                        </Card>

                        {/* 4. Gross Margin KPI */}
                        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Gross Margin
                                    </p>
                                    <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-foreground">
                                        {grossMargin.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                                    <Percent className="size-6 stroke-[2.5]" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Table View */}
                    {mode === "PER_ITEM" ? (
                        <PerItemTable
                            rows={items}
                            format={format}
                            getDraftMargin={draftMarginFor}
                            onUpdateMargin={updateMargin}
                            hasItems={items.length > 0}
                            bulkMarginPercent={bulkMarginPercent}
                            onBulkMarginChange={setBulkMarginPercent}
                            onApplyMarginToAll={applyMarginToAll}
                            onExport={handleExportPerItem}
                        />
                    ) : (
                        <TargetTable
                            rows={items}
                            format={format}
                            atTarget={atTarget}
                            onExport={handleExportTarget}
                        />
                    )}

                    {/* Operating Expense & Net Profit KPI Bar */}
                    <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-muted-foreground/20 bg-muted/40 text-foreground">
                                    <Receipt className="size-5 stroke-[2]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground">
                                        Operating Expenses
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Rent, payroll & overhead deducted from gross profit
                                    </span>
                                </div>
                                <div className="relative ml-0 sm:ml-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={operatingExpense}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                            const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                                            setOperatingExpense(Number(cleaned) || 0);
                                        }}
                                        aria-label="Operating expenses"
                                        className="h-9 w-36 rounded-xl pr-3 text-right font-bold tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* Live Net Profit Result Card */}
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5 sm:justify-end">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Estimated Net Profit
                                </span>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            "text-lg font-black tabular-nums sm:text-xl",
                                            netProfit < 0 ? "text-danger" : "text-success",
                                        )}
                                    >
                                        {format(netProfit)}
                                    </span>
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums",
                                            netProfit < 0
                                                ? "bg-danger/10 text-danger"
                                                : "bg-success/10 text-success",
                                        )}
                                    >
                                        {netMarginPercent.toFixed(1)}% net
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

function PerItemTable({
    rows,
    format,
    getDraftMargin,
    onUpdateMargin,
    hasItems,
    bulkMarginPercent,
    onBulkMarginChange,
    onApplyMarginToAll,
    onExport,
}: {
    rows: SaleProfitCalculatorItem[];
    format: (value: number) => string;
    getDraftMargin: (itemId: string) => number;
    onUpdateMargin: (itemId: string, marginPercent: number) => void;
    hasItems: boolean;
    bulkMarginPercent: number;
    onBulkMarginChange: (marginPercent: number) => void;
    onApplyMarginToAll: () => void;
    onExport?: () => void;
}) {
    const [search, setSearch] = useState("");
    const pricedCount = rows.filter((row) => row.price !== null).length;

    const sortedRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        const matched = query
            ? rows.filter((row) => row.name.toLowerCase().includes(query))
            : rows;

        return [...matched].sort((a, b) => {
            if ((a.price === null) !== (b.price === null)) {
                return a.price === null ? 1 : -1;
            }
            if (a.price === null) return a.name.localeCompare(b.name);
            return b.profit - a.profit;
        });
    }, [rows, search]);

    return (
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            {hasItems ? (
                <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative min-w-56 flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search inventory items…"
                                aria-label="Search items"
                                className="h-9 rounded-xl pl-9 text-sm"
                            />
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            <span className="font-bold text-foreground">{pricedCount}</span> of {rows.length} priced
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 text-xs font-bold text-foreground">
                                Set all items profit percentage to:
                            </span>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0}
                                    max={99.9}
                                    step="1"
                                    value={bulkMarginPercent}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                                        const num = Number(cleaned);
                                        onBulkMarginChange(
                                            Number.isFinite(num) ? Math.min(99.9, Math.max(0, num)) : 0,
                                        );
                                    }}
                                    aria-label="Margin to apply to every item"
                                    className="h-8 w-20 rounded-lg pr-5 text-right text-xs font-bold tabular-nums"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                                    %
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={onApplyMarginToAll}
                                className="h-8 rounded-lg text-xs font-bold"
                            >
                                Apply to all
                            </Button>
                        </div>
                        {onExport ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onExport}
                                className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-bold hover:bg-card"
                            >
                                <Download className="size-3.5 text-muted-foreground" />
                                Export CSV
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-44 font-bold text-foreground">Item</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Cost</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Qty</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Margin</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Predicted Price</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Predicted Profit</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={6}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    No inventory items yet — add items and record stock-ins to enable predictions.
                                </TableCell>
                            </TableRow>
                        ) : sortedRows.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={6}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    No items match &ldquo;{search}&rdquo;.{" "}
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="font-bold text-primary hover:underline"
                                    >
                                        Clear search
                                    </button>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {sortedRows.map((row) => {
                            const hasCost = row.cost > 0;

                            return (
                                <TableRow
                                    key={row.itemId}
                                    className={cn(!hasCost && "bg-muted/10")}
                                >
                                    <TableCell className="font-semibold text-foreground">
                                        <span className="truncate font-bold">
                                            {row.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                        {format(row.cost)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                        {row.qty.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {hasCost ? (
                                            <div className="relative inline-block">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={99.9}
                                                    step="1"
                                                    value={getDraftMargin(row.itemId)}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                                                        const num = Number(cleaned);
                                                        onUpdateMargin(
                                                            row.itemId,
                                                            Number.isFinite(num) ? Math.min(99.9, Math.max(0, num)) : 0,
                                                        );
                                                    }}
                                                    className="h-8 w-20 rounded-lg pr-5 text-right text-xs font-bold tabular-nums"
                                                />
                                                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                                                    %
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                No cost yet
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-bold text-foreground tabular-nums">
                                        {row.price === null
                                            ? "—"
                                            : format(row.price)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            "text-right text-sm font-bold tabular-nums",
                                            row.price === null
                                                ? "text-muted-foreground"
                                                : "text-success",
                                        )}
                                    >
                                        {row.price === null
                                            ? "—"
                                            : format(row.profit)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

function TargetTable({
    rows,
    format,
    atTarget,
    onExport,
}: {
    rows: SaleProfitCalculatorItem[];
    format: (value: number) => string;
    atTarget: boolean;
    onExport?: () => void;
}) {
    return (
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 sm:px-5">
                <span className="text-xs font-bold text-foreground">
                    Business Target Pricing Predictions
                </span>
                {onExport ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-bold hover:bg-muted/40"
                    >
                        <Download className="size-3.5 text-muted-foreground" />
                        Export CSV
                    </Button>
                ) : null}
            </div>
            {atTarget ? (
                <div className="flex items-center gap-2 border-b border-border/80 bg-success/10 px-4 py-3 text-sm font-bold text-success sm:px-5">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Already at target — New price matches Current, nothing to adjust.
                </div>
            ) : null}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-40 font-bold text-foreground">Item</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Cost</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Qty</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Current Price</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Target Price</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Target Margin</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.itemId}>
                                <TableCell className="font-bold text-foreground">
                                    <span className="truncate font-bold">
                                        {row.name}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                    {format(row.cost)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                    {row.qty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                    {row.price === null
                                        ? "—"
                                        : format(row.price)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-extrabold text-foreground tabular-nums">
                                    {row.newPrice === null
                                        ? "—"
                                        : format(row.newPrice)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-extrabold text-success tabular-nums">
                                    {row.newMarginPercent === null
                                        ? "—"
                                        : `${row.newMarginPercent.toFixed(1)}%`}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
