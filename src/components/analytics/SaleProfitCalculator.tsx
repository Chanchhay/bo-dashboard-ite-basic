"use client";

import { useMemo, useState } from "react";
import {
    Calculator,
    Target,
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Percent,
    Coins,
    Receipt,
    CheckCircle2,
    ChevronDown,
    Search,
    Sparkles,
    Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import type { InventoryItem, StockSummary } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";
import {
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";

type CalculatorMode = "PER_ITEM" | "BUSINESS_TARGET";

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

type ItemRow = {
    id: string;
    name: string;
    cost: number;
    qty: number;
    marginPercent: number;
};

/** An item row with its predicted price and profit worked out. */
type PricedRow = ItemRow & {
    price: number | null;
    revenue: number;
    profit: number;
};

/** Margin starts here for every item — a neutral guess, not a real number. */
const DEFAULT_MARGIN_PERCENT = 40;

function rowsFromInventory(
    items: InventoryItem[],
    stock: StockSummary[],
): ItemRow[] {
    const byItem = new Map<string, { qty: number; costWeighted: number }>();
    for (const entry of stock) {
        if (!entry.itemId) continue;
        const qty = entry.quantityOnHand ?? 0;
        const cost = entry.unitCost ?? 0;
        const existing = byItem.get(entry.itemId) ?? { qty: 0, costWeighted: 0 };
        byItem.set(entry.itemId, {
            qty: existing.qty + qty,
            costWeighted: existing.costWeighted + cost * qty,
        });
    }

    return items.map((item) => {
        const stockInfo = item.id ? byItem.get(item.id) : undefined;
        const qty = Math.round(stockInfo?.qty ?? 0);
        const cost =
            stockInfo && stockInfo.qty > 0
                ? Math.round((stockInfo.costWeighted / stockInfo.qty) * 100) / 100
                : 0;

        return {
            id: item.id,
            name: item.name || "Unnamed item",
            cost,
            qty,
            marginPercent: DEFAULT_MARGIN_PERCENT,
        };
    });
}

function priceForMargin(cost: number, marginPercent: number): number | null {
    const fraction = marginPercent / 100;
    if (fraction >= 1) return null;
    return cost / (1 - fraction);
}

function marginForPrice(cost: number, price: number): number | null {
    if (price <= 0) return null;
    return ((price - cost) / price) * 100;
}

function initials(name: string): string {
    const letters = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");
    return letters || "?";
}

const AVATAR_PALETTE = [
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
    "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20",
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20",
    "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20",
    "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20",
    "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border border-cyan-500/20",
];

function avatarPaletteFor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function SaleProfitCalculator() {
    const { format } = useMoney();
    const [mode, setMode] = useState<CalculatorMode>("PER_ITEM");
    const [rows, setRows] = useState<ItemRow[]>([]);
    const [operatingExpense, setOperatingExpense] = useState(1200);
    const [targetMarginPercent, setTargetMarginPercent] = useState(50);

    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const inventoryLoading = itemsQuery.isLoading || stockQuery.isLoading;
    const inventoryItems = itemsQuery.data ?? [];
    const inventoryStock = stockQuery.data ?? [];

    const [seededFromInventory, setSeededFromInventory] = useState(false);

    if (!seededFromInventory && !inventoryLoading) {
        setSeededFromInventory(true);
        setRows(rowsFromInventory(inventoryItems, inventoryStock));
    }

    function updateMargin(id: string, marginPercent: number) {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, marginPercent } : row)),
        );
    }

    const [bulkMarginPercent, setBulkMarginPercent] = useState(40);
    function applyMarginToAll() {
        setRows((prev) =>
            prev.map((row) => ({ ...row, marginPercent: bulkMarginPercent })),
        );
    }

    const currentRows = useMemo(
        () =>
            rows.map((row) => {
                const price =
                    row.cost > 0
                        ? priceForMargin(row.cost, row.marginPercent)
                        : null;
                return {
                    ...row,
                    price,
                    revenue: (price ?? row.cost) * row.qty,
                    profit: price === null ? 0 : (price - row.cost) * row.qty,
                };
            }),
        [rows],
    );

    const cost = useMemo(
        () => rows.reduce((sum, row) => sum + row.cost * row.qty, 0),
        [rows],
    );
    const currentRevenue = useMemo(
        () => currentRows.reduce((sum, row) => sum + row.revenue, 0),
        [currentRows],
    );
    const currentGrossProfit = currentRevenue - cost;
    const currentGrossMargin =
        currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : 0;

    const targetFraction = targetMarginPercent / 100;
    const requiredRevenue =
        targetFraction >= 1 ? null : cost / (1 - targetFraction);
    const gap = requiredRevenue === null ? null : requiredRevenue - currentRevenue;
    const multiplier =
        requiredRevenue === null || currentRevenue <= 0
            ? null
            : requiredRevenue / currentRevenue;
    const targetGrossProfit =
        requiredRevenue === null ? null : requiredRevenue - cost;

    const atTarget = gap !== null && Math.abs(gap) < 0.005;

    const targetRows = useMemo(
        () =>
            currentRows.map((row) => {
                const newPrice =
                    multiplier === null || row.price === null
                        ? null
                        : row.price * multiplier;
                const newMargin =
                    newPrice === null ? null : marginForPrice(row.cost, newPrice);
                return { ...row, newPrice, newMargin };
            }),
        [currentRows, multiplier],
    );

    const revenue = mode === "PER_ITEM" ? currentRevenue : requiredRevenue ?? currentRevenue;
    const grossProfit =
        mode === "PER_ITEM" ? currentGrossProfit : targetGrossProfit ?? currentGrossProfit;
    const grossMargin = mode === "PER_ITEM" ? currentGrossMargin : targetMarginPercent;
    const netProfit = grossProfit - operatingExpense;
    const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

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

            {inventoryLoading && !seededFromInventory ? (
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
                                    <Select
                                        value={String(targetMarginPercent)}
                                        onValueChange={(val) => setTargetMarginPercent(Number(val))}
                                    >
                                        <SelectTrigger size="sm" className="h-9 w-28 rounded-xl text-xs font-bold bg-background">
                                            <SelectValue placeholder="Select %" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {Array.from({ length: 99 }, (_, i) => i + 1).map((pct) => (
                                                <SelectItem key={pct} value={String(pct)} className="text-xs font-semibold">
                                                    {pct}%
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={95}
                                            step="1"
                                            value={targetMarginPercent}
                                            onChange={(e) => {
                                                const next = Number(e.target.value);
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        <>
                            <PerItemTable
                                rows={currentRows}
                                format={format}
                                onUpdateMargin={updateMargin}
                                hasItems={inventoryItems.length > 0}
                                bulkMarginPercent={bulkMarginPercent}
                                onBulkMarginChange={setBulkMarginPercent}
                                onApplyMarginToAll={applyMarginToAll}
                            />
                            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                                <Info className="size-3.5 shrink-0" />
                                Margin is the share of the selling price you
                                keep — a 50% margin on a {format(10)} cost
                                gives {format(20)}, not {format(15)} (that
                                would be 50% markup instead).
                            </p>
                        </>
                    ) : (
                        <TargetTable
                            rows={targetRows}
                            format={format}
                            atTarget={atTarget}
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
                                        onChange={(e) =>
                                            setOperatingExpense(Number(e.target.value) || 0)
                                        }
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

                    {mode === "BUSINESS_TARGET" ? <MixExplainer /> : null}
                </>
            )}
        </div>
    );
}

function PerItemTable({
    rows,
    format,
    onUpdateMargin,
    hasItems,
    bulkMarginPercent,
    onBulkMarginChange,
    onApplyMarginToAll,
}: {
    rows: PricedRow[];
    format: (value: number) => string;
    onUpdateMargin: (id: string, marginPercent: number) => void;
    hasItems: boolean;
    bulkMarginPercent: number;
    onBulkMarginChange: (marginPercent: number) => void;
    onApplyMarginToAll: () => void;
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
                            <Select
                                value={String(bulkMarginPercent)}
                                onValueChange={(val) => onBulkMarginChange(Number(val))}
                            >
                                <SelectTrigger size="sm" className="h-8 w-28 rounded-lg text-xs font-bold bg-background">
                                    <SelectValue placeholder="Select %" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {Array.from({ length: 100 }, (_, i) => i + 1).map((pct) => (
                                        <SelectItem key={pct} value={String(pct)} className="text-xs font-semibold">
                                            {pct}%
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0}
                                    max={99.9}
                                    step="1"
                                    value={bulkMarginPercent}
                                    onChange={(e) =>
                                        onBulkMarginChange(
                                            Number(e.target.value) || 0,
                                        )
                                    }
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
                                    key={row.id}
                                    className={cn(!hasCost && "bg-muted/10")}
                                >
                                    <TableCell className="font-semibold text-foreground">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={cn(
                                                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-xs",
                                                    avatarPaletteFor(row.name),
                                                )}
                                            >
                                                {initials(row.name)}
                                            </span>
                                            <span className="truncate font-bold">
                                                {row.name}
                                            </span>
                                        </div>
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
                                                    value={row.marginPercent}
                                                    onChange={(e) =>
                                                        onUpdateMargin(
                                                            row.id,
                                                            Number(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
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
}: {
    rows: Array<
        ItemRow & {
            price: number | null;
            newPrice: number | null;
            newMargin: number | null;
        }
    >;
    format: (value: number) => string;
    atTarget: boolean;
}) {
    return (
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
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
                            <TableRow key={row.id}>
                                <TableCell className="font-bold text-foreground">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={cn(
                                                "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-xs",
                                                avatarPaletteFor(row.name),
                                            )}
                                        >
                                            {initials(row.name)}
                                        </span>
                                        <span className="truncate">
                                            {row.name}
                                        </span>
                                    </div>
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
                                    {row.newMargin === null
                                        ? "—"
                                        : `${row.newMargin.toFixed(1)}%`}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

function MixExplainer() {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col items-center gap-2 pt-1">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="gap-2 rounded-full font-bold text-xs"
            >
                <Info className="size-4" />
                Explain the mix strategy for my shop
                <ChevronDown
                    className={cn(
                        "size-4 transition-transform",
                        open && "rotate-180",
                    )}
                />
            </Button>

            {open ? (
                <div className="w-full space-y-2 rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground sm:p-5">
                    <p>
                        The uniform price factor above raises every item by
                        the same percentage — the fastest way to hit a
                        target, but rarely the cheapest for your customers.
                    </p>
                    <p>
                        Since the business margin is revenue-weighted, your
                        highest-volume items carry the most influence on it.
                        Shifting volume toward your best-margin item, or
                        trimming cost on your biggest seller, can close some
                        of the gap with no price increase at all — worth
                        testing before raising every price.
                    </p>
                    <p>
                        And remember: gross margin isn&apos;t net profit. The
                        gross profit above still has to cover rent, salaries
                        and utilities before what&apos;s left is really
                        yours — that&apos;s what the operating expense line
                        is for.
                    </p>
                </div>
            ) : null}
        </div>
    );
}
