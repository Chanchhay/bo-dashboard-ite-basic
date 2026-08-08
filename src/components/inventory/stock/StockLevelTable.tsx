"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { stockStateLabels, type StockState } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";

const stateClassName: Record<StockState, string> = {
    OUT: "bg-danger/10 text-danger",
    LOW: "bg-warning/15 text-warning",
    IN: "bg-success/10 text-success",
};

export type StockLevelRow = {
    id: string;
    name: string;
    /** SKU for an item; "N more orders" for an add-on. */
    subtitle: string;
    onHand: number;
    unitLabel: string;
    threshold: number;
    state: StockState;
    /** Undefined when no cost has ever been recorded against it. */
    valueAtCost?: number;
    /** Non-zero when unsaved movements are sitting on this row. */
    pendingChange: number;
};

export function StockLevelTable({
    rows,
    emptyTitle,
    emptyDescription,
    valueColumnLabel,
    formatValue,
    onStockIn,
    onStockOut,
}: {
    rows: readonly StockLevelRow[];
    emptyTitle: string;
    emptyDescription: string;
    valueColumnLabel: string;
    formatValue: (value: number) => string;
    onStockIn: (id: string) => void;
    onStockOut: (id: string) => void;
}) {
    if (rows.length === 0) {
        return (
            <InventoryEmpty title={emptyTitle} description={emptyDescription} />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">On hand</th>
                        <th className="px-5 py-3">Warn below</th>
                        <th className="px-5 py-3">{valueColumnLabel}</th>
                        <th className="px-5 py-3">State</th>
                        <th className="px-5 py-3 text-right">Record</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                        <tr
                            key={row.id}
                            className="text-foreground hover:bg-muted/50"
                        >
                            <td className="px-5 py-4">
                                <p className="font-semibold">{row.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {row.subtitle}
                                </p>
                            </td>
                            <td className="px-5 py-4">
                                <span className="font-semibold">
                                    {formatAmount(row.onHand)}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                    {row.unitLabel}
                                </span>
                                {row.pendingChange !== 0 ? (
                                    // Unsaved movements are shown against the
                                    // row rather than only in the ledger, so it
                                    // is obvious the number moved and why.
                                    <span
                                        className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            row.pendingChange > 0
                                                ? "bg-success/10 text-success"
                                                : "bg-warning/15 text-warning"
                                        }`}
                                    >
                                        {row.pendingChange > 0 ? "+" : ""}
                                        {formatAmount(row.pendingChange)} unsaved
                                    </span>
                                ) : null}
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">
                                {formatAmount(row.threshold)} {row.unitLabel}
                            </td>
                            <td className="px-5 py-4">
                                {row.valueAtCost === undefined ? (
                                    <span
                                        className="text-muted-foreground"
                                        title="No cost recorded yet — record a stock in with a cost to value this"
                                    >
                                        No cost yet
                                    </span>
                                ) : (
                                    formatValue(row.valueAtCost)
                                )}
                            </td>
                            <td className="px-5 py-4">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClassName[row.state]}`}
                                >
                                    {stockStateLabels[row.state]}
                                </span>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onStockIn(row.id)}
                                        aria-label={`Stock in ${row.name}`}
                                    >
                                        <ArrowDownToLine />
                                        In
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={row.onHand <= 0}
                                        title={
                                            row.onHand <= 0
                                                ? "Nothing on hand to remove"
                                                : undefined
                                        }
                                        onClick={() => onStockOut(row.id)}
                                        aria-label={`Stock out ${row.name}`}
                                    >
                                        <ArrowUpFromLine />
                                        Out
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
