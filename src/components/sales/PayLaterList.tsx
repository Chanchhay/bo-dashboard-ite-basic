"use client";

import { useState } from "react";
import { Clock, Globe, MessageSquare, Send, ShoppingBag, Store } from "lucide-react";

import { AmountReceived } from "@/components/pos/amount-received";
import {
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type { PayLaterSale } from "@/lib/api/pay-later";
import {
    useCollectPayLaterPaymentMutation,
    useGetPayLaterSalesQuery,
} from "@/services/salesReportApi";

const channelIcons: Record<string, React.ElementType> = {
    POS: Store,
    WEB: Globe,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
};

const channelNames: Record<string, string> = {
    POS: "Point of Sale",
    WEB: "Online Store",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
};

export function PayLaterList() {
    const { format } = useMoney();
    const { toast } = useToast();

    const salesQuery = useGetPayLaterSalesQuery();
    const [collectPayment, { isLoading: isCollecting }] =
        useCollectPayLaterPaymentMutation();

    const [collecting, setCollecting] = useState<PayLaterSale | null>(null);

    async function handleCollect(receivedAmount: number) {
        if (!collecting) return;

        try {
            await collectPayment({
                saleId: collecting.id,
                body: { paymentMethod: "CASH", receivedAmount },
            }).unwrap();

            toast({
                tone: "success",
                title: "Payment collected",
                description: `${collecting.invoiceNumber ?? "This sale"} is now settled.`,
            });
            setCollecting(null);
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not collect payment",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        }
    }

    if (salesQuery.isLoading) {
        return <InventoryLoading label="Loading pay-later sales" />;
    }

    if (salesQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    salesQuery.error,
                    "Unable to load pay-later sales.",
                )}
                retry={salesQuery.refetch}
            />
        );
    }

    const sales = salesQuery.data ?? [];

    if (sales.length === 0) {
        return (
            <InventoryEmpty
                title="Nothing outstanding"
                description="Sales rung up as Pay later will show up here until they're settled."
            />
        );
    }

    const owedTotal = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <Clock className="size-3.5 text-primary" />
                    {sales.length} outstanding sale{sales.length === 1 ? "" : "s"}
                </span>
                <span className="text-sm font-semibold text-foreground">
                    {format(owedTotal)} owed in total
                </span>
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="min-w-44">Sale</TableHead>
                                <TableHead className="hidden sm:table-cell">Channel</TableHead>
                                <TableHead className="hidden md:table-cell">Sold at</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Owed</TableHead>
                                <TableHead className="w-36 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {sales.map((sale) => {
                                const Icon = channelIcons[sale.channel] ?? ShoppingBag;
                                const owed = sale.totalAmount - sale.paidAmount;

                                return (
                                    <TableRow key={sale.id}>
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                                    <Icon className="size-4" />
                                                </span>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {sale.invoiceNumber ?? "—"}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                                            {channelNames[sale.channel] ?? sale.channel}
                                        </TableCell>

                                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                            {sale.soldAt
                                                ? new Date(sale.soldAt).toLocaleString()
                                                : "—"}
                                        </TableCell>

                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 text-[12px] font-medium text-warning">
                                                Pending
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-right text-sm font-semibold text-danger">
                                            {format(owed, sale.currency)}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <button
                                                type="button"
                                                onClick={() => setCollecting(sale)}
                                                className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                                            >
                                                Collect
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </section>

            <AmountReceived
                open={collecting !== null}
                onOpenChange={(open) => {
                    if (!open) setCollecting(null);
                }}
                amountDue={collecting ? collecting.totalAmount - collecting.paidAmount : 0}
                currency={collecting?.currency}
                onValidate={handleCollect}
                isProcessing={isCollecting}
            />
        </div>
    );
}
