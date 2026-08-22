"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { ProfitByItem } from "@/components/analytics/ProfitByItem";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
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
import { useMounted } from "@/hooks/useMounted";
import {
    periodLabel,
    profitRanges,
    profitRangeStart,
    reportGranularities,
    toLocalDateTime,
    type PeriodProfit,
    type ProfitRange,
    type ReportGranularity,
} from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useGetPeriodProfitQuery } from "@/services/salesReportApi";

/**
 * Money, with a loss carrying its own sign rather than only a colour.
 *
 * Red and green are the two a red-green colourblind reader cannot tell apart,
 * so the sign does the work and the colour is a second opinion.
 */
function Money({
    amount,
    format,
    signed,
}: {
    amount: number;
    format: (value: number) => string;
    signed?: boolean;
}) {
    const negative = amount < 0;

    return (
        <span
            className={cn(
                "tabular-nums",
                signed
                    ? negative
                        ? "font-semibold text-danger"
                        : "font-semibold text-success"
                    : "text-foreground",
            )}
        >
            {signed && negative ? "−" : null}
            {format(Math.abs(amount))}
        </span>
    );
}

/**
 * The rows as a spreadsheet would hold them.
 *
 * Raw numbers, not the formatted strings on screen: a currency symbol and a
 * thousands separator are the two things that stop a column adding up once it
 * is opened somewhere else.
 */
function toCsv(periods: PeriodProfit[], granularity: ReportGranularity) {
    const header = [
        "Period",
        "Sales",
        "Items sold",
        "Gross sales",
        "Discounts",
        "Tax collected",
        "Revenue (ex tax)",
        "Cost of goods",
        "Gross profit",
        "Margin %",
    ];

    const rows = periods.map((row) => [
        row.periodStart ? periodLabel(row.periodStart, granularity) : "Total",
        row.sales,
        row.itemsSold,
        row.grossSales,
        row.discounts,
        row.tax,
        row.revenue,
        row.cost,
        row.profit,
        row.marginPercent ?? "",
    ]);

    return [header, ...rows]
        .map((row) =>
            row
                // Only what needs quoting gets quoted, so a plain number stays
                // one to whatever opens the file.
                .map((cell) => {
                    const value = String(cell);

                    return /[",\n]/.test(value)
                        ? `"${value.replaceAll('"', '""')}"`
                        : value;
                })
                .join(","),
        )
        .join("\n");
}

/**
 * The accounting statement: what the shop took, what it cost, what it kept.
 *
 * One row per period rather than per sale, because the question this answers
 * is how a month went, not what happened at 14:32 on the Tuesday. The totals
 * come from the database over the whole range — a figure summed from a page of
 * orders quietly under-reports the moment a shop has a good year.
 */
export function ProfitByPeriod() {
    const { format } = useMoney();
    // The export is a browser-only affordance — it builds a Blob and clicks a
    // link — and its disabled state depends on data only the client has. Both
    // reasons say the same thing: it does not belong in the server's HTML.
    const mounted = useMounted();
    const [range, setRange] = useState<ProfitRange>("MONTH");
    const [granularity, setGranularity] = useState<ReportGranularity>("DAY");

    const start = profitRangeStart(range);
    const reportQuery = useGetPeriodProfitQuery({
        granularity,
        ...(start ? { from: toLocalDateTime(start) } : {}),
    });

    const periods = reportQuery.data?.periods ?? [];
    const total = reportQuery.data?.total;
    const nothingSold = !total || total.sales === 0;

    function downloadCsv() {
        if (!total) return;

        // The total travels with the rows: a statement handed to somebody else
        // should not need them to re-add it.
        const csv = toCsv([...periods, total], granularity);
        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");

        link.href = url;
        link.download = `profit-${granularity.toLowerCase()}-${range.toLowerCase()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-44">
                    <Select
                        value={range}
                        items={profitRanges}
                        onValueChange={(value) =>
                            setRange((value || "MONTH") as ProfitRange)
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label="Range covered"
                            className={cn(
                                controlClassName,
                                "!h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold",
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(profitRanges).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-36">
                    <Select
                        value={granularity}
                        items={reportGranularities}
                        onValueChange={(value) =>
                            setGranularity((value || "DAY") as ReportGranularity)
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label="Grouped by"
                            className={cn(
                                controlClassName,
                                "!h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold",
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(reportGranularities).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {mounted ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={downloadCsv}
                        disabled={nothingSold}
                        className="ml-auto h-10 gap-2 rounded-xl"
                    >
                        <Download className="size-4" />
                        Download CSV
                    </Button>
                ) : null}
            </div>

            {reportQuery.isLoading ? (
                <InventoryLoading label="Working out your figures" />
            ) : reportQuery.error ? (
                <InventoryError
                    message={getApiErrorMessage(
                        reportQuery.error,
                        "Unable to work out your figures.",
                    )}
                    retry={reportQuery.refetch}
                />
            ) : nothingSold ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <p className="font-semibold text-foreground">
                        Nothing sold in this period
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Take a sale, or widen the range, and the figures will
                        appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Wide by nature — a statement has a lot of columns, and
                        squeezing them is worse than letting them scroll. */}
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="min-w-40">
                                        Period
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Sales
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Items
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Gross sales
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Discounts
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Tax
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Revenue
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Cost of goods
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Gross profit
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Margin
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {periods.map((row) => (
                                    <TableRow key={row.periodStart}>
                                        <TableCell className="font-medium text-foreground">
                                            {row.periodStart
                                                ? periodLabel(
                                                      row.periodStart,
                                                      granularity,
                                                  )
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                            {row.sales}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                            {row.itemsSold}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Money
                                                amount={row.grossSales}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                            {row.discounts > 0 ? "−" : null}
                                            {format(row.discounts)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                            {format(row.tax)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Money
                                                amount={row.revenue}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Money
                                                amount={row.cost}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Money
                                                amount={row.profit}
                                                format={format}
                                                signed
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">
                                            {row.marginPercent === null ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                `${row.marginPercent.toFixed(1)}%`
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {total ? (
                                    <TableRow className="border-t-2 border-border bg-muted/40 hover:bg-muted/40">
                                        <TableCell className="font-semibold text-foreground">
                                            Total
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                            {total.sales}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                            {total.itemsSold}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold">
                                            <Money
                                                amount={total.grossSales}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                                            {total.discounts > 0 ? "−" : null}
                                            {format(total.discounts)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                                            {format(total.tax)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold">
                                            <Money
                                                amount={total.revenue}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold">
                                            <Money
                                                amount={total.cost}
                                                format={format}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Money
                                                amount={total.profit}
                                                format={format}
                                                signed
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                            {total.marginPercent === null
                                                ? "—"
                                                : `${total.marginPercent.toFixed(1)}%`}
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Revenue excludes tax, which is collected for the tax
                        authority rather than kept. Cost of goods is what the
                        stock actually cost, batch by batch, as recorded at the
                        moment of each sale — not what the shelf costs today.
                    </p>
                </>
            )}

            {/* Beneath the statement, on the same range: the statement says
                the month made money, this says which items made it. It reads
                the range from here rather than owning a second selector, so
                the two tables can never be showing different periods. */}
            <div className="mt-4 border-t border-border pt-6">
                <ProfitByItem
                    {...(start ? { from: toLocalDateTime(start) } : {})}
                    rangeLabel={range.toLowerCase()}
                />
            </div>
        </div>
    );
}
