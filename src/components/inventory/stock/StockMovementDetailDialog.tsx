"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

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
import { useGetStockEntryQuery } from "@/services/inventoryApi";
import type { StockEntry } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
});

export type MovementDetail = {
    id: string;
    name: string;
    isAddOn?: boolean;
    optionName?: string;
    typeLabel: string;
    note: string;
    kind: "IN" | "OUT" | "ADJUST";
    change: number;
    unitLabel: string;
    before?: number;
    after?: number;
    actor?: { name: string; account: string };
    linkedRecord?: string;
    at?: string;
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

const batchFieldLabels: Record<string, string> = {
    lot: "Batch / lot number",
    lotNumber: "Batch / lot number",
    manufacturedAt: "Manufactured",
    expiresAt: "Expires",
};

function batchRows(entry?: StockEntry) {
    if (!entry) return [];

    const named: [string, unknown][] = [
        ["lotNumber", entry.lotNumber],
        ["expiresAt", entry.expiresAt],
        ["manufacturedAt", entry.manufacturedAt],
    ];
    const stored = Object.entries(entry.batchData || {}).filter(
        ([key]) =>
            !named.some(
                ([namedKey, value]) =>
                    value != null &&
                    value !== "" &&
                    (namedKey === key ||
                        (namedKey === "lotNumber" && key === "lot")),
            ),
    );

    return [...named, ...stored].filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
    );
}

export function StockMovementDetailDialog({
    open,
    onOpenChange,
    movement,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movement: MovementDetail | null;
}) {
    const { format: formatMoney } = useMoney();
    const entryId = movement?.entry?.id;
    const detailQuery = useGetStockEntryQuery(entryId ?? "", {
        skip: !open || !entryId,
    });

    if (!movement) return null;

    const entry = movement.entry;
    const unitCost = entry?.unitCost;
    const costOfGoods = entry?.costOfGoods ?? undefined;
    const movementValue =
        costOfGoods ??
        (unitCost == null ? undefined : unitCost * Math.abs(movement.change));
    const consumedBatches = detailQuery.data?.consumedBatches ?? [];
    const batchEntries = batchRows(entry);

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
                        {movement.isAddOn ? (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                Add-on
                            </span>
                        ) : null}
                        {movement.optionName ? (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {movement.optionName}
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
                            {movement.actor ? (
                                <>
                                    {movement.actor.name}
                                    {movement.actor.account !==
                                    movement.actor.name ? (
                                        <span className="ml-1.5 font-normal text-muted-foreground">
                                            ({movement.actor.account})
                                        </span>
                                    ) : null}
                                </>
                            ) : (
                                <span className="text-muted-foreground">
                                    Not signed
                                </span>
                            )}
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

                        {unitCost != null ? (
                            <Row
                                label={
                                    costOfGoods === undefined
                                        ? "Unit cost"
                                        : "Cost per unit"
                                }
                            >
                                {formatMoney(unitCost)} /{" "}
                                {movement.unitLabel || "unit"}
                                {consumedBatches.length > 1 ? (
                                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                        averaged across{" "}
                                        {consumedBatches.length} batches
                                    </span>
                                ) : null}
                            </Row>
                        ) : null}

                        {movementValue !== undefined ? (
                            <Row
                                label={
                                    costOfGoods === undefined
                                        ? "Value of this movement"
                                        : "Cost of what left"
                                }
                            >
                                {formatMoney(movementValue)}
                            </Row>
                        ) : null}

                        {entry?.enteredQuantity !== undefined &&
                        entry?.enteredUnit ? (
                            <Row label="Entered as">
                                {formatAmount(entry.enteredQuantity)}{" "}
                                {entry.enteredUnit.name}
                            </Row>
                        ) : null}

                        {entry?.unitSalePrice != null ? (
                            <Row label="Sold at">
                                {formatMoney(entry.unitSalePrice)} per unit
                            </Row>
                        ) : null}

                        {entry?.referenceNumber ? (
                            <Row label="Reference">
                                {entry.referenceNumber}
                            </Row>
                        ) : null}

                        {entry?.reason ? (
                            <Row label="Reason">
                                <span className="whitespace-pre-wrap">
                                    {entry.reason}
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

                    {consumedBatches.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-border">
                            <p className="border-b border-border px-4 py-2.5 text-xs font-semibold text-foreground">
                                Taken from {consumedBatches.length} batch
                                {consumedBatches.length === 1 ? "" : "es"},
                                oldest first
                            </p>

                            <ul className="divide-y divide-border">
                                {consumedBatches.map((batch) => (
                                    <li
                                        key={batch.batchId}
                                        className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm text-foreground tabular-nums">
                                                {formatAmount(batch.quantity)}{" "}
                                                <span className="text-muted-foreground">
                                                    {movement.unitLabel ||
                                                        "unit"}
                                                </span>{" "}
                                                at{" "}
                                                {formatMoney(batch.unitCost)}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {[
                                                    batch.lotNumber
                                                        ? `Lot ${batch.lotNumber}`
                                                        : null,
                                                    batch.receivedAt
                                                        ? `in ${new Date(batch.receivedAt).toLocaleDateString("en-GB")}`
                                                        : null,
                                                    batch.expiresAt
                                                        ? `expires ${new Date(batch.expiresAt).toLocaleDateString("en-GB")}`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ") ||
                                                    "Batch recorded before lot tracking"}
                                            </p>
                                        </div>

                                        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                                            {formatMoney(batch.cost)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {movementValue !== undefined ? (
                                <p className="flex items-baseline justify-between gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-sm">
                                    <span className="text-muted-foreground">
                                        Total
                                    </span>
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {formatMoney(movementValue)}
                                    </span>
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                        <SlidersHorizontal className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            A recorded movement is never edited or deleted.
                            Correct it with an adjustment so the history stays
                            complete.
                        </span>
                    </p>
                </div>

                <DialogFooter className="mt-6" showCloseButton />

            </DialogContent>
        </Dialog>
    );
}
