"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Check,
    Clock,
    Columns3,
    Globe,
    MessageSquare,
    Phone,
    Printer,
    Search,
    Send,
    ShoppingBag,
    Store,
    Wallet,
    X,
} from "lucide-react";

import { AmountReceived } from "@/components/pos/amount-received";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { cn } from "@/lib/utils";
import {
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
} from "@/components/inventory/InventoryUi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const PAGE_SIZES = [10, 20, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

/** A sale sitting unpaid longer than this is flagged "Overdue" instead of "Pending". */
const OVERDUE_DAYS = 7;

const CHANNEL_FILTERS = ["ALL", "POS", "WEB", "TELEGRAM", "MESSENGER"] as const;
type ChannelFilter = (typeof CHANNEL_FILTERS)[number];

type SortMode = "oldest" | "newest" | "owed";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: "oldest", label: "Oldest first" },
    { value: "newest", label: "Newest first" },
    { value: "owed", label: "Highest owed" },
];

function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return null;
    return Math.floor((Date.now() - then) / 86_400_000);
}

type PayLaterColumnKey =
    | "sale"
    | "customer"
    | "channel"
    | "soldAt"
    | "status"
    | "owed"
    | "action";

const PAY_LATER_COLUMNS: { key: PayLaterColumnKey; label: string }[] = [
    { key: "sale", label: "Sale" },
    { key: "customer", label: "Customer" },
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
        skip: !paidReceiptOrderId,
    });
    const [persistedReceiptData, setPersistedReceiptData] = useState<any | null>(null);

    useEffect(() => {
        if (receiptQuery.data) {
            setPersistedReceiptData(receiptQuery.data);
        }
    }, [receiptQuery.data]);

    const displayReceiptData = receiptQuery.data ?? (paidReceiptOrderId ? null : persistedReceiptData);

    const businessQuery = useGetBusinessProfileQuery();
    const currenciesQuery = useGetBusinessCurrenciesQuery();

    const [query, setQuery] = useState("");
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");
    const [sortMode, setSortMode] = useState<SortMode>("oldest");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<
        Record<PayLaterColumnKey, boolean>
    >({
        sale: true,
        customer: true,
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

    const filteredSales = useMemo(() => {
        const q = query.trim().toLowerCase();

        const matches = sales.filter((sale) => {
            if (channelFilter !== "ALL" && sale.channel !== channelFilter) return false;
            if (!q) return true;
            return [
                sale.invoiceNumber,
                sale.customerName,
                sale.customerPhone,
                sale.customerEmail,
            ].some((field) => field?.toLowerCase().includes(q));
        });

        const sorted = [...matches];
        if (sortMode === "owed") {
            sorted.sort((a, b) => (b.totalAmount - b.paidAmount) - (a.totalAmount - a.paidAmount));
        } else {
            // Sales with no soldAt timestamp sink to the bottom either way —
            // there's nothing to prioritize them by.
            sorted.sort((a, b) => {
                if (!a.soldAt && !b.soldAt) return 0;
                if (!a.soldAt) return 1;
                if (!b.soldAt) return -1;
                const diff = new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime();
                return sortMode === "oldest" ? diff : -diff;
            });
        }

        return sorted;
    }, [sales, query, channelFilter, sortMode]);

    const pageCount = Math.max(Math.ceil(filteredSales.length / pageSize), 1);
    const safePage = Math.min(page, pageCount - 1);
    const pagedSales = useMemo(
        () =>
            filteredSales.slice(
                safePage * pageSize,
                safePage * pageSize + pageSize,
            ),
        [filteredSales, safePage, pageSize],
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
            <div className="flex flex-col gap-4">
                <InventoryEmpty
                    title="Nothing outstanding"
                    description="Sales rung up as Pay later will show up here until they're settled."
                />
            </div>
        );
    }

   
    const owedTotal = sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0);
    const overdueCount = sales.filter((sale) => (daysSince(sale.soldAt) ?? 0) > OVERDUE_DAYS).length;

    return (
        <div className="flex flex-col gap-4">
            <div
                data-tour="pay-later-totals"
                className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-3"
            >
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
                            Overdue
                        </span>
                        <div className="grid size-8 place-items-center rounded-xl bg-danger/10 text-danger">
                            <AlertTriangle className="size-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
                        {overdueCount}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                            {`>${OVERDUE_DAYS}d`}
                        </span>
                    </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-border bg-card p-4 shadow-xs sm:col-span-1">
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

            <div
                data-tour="pay-later-filters"
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center"
            >
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(0);
                        }}
                        placeholder="Search by invoice, customer or phone"
                        className="w-full rounded-xl border border-border bg-muted/40 py-2.5 pl-10 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("");
                                setPage(0);
                            }}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto">
                    <select
                        value={channelFilter}
                        onChange={(event) => {
                            setChannelFilter(event.target.value as ChannelFilter);
                            setPage(0);
                        }}
                        className="h-9 shrink-0 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary"
                    >
                        {CHANNEL_FILTERS.map((c) => (
                            <option key={c} value={c}>
                                {c === "ALL" ? "All channels" : channelNames[c] ?? c}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sortMode}
                        onChange={(event) => setSortMode(event.target.value as SortMode)}
                        className="h-9 shrink-0 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary">
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <div className="relative inline-block shrink-0 text-left">
                        <button
                            type="button"
                            onClick={() => setColumnsOpen((prev) => !prev)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                            <Columns3 className="size-4 text-muted-foreground" />
                            <span>Columns</span>
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
                                            className="flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted" >
                                            <span className="font-medium">{col.label}</span>
                                            <div
                                                className={`flex size-4 items-center justify-center rounded border transition-colors ${checked
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
        </div>

            <section
                data-tour="pay-later-list"
                className="overflow-clip rounded-2xl border border-border bg-card shadow-xs"
            >
                {/* Mobile Cards View (< md) */}
                <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
                    {pagedSales.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {query ? `No sales match "${query}".` : "No sales on this page."}
                        </div>
                    ) : (
                        pagedSales.map((sale) => {
                            const Icon = channelIcons[sale.channel] ?? ShoppingBag;
                            const owed = sale.totalAmount - sale.paidAmount;
                            const overdueBy = daysSince(sale.soldAt);
                            const isOverdue = (overdueBy ?? 0) > OVERDUE_DAYS;

                            return (
                                <div
                                    key={sale.id}
                                    onClick={() => setCollecting(sale)}
                                    className={cn(
                                        "rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all cursor-pointer hover:border-primary/40 active:scale-[0.99]",
                                        isOverdue && "border-danger/30 bg-danger/[0.02]"
                                    )}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                        <div className="flex items-center gap-2.5">
                                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                                <Icon className="size-3.5" />
                                            </span>
                                            <span className="font-bold text-sm text-foreground dark:text-white">
                                                {sale.invoiceNumber ?? "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isOverdue ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                                                    <AlertTriangle className="size-3" />
                                                    Overdue · {overdueBy}d
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                                                    Pending
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollecting(sale);
                                                }}
                                                className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                                            >
                                                Collect
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Key-Value Rows */}
                                    <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                        <div className="flex items-center justify-between px-3.5 py-2.5">
                                            <span className="text-muted-foreground dark:text-slate-400">Customer</span>
                                            <div className="flex items-center gap-1.5 font-medium text-foreground dark:text-slate-100">
                                                <span>
                                                    {sale.customerName || sale.customerPhone || sale.customerEmail || "Walk-in"}
                                                </span>
                                                {sale.customerPhone && (
                                                    <a
                                                        href={`tel:${sale.customerPhone}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label="Call customer"
                                                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        <Phone className="size-3 text-primary" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-3.5 py-2.5">
                                            <span className="text-muted-foreground dark:text-slate-400">Channel</span>
                                            <span className="font-medium text-foreground dark:text-slate-200">
                                                {channelNames[sale.channel] ?? sale.channel}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between px-3.5 py-2.5">
                                            <span className="text-muted-foreground dark:text-slate-400">Sold At</span>
                                            <span className="text-muted-foreground dark:text-slate-300">
                                                {sale.soldAt ? new Date(sale.soldAt).toLocaleString() : "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30">
                                            <span className="font-semibold text-foreground dark:text-slate-200">Owed Amount</span>
                                            <span className="text-sm font-bold text-danger">
                                                {format(owed, sale.currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {visibleColumns.sale && (
                                    <TableHead className="min-w-44">Sale</TableHead>
                                )}
                                {visibleColumns.customer && (
                                    <TableHead className="hidden sm:table-cell">Customer</TableHead>
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
                                        {query
                                            ? `No sales match "${query}".`
                                            : "No sales on this page."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagedSales.map((sale) => {
                                    const Icon = channelIcons[sale.channel] ?? ShoppingBag;
                                    const owed = sale.totalAmount - sale.paidAmount;
                                    const overdueBy = daysSince(sale.soldAt);
                                    const isOverdue = (overdueBy ?? 0) > OVERDUE_DAYS;

                                    return (
                                        <TableRow
                                            key={sale.id}
                                            onClick={() => setCollecting(sale)}
                                            className={cn(
                                                "cursor-pointer hover:bg-muted/40 transition-colors",
                                                isOverdue ? "bg-danger/[0.03] hover:bg-danger/[0.06]" : undefined
                                            )}
                                        >
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

                                            {visibleColumns.customer && (
                                                <TableCell className="hidden sm:table-cell">
                                                    {sale.customerId ? (
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {sale.customerName ||
                                                                        sale.customerPhone ||
                                                                        sale.customerEmail ||
                                                                        "Unnamed customer"}
                                                                </p>
                                                                {sale.customerName &&
                                                                    (sale.customerPhone || sale.customerEmail) ? (
                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                        {sale.customerPhone || sale.customerEmail}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            {sale.customerPhone && (
                                                                <a
                                                                    href={`tel:${sale.customerPhone}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    aria-label={`Call ${sale.customerName || sale.customerPhone}`}
                                                                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                                >
                                                                    <Phone className="size-3.5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Walk-in
                                                        </span>
                                                    )}
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
                                                    {isOverdue ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-danger/15 px-2 py-0.5 text-[12px] font-medium text-danger">
                                                            <AlertTriangle className="size-3" />
                                                            Overdue · {overdueBy}d
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 text-[12px] font-medium text-warning">
                                                            Pending
                                                        </span>
                                                    )}
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCollecting(sale);
                                                        }}
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

                {filteredSales.length > 0 && (
                    <PaginationBar
                        page={safePage}
                        size={pageSize}
                        totalElements={filteredSales.length}
                        totalPages={pageCount}
                        onPageChange={setPage}
                        onSizeChange={(nextSize) => {
                            setPageSize(nextSize);
                            setPage(0);
                        }}
                        isLoading={salesQuery.isFetching}
                        sizeOptions={PAGE_SIZES}
                        itemLabel="sale"
                    />
                )}
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
                            disabled={!displayReceiptData}
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
                    ) : displayReceiptData ? (
                        <div className="py-2">
                            <ReceiptTicket
                                business={businessQuery.data ?? null}
                                order={displayReceiptData.order}
                                receipt={displayReceiptData.receipt}
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
