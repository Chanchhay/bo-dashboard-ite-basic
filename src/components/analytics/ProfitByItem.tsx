"use client";

import { Download } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
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
import { type ItemProfit } from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useGetItemProfitQuery } from "@/services/salesReportApi";

function itemLabel(row: ItemProfit) {
    const name = row.itemName || "Unnamed item";

    return row.variantName ? `${name} — ${row.variantName}` : name;
}

function toCsv(items: ItemProfit[]) {
    const header = [
        "Item",
        "Quantity sold",
        "Sale lines",
        "Discounts",
        "Revenue",
        "Cost of goods",
        "Gross profit",
        "Margin %",
    ];

    const rows = items.map((row) => [
        row.itemId ? itemLabel(row) : "Total",
        row.quantitySold,
        row.lines,
        row.discounts,
        row.revenue,
        row.cost,
        row.profit,
        row.marginPercent ?? "",
    ]);

    return [header, ...rows]
        .map((row) =>
            row
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

export function ProfitByItem({
    from,
    rangeLabel,
}: {
    from?: string;
    rangeLabel: string;
}) {
    const { format } = useMoney();
    const mounted = useMounted();
    const itemsQuery = useGetItemProfitQuery({ ...(from ? { from } : {}) });

    const items = itemsQuery.data?.items ?? [];
    const total = itemsQuery.data?.total;
    const nothingSold = !total || total.quantitySold === 0;

    function downloadCsv() {
        if (!total) return;

        const csv = toCsv([...items, total]);
        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");

        link.href = url;
        link.download = `profit-by-item-${rangeLabel}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        What sold
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Every item sold over the same range, and what you kept
                        on it.
                    </p>
                </div>

                {mounted ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={downloadCsv}
                        disabled={nothingSold}
                        className="h-10 gap-2 rounded-xl"
                    >
                        <Download className="size-4" />
                        Download CSV
                    </Button>
                ) : null}
            </div>

            {itemsQuery.isLoading ? (
                <InventoryLoading label="Working out what sold" />
            ) : itemsQuery.error ? (
                <InventoryError
                    message={getApiErrorMessage(
                        itemsQuery.error,
                        "Unable to work out what sold.",
                    )}
                    retry={itemsQuery.refetch}
                />
            ) : nothingSold ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <p className="font-semibold text-foreground">
                        Nothing sold in this period
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Take a sale, or widen the range above, and your items
                        will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="min-w-48">
                                        Item
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Sold
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Discounts
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
                                {items.map((row) => (
                                    <TableRow
                                        key={`${row.itemId}-${row.variantId ?? ""}`}
                                    >
                                        <TableCell className="font-medium text-foreground">
                                            {itemLabel(row)}
                                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                                on {row.lines} sale
                                                {row.lines === 1 ? "" : "s"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-foreground tabular-nums">
                                            {row.quantitySold}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                                            {row.discounts > 0 ? "−" : null}
                                            {format(row.discounts)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-foreground tabular-nums">
                                            {format(row.revenue)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-foreground tabular-nums">
                                            {format(row.cost)}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-right text-sm font-semibold tabular-nums",
                                                row.profit < 0
                                                    ? "text-danger"
                                                    : "text-success",
                                            )}
                                        >
                                            {row.profit < 0 ? "−" : null}
                                            {format(Math.abs(row.profit))}
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
                                            {total.quantitySold}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                                            {total.discounts > 0 ? "−" : null}
                                            {format(total.discounts)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                            {format(total.revenue)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                            {format(total.cost)}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-right text-sm font-semibold tabular-nums",
                                                total.profit < 0
                                                    ? "text-danger"
                                                    : "text-success",
                                            )}
                                        >
                                            {total.profit < 0 ? "−" : null}
                                            {format(Math.abs(total.profit))}
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
                        Revenue here is the sale lines themselves, after any
                        discount given on the line. A discount applied to a
                        whole order belongs to no single item, so this total can
                        sit above the statement&rsquo;s revenue — the statement
                        is the figure to keep the books on.
                    </p>
                </>
            )}
        </div>
    );
}
