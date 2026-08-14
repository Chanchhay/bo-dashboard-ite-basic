"use client";

import { Layers } from "lucide-react";

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

/**
 * The deliveries behind one item, in the order they will be sold.
 *
 * Stock is not one number at one price. Each delivery keeps the price it
 * arrived at, and a sale eats the oldest one first — so an item can be sitting
 * on two batches bought months apart at different money, and what the next
 * sale costs depends which of them it comes out of.
 *
 * Without this the margin on a receipt is a number the shop has to take on
 * trust. With it, the next sale's cost is the top row.
 */
export function StockBatchesDialog({
    itemId,
    itemName,
    unitName,
    open,
    onOpenChange,
}: {
    itemId: string;
    itemName: string;
    /** What one base unit is called, so quantities read as the shop says them. */
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
                        takes the oldest first. The next sale comes out of the
                        top row.
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
                                        <TableHead>Received</TableHead>
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
                                                    {batch.receivedAt
                                                        ? new Date(
                                                              batch.receivedAt,
                                                          ).toLocaleDateString(
                                                              "en-GB",
                                                          )
                                                        : "—"}
                                                </p>
                                                {batch.variantName ? (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {batch.variantName}
                                                    </p>
                                                ) : null}
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
