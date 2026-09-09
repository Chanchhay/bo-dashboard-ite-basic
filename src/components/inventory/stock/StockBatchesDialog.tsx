"use client";

import { AlertTriangle, Layers } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import { formatAmount } from "@/lib/inventory-config/units";
import { useGetItemStockBatchesQuery } from "@/services/inventoryApi";

export function StockBatchesDialog({
    itemId,
    itemName,
    unitName,
    open,
    onOpenChange,
}: {
    itemId: string;
    itemName: string;
    unitName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { format } = useMoney();
    const batchesQuery = useGetItemStockBatchesQuery(itemId, { skip: !open });

    const batches = batchesQuery.data ?? [];
    const totalRemaining = batches.reduce(
        (sum, batch) => sum + (batch.quantityRemaining ?? 0),
        0,
    );
    const totalValue = batches.reduce(
        (sum, batch) => sum + (batch.remainingValue ?? 0),
        0,
    );
    const unitWord = (unitName || "unit").toLowerCase();

    const expiredBatches = batches.filter((batch) => batch.expired);
    const expiredQuantity = expiredBatches.reduce(
        (sum, batch) => sum + (batch.quantityRemaining ?? 0),
        0,
    );
    const expiredValue = expiredBatches.reduce(
        (sum, batch) => sum + (batch.remainingValue ?? 0),
        0,
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl gap-4">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        <Layers className="size-5 text-primary" />
                        {itemName || "Item"} — batches on hand
                    </DialogTitle>
                    <DialogDescription>
                        Each delivery keeps the price it arrived at, and a sale
                        takes whichever expires soonest — then the oldest of
                        what never expires. The next sale comes out of the top
                        row.
                    </DialogDescription>
                </DialogHeader>

                {batchesQuery.isLoading ? (
                    <InventoryLoading label="Loading batches" />
                ) : batchesQuery.error ? (
                    <InventoryError
                        message={getApiErrorMessage(
                            batchesQuery.error,
                            "Unable to load the batches for this item.",
                        )}
                        retry={batchesQuery.refetch}
                    />
                ) : batches.length === 0 ? (
                    <div className="rounded-xl border border-border p-8 text-center">
                        <p className="font-semibold text-foreground">
                            Nothing on hand
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This item has no stock left. Record a stock in and
                            the delivery will show up here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-16">
                                            Next
                                        </TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead className="text-right">
                                            Cost each
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Left
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Worth
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {batches.map((batch) => (
                                        <TableRow key={batch.id}>
                                            <TableCell>
                                                <span
                                                    className={
                                                        batch.position === 1
                                                            ? "inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                                                            : "inline-flex items-center px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums"
                                                    }
                                                >
                                                    {batch.position === 1
                                                        ? "Next"
                                                        : batch.position}
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <p className="text-sm font-medium text-foreground">
                                                    {batch.lotNumber ||
                                                        (batch.receivedAt
                                                            ? new Date(
                                                                  batch.receivedAt,
                                                              ).toLocaleDateString(
                                                                  "en-GB",
                                                              )
                                                            : "—")}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {[
                                                        batch.variantName,
                                                        batch.lotNumber &&
                                                        batch.receivedAt
                                                            ? `in ${new Date(
                                                                  batch.receivedAt,
                                                              ).toLocaleDateString(
                                                                  "en-GB",
                                                              )}`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            </TableCell>

                                            <TableCell>
                                                {batch.expiresAt ? (
                                                    <span
                                                        className={
                                                            batch.expired
                                                                ? "inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
                                                                : "text-sm text-foreground tabular-nums"
                                                        }
                                                    >
                                                        {batch.expired ? (
                                                            <AlertTriangle className="size-3" />
                                                        ) : null}
                                                        {new Date(
                                                            batch.expiresAt,
                                                        ).toLocaleDateString(
                                                            "en-GB",
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        Does not expire
                                                    </span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                                {format(batch.unitCost)}
                                            </TableCell>

                                            <TableCell className="text-right text-sm text-foreground tabular-nums">
                                                {formatAmount(
                                                    batch.quantityRemaining,
                                                )}
                                                <span className="ml-1 text-xs text-muted-foreground">
                                                    of{" "}
                                                    {formatAmount(
                                                        batch.quantityReceived,
                                                    )}
                                                </span>
                                            </TableCell>

                                            <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                                                {format(batch.remainingValue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {expiredBatches.length > 0 ? (
                            <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                                <div>
                                    <p className="text-sm font-semibold text-danger">
                                        {formatAmount(expiredQuantity)}{" "}
                                        {unitWord}
                                        {expiredQuantity === 1 ? "" : "s"} past
                                        their date, worth{" "}
                                        {format(expiredValue)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-danger/90">
                                        Still counted and still sellable.
                                        Record a stock out to write them off.
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                {formatAmount(totalRemaining)} {unitWord}
                                {totalRemaining === 1 ? "" : "s"} across{" "}
                                {batches.length} batch
                                {batches.length === 1 ? "" : "es"}
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                Worth {format(totalValue)}
                            </p>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
