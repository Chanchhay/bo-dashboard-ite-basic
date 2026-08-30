"use client";

import { useMemo, useState } from "react";
import { Calculator, Info, Plus, Trash2 } from "lucide-react";

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import { profitRangeStart, toLocalDateTime } from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useGetSalesProfitQuery } from "@/services/salesReportApi";

const calculatorModes = {
    PER_ITEM: "Per-item margin",
    BUSINESS_TARGET: "Business target margin",
} as const;

type CalculatorMode = keyof typeof calculatorModes;

type ItemRow = {
    id: string;
    name: string;
    cost: number;
    marginPercent: number;
};

let nextRowId = 0;
function newRowId() {
    nextRowId += 1;
    return `row-${nextRowId}`;
}

function defaultRows(): ItemRow[] {
    return [
        { id: newRowId(), name: "Item 1", cost: 10, marginPercent: 50 },
        { id: newRowId(), name: "Item 2", cost: 5, marginPercent: 30 },
    ];
}

/**
 * price = cost ÷ (1 − margin%) — margin here is the fraction of the selling
 * price kept as profit, not markup on cost. Null once margin reaches 100%,
 * where the price would need to be infinite.
 */
function priceForMargin(cost: number, marginPercent: number): number | null {
    const fraction = marginPercent / 100;
    if (fraction >= 1) return null;
    return cost / (1 - fraction);
}

export function SaleProfitCalculator() {
    const { format } = useMoney();
    const [mode, setMode] = useState<CalculatorMode>("PER_ITEM");

    const [rows, setRows] = useState<ItemRow[]>(defaultRows);

    const [totalCost, setTotalCost] = useState(1000);
    const [targetMarginPercent, setTargetMarginPercent] = useState(50);

    const start = profitRangeStart("MONTH");
    const recentCostQuery = useGetSalesProfitQuery(
        start ? { from: toLocalDateTime(start) } : {},
    );
    const recentCost = recentCostQuery.data?.total?.cost;

    const perItemTotals = useMemo(() => {
        let cost = 0;
        let revenue = 0;
        for (const row of rows) {
            const price = priceForMargin(row.cost, row.marginPercent);
            cost += row.cost;
            revenue += price ?? row.cost;
        }
        const profit = revenue - cost;
        const blendedMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { cost, revenue, profit, blendedMargin };
    }, [rows]);

    const businessTarget = useMemo(() => {
        const fraction = targetMarginPercent / 100;
        const requiredRevenue = fraction >= 1 ? null : totalCost / (1 - fraction);
        const requiredProfit =
            requiredRevenue === null ? null : requiredRevenue - totalCost;
        const multiplier =
            requiredRevenue === null || totalCost <= 0
                ? null
                : requiredRevenue / totalCost;
        return { requiredRevenue, requiredProfit, multiplier };
    }, [totalCost, targetMarginPercent]);

    function updateRow(id: string, patch: Partial<ItemRow>) {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        );
    }

    function addRow() {
        setRows((prev) => [
            ...prev,
            { id: newRowId(), name: `Item ${prev.length + 1}`, cost: 0, marginPercent: 50 },
        ]);
    }

    function removeRow(id: string) {
        setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div data-tour="sale-profit-mode" className="w-64">
                    <Select
                        value={mode}
                        items={calculatorModes}
                        onValueChange={(value) =>
                            setMode((value || "PER_ITEM") as CalculatorMode)
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label="Sale profit method"
                            className={cn(
                                controlClassName,
                                "!h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold",
                            )}
                        >
                            <Calculator className="size-4 text-primary" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(calculatorModes).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <p className="text-xs text-muted-foreground sm:text-sm">
                    {mode === "PER_ITEM"
                        ? "Set a margin on each product — the price and total profit follow."
                        : "Set one margin goal for the whole business — the revenue you need to hit it follows."}
                </p>
            </div>

            {mode === "PER_ITEM" ? (
                <PerItemCalculator
                    rows={rows}
                    totals={perItemTotals}
                    format={format}
                    onUpdateRow={updateRow}
                    onAddRow={addRow}
                    onRemoveRow={removeRow}
                />
            ) : (
                <BusinessTargetCalculator
                    totalCost={totalCost}
                    targetMarginPercent={targetMarginPercent}
                    result={businessTarget}
                    format={format}
                    recentCost={recentCost}
                    onTotalCostChange={setTotalCost}
                    onTargetChange={setTargetMarginPercent}
                />
            )}

            <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="space-y-2 text-xs text-muted-foreground sm:text-sm">
                        <p>
                            <span className="font-semibold text-foreground">
                                Margin vs markup.
                            </span>{" "}
                            Cost {format(10)} with 50% markup gives a{" "}
                            {format(15)} price — only a 33% margin. Cost{" "}
                            {format(10)} with 50% margin gives a{" "}
                            {format(20)} price. This calculator always uses
                            margin — the share of the selling price you keep —
                            which is the right measure for a business
                            gross-profit target.
                        </p>
                        <p>
                            <span className="font-semibold text-foreground">
                                Gross margin is not net profit.
                            </span>{" "}
                            50% gross margin on {format(10000)} revenue is{" "}
                            {format(5000)} gross profit — rent, salaries and
                            utilities still come out of that. Set the gross
                            target above what you actually need to keep, not
                            equal to it.
                        </p>
                        <p>
                            <span className="font-semibold text-foreground">
                                The mix is what really moves the number.
                            </span>{" "}
                            Business target mode raises every price by the
                            same factor, but that's rarely the best move.
                            Since the business margin is revenue-weighted,
                            your highest-volume items carry the most
                            influence — shifting volume toward a good-margin
                            item can hit the target with no price increase at
                            all.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PerItemCalculator({
    rows,
    totals,
    format,
    onUpdateRow,
    onAddRow,
    onRemoveRow,
}: {
    rows: ItemRow[];
    totals: { cost: number; revenue: number; profit: number; blendedMargin: number };
    format: (value: number) => string;
    onUpdateRow: (id: string, patch: Partial<ItemRow>) => void;
    onAddRow: () => void;
    onRemoveRow: (id: string) => void;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5">
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        Price by item margin
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        price = cost ÷ (1 − margin%)
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddRow}
                    className="gap-1.5 rounded-lg"
                >
                    <Plus className="size-4" />
                    Add item
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-40">Item</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">
                                Margin %
                            </TableHead>
                            <TableHead className="text-right">
                                Price
                            </TableHead>
                            <TableHead className="text-right">
                                Profit
                            </TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.map((row) => {
                            const price = priceForMargin(
                                row.cost,
                                row.marginPercent,
                            );
                            const profit =
                                price === null ? null : price - row.cost;

                            return (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Input
                                            value={row.name}
                                            onChange={(e) =>
                                                onUpdateRow(row.id, {
                                                    name: e.target.value,
                                                })
                                            }
                                            className="h-9 min-w-32 rounded-lg text-sm"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={row.cost}
                                            onChange={(e) =>
                                                onUpdateRow(row.id, {
                                                    cost:
                                                        Number(e.target.value) ||
                                                        0,
                                                })
                                            }
                                            className="h-9 w-28 rounded-lg text-right text-sm tabular-nums"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={99.9}
                                            step="1"
                                            value={row.marginPercent}
                                            onChange={(e) =>
                                                onUpdateRow(row.id, {
                                                    marginPercent:
                                                        Number(e.target.value) ||
                                                        0,
                                                })
                                            }
                                            className="h-9 w-20 rounded-lg text-right text-sm tabular-nums"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                        {price === null ? "—" : format(price)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold text-success tabular-nums">
                                        {profit === null
                                            ? "—"
                                            : format(profit)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => onRemoveRow(row.id)}
                                            disabled={rows.length <= 1}
                                            className="text-muted-foreground hover:text-danger"
                                            aria-label={`Remove ${row.name}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        <TableRow className="border-t-2 border-border bg-muted/40 hover:bg-muted/40">
                            <TableCell className="font-semibold text-foreground">
                                Total ({rows.length} item
                                {rows.length === 1 ? "" : "s"})
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold tabular-nums">
                                {format(totals.cost)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold tabular-nums">
                                {totals.blendedMargin.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold tabular-nums">
                                {format(totals.revenue)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-success tabular-nums">
                                {format(totals.profit)}
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <p className="border-t border-border p-4 text-xs text-muted-foreground sm:px-5">
                Blended margin is the weighted average across every row — it
                is what "business margin" actually means, and it rarely
                matches any single item's own margin.
            </p>
        </div>
    );
}

function BusinessTargetCalculator({
    totalCost,
    targetMarginPercent,
    result,
    format,
    recentCost,
    onTotalCostChange,
    onTargetChange,
}: {
    totalCost: number;
    targetMarginPercent: number;
    result: {
        requiredRevenue: number | null;
        requiredProfit: number | null;
        multiplier: number | null;
    };
    format: (value: number) => string;
    recentCost: number | undefined;
    onTotalCostChange: (value: number) => void;
    onTargetChange: (value: number) => void;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border p-4 sm:px-5">
                <h2 className="text-base font-semibold text-foreground">
                    Revenue needed for a business-wide target
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    required revenue = total cost ÷ (1 − target%)
                </p>
            </div>

            <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Total cost of goods
                    </span>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={totalCost}
                        onChange={(e) =>
                            onTotalCostChange(Number(e.target.value) || 0)
                        }
                        className="h-11 rounded-xl text-base font-semibold tabular-nums"
                    />
                    {recentCost !== undefined ? (
                        <button
                            type="button"
                            onClick={() => onTotalCostChange(recentCost)}
                            className="w-fit text-xs font-semibold text-primary hover:underline"
                        >
                            Use last 30 days' cost of goods ({format(recentCost)})
                        </button>
                    ) : null}
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Target margin for the business
                    </span>
                    <div className="relative">
                        <Input
                            type="number"
                            min={0}
                            max={99.9}
                            step="1"
                            value={targetMarginPercent}
                            onChange={(e) =>
                                onTargetChange(Number(e.target.value) || 0)
                            }
                            className="h-11 rounded-xl pr-9 text-base font-semibold tabular-nums"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-semibold text-muted-foreground">
                            %
                        </span>
                    </div>
                </label>
            </div>

            <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-3 sm:p-5">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Required revenue
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                        {result.requiredRevenue === null
                            ? "—"
                            : format(result.requiredRevenue)}
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Required gross profit
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">
                        {result.requiredProfit === null
                            ? "—"
                            : format(result.requiredProfit)}
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Uniform price factor
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                        {result.multiplier === null
                            ? "—"
                            : `×${result.multiplier.toFixed(2)}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Only if every price rose by the same amount — a mix
                        change usually gets there cheaper.
                    </p>
                </div>
            </div>
        </div>
    );
}
