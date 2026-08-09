"use client";

import { ArrowDownToLine, ArrowUpFromLine, Undo2 } from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import type { DraftMovement } from "@/components/inventory/stock/stock-draft";
import { signedChange } from "@/components/inventory/stock/stock-draft";
import { Button } from "@/components/ui/button";
import { stockEntryTypeLabels, type StockEntry } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";

const dateFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

type LedgerRow = {
    id: string;
    name: string;
    detail: string;
    change: number;
    unitLabel: string;
    at?: string;
    /** Draft rows can still be taken back; recorded ones never can. */
    draft?: DraftMovement;
};

/**
 * The ledger, drafts first.
 *
 * A recorded movement is permanent — that is the point of an append-only stock
 * history. Drafts are the exception only because nothing has been sent yet, so
 * they can be taken back rather than corrected with an opposing entry.
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
    const draftRows: LedgerRow[] = [...drafts]
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
            change: signedChange(movement),
            unitLabel: movement.baseUnitLabel,
            at: movement.at,
            draft: movement,
        }));

    const recordedRows: LedgerRow[] = [...entries]
        .sort(
            (left, right) =>
                new Date(right.createdDate || 0).getTime() -
                new Date(left.createdDate || 0).getTime(),
        )
        .map((entry) => ({
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
            change: entry.quantityChange || 0,
            unitLabel: "",
            at: entry.createdDate,
        }));

    if (draftRows.length === 0 && recordedRows.length === 0) {
        return (
            <InventoryEmpty
                title="No movements yet"
                description="Record a stock in or out from the Items tab and it will appear here."
            />
        );
    }

    return (
        <div className="flex flex-col">
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

            <ul className="divide-y divide-border">
                {[...draftRows, ...recordedRows].map((row) => (
                    <li
                        key={row.id}
                        className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-5"
                    >
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">
                                    {row.name}
                                </p>
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
                                row.change >= 0 ? "text-success" : "text-warning"
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
        </div>
    );
}
