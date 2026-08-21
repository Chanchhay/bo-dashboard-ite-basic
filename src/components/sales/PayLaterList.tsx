"use client";

import { useMemo, useState } from "react";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Columns3,
    Globe,
    MessageSquare,
    Printer,
    Send,
    ShoppingBag,
    Store,
    Wallet,
} from "lucide-react";

import { AmountReceived } from "@/components/pos/amount-received";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import {
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import { printReceipt } from "@/lib/print-receipt";
import type { PayLaterSale } from "@/lib/api/pay-later";
import {
    useCollectPayLaterPaymentMutation,
    useGetPayLaterSalesQuery,
} from "@/services/salesReportApi";
import { useGetReceiptQuery } from "@/services/posOrderApi";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";

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

const PAGE_SIZES = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZES)[number] = 10;

type PayLaterColumnKey =
    | "sale"
    | "channel"
    | "soldAt"
    | "status"
    | "owed"
    | "action";

const PAY_LATER_COLUMNS: { key: PayLaterColumnKey; label: string }[] = [
    { key: "sale", label: "Sale" },
    { key: "channel", label: "Channel" },
    { key: "soldAt", label: "Sold at" },
    { key: "status", label: "Status" },
    { key: "owed", label: "Owed" },
    { key: "action", label: "Action" },
];

export function PayLaterList() {
    const { format } = useMoney();
    const { toast } = useToast();

    const salesQuery = useGetPayLaterSalesQuery();
    const [collectPayment, { isLoading: isCollecting }] =
        useCollectPayLaterPaymentMutation();

    const [collecting, setCollecting] = useState<PayLaterSale | null>(null);
    const [paidReceiptOrderId, setPaidReceiptOrderId] = useState<string | null>(null);

    const receiptQuery = useGetReceiptQuery(paidReceiptOrderId ?? "", {
        skip: paidReceiptOrderId === null,
    });
    const businessQuery = useGetBusinessProfileQuery();
    const currenciesQuery = useGetBusinessCurrenciesQuery();

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(
        DEFAULT_PAGE_SIZE,
    );
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<
        Record<PayLaterColumnKey, boolean>
    >({
        sale: true,
        channel: true,
        soldAt: true,
        status: true,
        owed: true,
        action: true,
    });

    const activeColumnCount = useMemo(
        () => Object.values(visibleColumns).filter(Boolean).length,
        [visibleColumns],
    );

    function toggleColumn(key: PayLaterColumnKey) {
        setVisibleColumns((prev) => {
            const count = Object.values(prev).filter(Boolean).length;
            if (prev[key] && count <= 1) return prev;
            return { ...prev, [key]: !prev[key] };
        });
    }

    const sales = useMemo(() => salesQuery.data ?? [], [salesQuery.data]);
    const pageCount = Math.max(Math.ceil(sales.length / pageSize), 1);
    const safePage = Math.min(page, pageCount - 1);
    const pagedSales = useMemo(
        () => sales.slice(safePage * pageSize, safePage * pageSize + pageSize),
        [sales, safePage, pageSize],
    );

    async function handleCollect(receivedAmount: number) {
        if (!collecting) return;

        try {
            const sale = await collectPayment({
                saleId: collecting.id,
                body: { paymentMethod: "CASH", receivedAmount },
            }).unwrap();

            toast({
                tone: "success",
                title: "Payment collected",
                description: `${collecting.invoiceNumber ?? "This sale"} is now settled.`,
            });
            setCollecting(null);
            // Confirms to the cashier, in the same document the customer
            // gets, that this is no longer owed — not just a toast that
            // scrolls away.
            setPaidReceiptOrderId(sale.orderId);
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
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Outstanding
                            </span>
                            <div className="grid size-8 place-items-center rounded-xl bg-warning/10 text-warning">
                                <Clock className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
                            {sales.length}
                            <span className="ml-1 text-xs font-medium text-muted-foreground">
                                sale{sales.length === 1 ? "" : "s"}
                            </span>
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Owed in total
                            </span>
                            <div className="grid size-8 place-items-center rounded-xl bg-danger/10 text-danger">
                                <Wallet className="size-4" />
                            </div>
                        </div>
                        <p className="mt-2 truncate text-xl font-bold text-danger sm:text-2xl">
                            {format(owedTotal)}
                        </p>
                    </div>
                </div>

                <div className="relative inline-block text-left">
                    <button
                        type="button"
                        onClick={() => setColumnsOpen((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
                    >
                        <Columns3 className="size-4 text-muted-foreground" />
                        Columns
                        <span className="ml-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                            {activeColumnCount}/{PAY_LATER_COLUMNS.length}
                        </span>
                    </button>

                    {columnsOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-20"
                                onClick={() => setColumnsOpen(false)}
                            />
                            <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
                                {PAY_LATER_COLUMNS.map((col) => {
                                    const checked = visibleColumns[col.key];
                                    return (
                                        <label
                                            key={col.key}
                                            onClick={() => toggleColumn(col.key)}
                                            className="flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
                                        >
                                            <span className="font-medium">{col.label}</span>
                                            <div
                                                className={`flex size-4 items-center justify-center rounded border transition-colors ${
                                                    checked
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-border bg-background"
                                                }`}
                                            >
                                                {checked && <Check className="size-3 stroke-[3]" />}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {visibleColumns.sale && (
                                    <TableHead className="min-w-44">Sale</TableHead>
                                )}
                                {visibleColumns.channel && (
                                    <TableHead className="hidden sm:table-cell">Channel</TableHead>
                                )}
                                {visibleColumns.soldAt && (
                                    <TableHead className="hidden md:table-cell">Sold at</TableHead>
                                )}
                                {visibleColumns.status && <TableHead>Status</TableHead>}
                                {visibleColumns.owed && (
                                    <TableHead className="text-right">Owed</TableHead>
                                )}
                                {visibleColumns.action && (
                                    <TableHead className="w-36 text-right">Action</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {pagedSales.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={activeColumnCount || 1}
                                        className="h-32 text-center text-sm text-muted-foreground"
                                    >
                                        No sales on this page.
                                    </TableCell>
                                </TableRow>
                            ) : (
                            pagedSales.map((sale) => {
                                const Icon = channelIcons[sale.channel] ?? ShoppingBag;
                                const owed = sale.totalAmount - sale.paidAmount;

                                return (
                                    <TableRow key={sale.id}>
                                        {visibleColumns.sale && (
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
                                        )}

                                        {visibleColumns.channel && (
                                            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                                                {channelNames[sale.channel] ?? sale.channel}
                                            </TableCell>
                                        )}

                                        {visibleColumns.soldAt && (
                                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                                {sale.soldAt
                                                    ? new Date(sale.soldAt).toLocaleString()
                                                    : "—"}
                                            </TableCell>
                                        )}

                                        {visibleColumns.status && (
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 text-[12px] font-medium text-warning">
                                                    Pending
                                                </span>
                                            </TableCell>
                                        )}

                                        {visibleColumns.owed && (
                                            <TableCell className="text-right text-sm font-semibold text-danger">
                                                {format(owed, sale.currency)}
                                            </TableCell>
                                        )}

                                        {visibleColumns.action && (
                                            <TableCell className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setCollecting(sale)}
                                                    className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                                                >
                                                    Collect
                                                </button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
                <p className="text-[13px] text-muted-foreground">
                    {sales.length === 0
                        ? "No sales"
                        : `Showing ${safePage * pageSize + 1}–${Math.min(sales.length, safePage * pageSize + pageSize)} of ${sales.length}`}
                </p>

                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted-foreground">Rows</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            setPageSize(Number(value) as (typeof PAGE_SIZES)[number]);
                            setPage(0);
                        }}
                    >
                        <SelectTrigger className="h-8 w-18 rounded-lg border-border bg-card px-2 text-[13px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZES.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                            disabled={safePage === 0}
                            aria-label="Previous page"
                            className="grid size-8 place-items-center rounded-lg border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                        </button>
                        <span className="min-w-24 text-center text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
                            Page {safePage + 1} of {pageCount}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                            disabled={safePage + 1 >= pageCount}
                            aria-label="Next page"
                            className="grid size-8 place-items-center rounded-lg border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

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

            <Dialog
                open={paidReceiptOrderId !== null}
                onOpenChange={(open) => !open && setPaidReceiptOrderId(null)}
            >
                <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader className="flex-row items-center justify-between gap-3 border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Payment collected
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={printReceipt}
                            disabled={!receiptQuery.data || !businessQuery.data}
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-40"
                        >
                            <Printer className="size-3.5" aria-hidden="true" />
                            Print
                        </button>
                    </DialogHeader>

                    {receiptQuery.isLoading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                            Loading receipt...
                        </div>
                    ) : receiptQuery.data && businessQuery.data ? (
                        <div className="py-2">
                            <ReceiptTicket
                                business={businessQuery.data}
                                order={receiptQuery.data.order}
                                receipt={receiptQuery.data.receipt}
                                currencies={currenciesQuery.data}
                            />
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-destructive">
                            Could not load the receipt.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
