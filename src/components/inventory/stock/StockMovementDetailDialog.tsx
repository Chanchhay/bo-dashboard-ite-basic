"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, Undo2 } from "lucide-react";

import type { DraftMovement } from "@/components/inventory/stock/stock-draft";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useMoney } from "@/hooks/useMoney";
import type { StockEntry } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
});

/**
 * One movement, as the ledger reads it.
 *
 * The table and the detail dialog show the same record at two levels of
 * detail, so they share one shape rather than deriving it twice.
 */
export type MovementDetail = {
    id: string;
    name: string;
    /** "Stock in", "Adjustment", … — the movement's own name. */
    typeLabel: string;
    /** Reason, cost, reference number: everything the operator typed. */
    note: string;
    kind: "IN" | "OUT" | "ADJUST";
    change: number;
    unitLabel: string;
    /** Balance the movement started from, once it can be established. */
    before?: number;
    /** Balance it left behind. */
    after?: number;
    /** Who recorded it. */
    actor?: string;
    /**
     * The record this movement acts on — for an adjustment, the stock in or
     * stock out it corrects. Undefined when nothing was linked.
     */
    linkedRecord?: string;
    at?: string;
    /** Draft rows can still be taken back; recorded ones never can. */
    draft?: DraftMovement;
    /** The entry as it came back from the backend, for the fields only it has. */
    entry?: StockEntry;
};

const kindBadgeClassName: Record<MovementDetail["kind"], string> = {
    IN: "bg-success/10 text-success border-success/20",
    OUT: "bg-danger/10 text-danger border-danger/20",
    ADJUST: "bg-warning/10 text-warning border-warning/20",
};

function Row({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-6 py-2.5">
            <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right text-sm font-medium text-foreground">
                {children}
            </dd>
        </div>
    );
}

/** Batch details are a free-form map, so only the keys we know are read out. */
const batchFieldLabels: Record<string, string> = {
    lot: "Batch / lot number",
    manufacturedAt: "Manufactured",
    expiresAt: "Expires",
};

export function StockMovementDetailDialog({
    open,
    onOpenChange,
    movement,
    onUndo,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movement: MovementDetail | null;
    onUndo: (id: string) => void;
}) {
    const { format: formatMoney } = useMoney();

    if (!movement) return null;

    const entry = movement.entry;
    const unitCost = entry?.unitCost ?? movement.draft?.unitCost;
    // What this movement was worth: the cost of one unit times how many moved.
    const movementValue =
        unitCost === undefined
            ? undefined
            : unitCost * Math.abs(movement.change);
    const batchEntries = Object.entries(entry?.batchData || {}).filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                kindBadgeClassName[movement.kind],
                            )}
                        >
                            {movement.typeLabel}
                        </span>
                        {movement.draft ? (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                Unsaved
                            </span>
                        ) : null}
                    </div>
                    <DialogTitle className="mt-2">{movement.name}</DialogTitle>
                    <DialogDescription>
                        {movement.at
                            ? dateTimeFormat.format(new Date(movement.at))
                            : "No date recorded"}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    {/* The movement's effect on the count */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Change
                                </p>
                                <p
                                    className={cn(
                                        "mt-1 text-xl font-semibold tabular-nums",
                                        movement.kind === "ADJUST"
                                            ? "text-warning"
                                            : movement.change >= 0
                                              ? "text-success"
                                              : "text-danger",
                                    )}
                                >
                                    {movement.change > 0 ? "+" : ""}
                                    {formatAmount(movement.change)}{" "}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {movement.unitLabel}
                                    </span>
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                    Balance
                                </p>
                                <p className="mt-1 tabular-nums">
                                    {movement.after === undefined ? (
                                        <span className="text-muted-foreground">
                                            Not recorded
                                        </span>
                                    ) : (
                                        <>
                                            <span className="text-muted-foreground">
                                                {formatAmount(
                                                    movement.before ?? 0,
                                                )}
                                            </span>
                                            <span className="px-1.5 text-muted-foreground">
                                                →
                                            </span>
                                            <span className="text-xl font-semibold text-foreground">
                                                {formatAmount(movement.after)}
                                            </span>{" "}
                                            <span className="text-sm text-muted-foreground">
                                                {movement.unitLabel}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <dl className="mt-2 divide-y divide-border">
                        <Row label="Recorded by">
                            {movement.actor || "Unknown user"}
                        </Row>

                        {movement.linkedRecord ? (
                            <Row label="Acts on">
                                <span
                                    className={
                                        movement.kind === "ADJUST"
                                            ? "text-warning"
                                            : undefined
                                    }
                                >
                                    {movement.linkedRecord}
                                </span>
                            </Row>
                        ) : null}

                        {unitCost !== undefined ? (
                            <Row label="Unit cost">
                                {formatMoney(unitCost)} /{" "}
                                {movement.unitLabel || "unit"}
                            </Row>
                        ) : null}

                        {movementValue !== undefined ? (
                            <Row label="Value of this movement">
                                {formatMoney(movementValue)}
                            </Row>
                        ) : null}

                        {movement.draft &&
                        movement.draft.enteredUnitLabel !==
                            movement.draft.baseUnitLabel ? (
                            <Row label="Entered as">
                                {formatAmount(movement.draft.enteredQuantity)}{" "}
                                {movement.draft.enteredUnitLabel}
                            </Row>
                        ) : null}

                        {entry?.referenceNumber ? (
                            <Row label="Reference">
                                {entry.referenceNumber}
                            </Row>
                        ) : null}

                        {(entry?.reason || movement.draft?.reason) ? (
                            <Row label="Reason">
                                <span className="whitespace-pre-wrap">
                                    {entry?.reason || movement.draft?.reason}
                                </span>
                            </Row>
                        ) : null}

                        {batchEntries.map(([key, value]) => (
                            <Row
                                key={key}
                                label={batchFieldLabels[key] || key}
                            >
                                {String(value)}
                            </Row>
                        ))}

                        {entry ? (
                            <Row label="Record ID">
                                <span className="font-mono text-xs break-all">
                                    {entry.id}
                                </span>
                            </Row>
                        ) : null}
                    </dl>

                    {movement.draft ? (
                        <p className="mt-4 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs text-warning">
                            This movement is a preview. Nothing has been sent
                            yet, so it can still be taken back.
                        </p>
                    ) : (
                        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                            <SlidersHorizontal className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                A recorded movement is never edited or deleted.
                                Correct it with an adjustment so the history
                                stays complete.
                            </span>
                        </p>
                    )}
                </div>

                <DialogFooter className="mt-6" showCloseButton>
                    {movement.draft ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                                onUndo(movement.id);
                                onOpenChange(false);
                            }}
                        >
                            <Undo2 className="size-4" />
                            Undo this movement
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
