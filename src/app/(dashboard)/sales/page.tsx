"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Receipt,
    RefreshCw,
    Search,
    ExternalLink,
    Printer,
    Columns3,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TourButton } from "@/components/onboarding/TourButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { printReceipt } from "@/lib/print-receipt";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMoney } from "@/hooks/useMoney";
import type { PosOrder } from "@/lib/api/pos-order";
import { DEFAULT_PAGE_SIZE, ORDER_PAGE_SIZES } from "@/lib/api/pos-order";
import {
    useGetOrderHistoryQuery,
    useGetOrderSummaryQuery,
    useGetReceiptQuery,
} from "@/services/posOrderApi";
import {
    useGetBusinessProfileQuery,
    useGetStorefrontStatusQuery,
    useEnableStorefrontMutation,
    useDisableStorefrontMutation,
} from "@/services/businessApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";


const STATUS_FILTERS = [
    "ALL",
    "PENDING",
    "PAID",
    "CANCELLED",
    "FAILED",
] as const;

const CHANNEL_FILTERS = [
    "ALL",
    "POS",
    "TELEGRAM",
    "MESSENGER",
    "WEB",
] as const;

const DATE_FILTERS = ["Today", "7 days", "30 days", "All time"] as const;

type DateFilter = (typeof DATE_FILTERS)[number];

export type SalesColumnKey =
    | "invoice"
    | "date"
    | "channel"
    | "note"
    | "items"
    | "subtotal"
    | "discount"
    | "taxRate"
    | "taxAmount"
    | "total"
    | "status";

export type SalesColumnConfig = {
    key: SalesColumnKey;
    label: string;
    defaultVisible: boolean;
};

const SALES_COLUMNS: SalesColumnConfig[] = [
    { key: "invoice", label: "Invoice #", defaultVisible: true },
    { key: "date", label: "Date", defaultVisible: true },
    { key: "channel", label: "Channel", defaultVisible: true },
    { key: "note", label: "Order Name", defaultVisible: true },
    { key: "items", label: "Items Count", defaultVisible: true },
    { key: "subtotal", label: "Subtotal", defaultVisible: false },
    { key: "discount", label: "Discount", defaultVisible: false },
    { key: "taxRate", label: "Tax Rate", defaultVisible: true },
    { key: "taxAmount", label: "Tax Amount", defaultVisible: true },
    { key: "total", label: "Total", defaultVisible: true },
    { key: "status", label: "Status", defaultVisible: true },
];

const STATUS_STYLES: Record<PosOrder["status"], string> = {
    PAID: "bg-success/10 text-success",
    PENDING: "bg-warning/15 text-warning",
    CANCELLED: "bg-muted text-muted-foreground",
    FAILED: "bg-danger/10 text-danger",
};

function rangeStart(filter: DateFilter): string | undefined {
    const start = new Date();

    switch (filter) {
        case "Today":
            start.setHours(0, 0, 0, 0);
            break;
        case "7 days":
            start.setDate(start.getDate() - 7);
            break;
        case "30 days":
            start.setDate(start.getDate() - 30);
            break;
        case "All time":
            return undefined;
    }

    return start.toISOString();
}

function asPosOrder(order: any): PosOrder {
    if (!order) return order;
    const subtotal = typeof order.subtotal === "number" ? order.subtotal : parseFloat(order.subtotal || "0");
    const discountAmount = typeof order.discountAmount === "number" ? order.discountAmount : parseFloat(order.discountAmount || order.discount_amount || "0");
    const taxAmount = typeof order.taxAmount === "number" ? order.taxAmount : parseFloat(order.taxAmount || "0");
    const total = typeof order.total === "number" ? order.total : Math.max(0, subtotal - discountAmount + taxAmount);

    return {
        id: order.id,
        businessId: order.businessId || order.business_owner_id || "",
        invoiceNumber: order.invoiceNumber || order.invoice_number || null,
        customerId: order.customerId || order.customer_id || null,
        channel: order.channel || "POS",
        status: order.status || "PENDING",
        subtotal,
        discountAmount,
        taxRate: order.taxRate || 0,
        taxAmount,
        taxInclusionType: order.taxInclusionType || null,
        total,
        displayCurrency: order.displayCurrency || null,
        displayExchangeRate: order.displayExchangeRate || null,
        createdDate: order.createdDate || order.created_at || new Date().toISOString(),
        note: order.note || null,
        currency: order.currency || "USD",
        items: (order.items || []).map((i: any) => ({
            id: i.id || "",
            itemId: i.itemId || i.product_id || "",
            variantId: i.variantId || i.variant_id || null,
            itemName: i.itemName || i.product_name || "Item",
            variantName: i.variantName || i.variant_name || null,
            unitName: i.unitName || i.unit_name || null,
            unitFactor: i.unitFactor || i.unit_factor || 1,
            quantity: i.quantity || 1,
            unitPrice: typeof i.unitPrice === "number" ? i.unitPrice : parseFloat(i.unitPrice || i.unit_price || "0"),
            discountAmount: typeof i.discountAmount === "number" ? i.discountAmount : parseFloat(i.discountAmount || i.discount_amount || "0"),
            lineTotal: typeof i.lineTotal === "number" ? i.lineTotal : parseFloat(i.lineTotal || "0"),
            addOns: i.addOns || i.add_ons || [],
            selections: i.selections || [],
            trackInventory: i.trackInventory ?? i.track_inventory ?? true,
        })),
    };
}

export default function SalesOrdersPage() {
    const { format } = useMoney();
    const [status, setStatus] =
        useState<(typeof STATUS_FILTERS)[number]>("ALL");
    const [channel, setChannel] =
        useState<(typeof CHANNEL_FILTERS)[number]>("ALL");
    const [range, setRange] = useState<DateFilter>("Today");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const [visibleColumns, setVisibleColumns] = useState<Record<SalesColumnKey, boolean>>(() => {
        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem("ipos_sales_table_columns");
                if (raw) return JSON.parse(raw);
            } catch {}
        }
        return SALES_COLUMNS.reduce((acc, col) => {
            acc[col.key] = col.defaultVisible;
            return acc;
        }, {} as Record<SalesColumnKey, boolean>);
    });

    const toggleColumn = (key: SalesColumnKey) => {
        setVisibleColumns((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            try {
                localStorage.setItem("ipos_sales_table_columns", JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    const receiptQuery = useGetReceiptQuery(selectedOrderId ?? "", {
        skip: selectedOrderId === null,
    });
    const businessQuery = useGetBusinessProfileQuery();
    const currenciesQuery = useGetBusinessCurrenciesQuery();

    const from = useMemo(() => rangeStart(range), [range]);

    const { data: businessProfile } = useGetBusinessProfileQuery();
    const { data: storefrontStatus } = useGetStorefrontStatusQuery();
    const [enableStorefront, { isLoading: isEnabling }] = useEnableStorefrontMutation();
    const [disableStorefront, { isLoading: isDisabling }] = useDisableStorefrontMutation();
    const [storefrontError, setStorefrontError] = useState<string | null>(null);

    const handleMenuToggle = async (checked: boolean) => {
        setStorefrontError(null);
        try {
            if (checked) {
                await enableStorefront().unwrap();
            } else {
                await disableStorefront().unwrap();
            }
        } catch (err) {
            setStorefrontError(getApiErrorMessage(err, "Failed to update digital menu status."));
        }
    };

    const subdomainUrl = businessProfile?.slug
        ? `https://${businessProfile.slug}.fluxibiz.store`
        : "#";

    const { data, error, isLoading, isFetching, refetch } =
        useGetOrderHistoryQuery({ status, channel, from, page, size: pageSize });
    // Cached on the filters alone, so turning a page never recounts the range.
    const summaryQuery = useGetOrderSummaryQuery({ status, channel, from });

    const orders = useMemo(() => data?.content ?? [], [data]);
    const totals = summaryQuery.data?.totals;
    const metadata = data?.page;

    const pageItemBreakdown = useMemo(() => {
        let stockQty = 0;
        let stockRevenue = 0;
        let noStockQty = 0;
        let noStockRevenue = 0;

        for (const o of orders) {
            for (const item of o.items || []) {
                const lineAmount = (item.unitPrice * item.quantity) - (item.discountAmount || 0);
                if (item.trackInventory === false) {
                    noStockQty += item.quantity;
                    noStockRevenue += Math.max(0, lineAmount);
                } else {
                    stockQty += item.quantity;
                    stockRevenue += Math.max(0, lineAmount);
                }
            }
        }

        return { stockQty, stockRevenue, noStockQty, noStockRevenue };
    }, [orders]);

    const selectedOrder = useMemo(() => {
        if (!selectedOrderId) return null;
        return orders.find((o) => o.id === selectedOrderId) ?? null;
    }, [orders, selectedOrderId]);

    const displayOrder = receiptQuery.data?.order ?? (selectedOrder ? asPosOrder(selectedOrder) : null);

    const search = query.trim().toLowerCase();
    const rows = useMemo(
        () =>
            search
                ? orders.filter((order) => matchesSearch(order, search))
                : orders,
        [orders, search],
    );

    const pageCount = Math.max(metadata?.totalPages ?? 0, 1);
    const totalElements = metadata?.totalElements ?? rows.length;
    const firstRow = totalElements === 0 ? 0 : page * pageSize + 1;
    const lastRow = Math.min(page * pageSize + orders.length, totalElements);

    /** Any filter change starts the list from the first page again. */
    function applyFilter<T>(set: (next: T) => void) {
        return (next: T) => {
            set(next);
            setPage(0);
        };
    }

    return (
        <div data-tour="sales-orders-list" className="flex flex-col gap-5 pb-4">
            <div className="flex items-center justify-between gap-4">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Track sales orders, order receipts, channel breakdown, and digital menu configuration.
                </p>
                <TourButton />
            </div>

            <div data-tour="sales-digital-menu" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Digital Menu</h2>
                    <p className="text-sm text-muted-foreground">Allow customers to scan a QR code and view your menu online.</p>
                    {storefrontError && (
                        <p className="mt-1 text-xs font-medium text-danger">{storefrontError}</p>
                    )}
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 mr-4">
                        <Switch
                            id="menu-toggle"
                            checked={Boolean(storefrontStatus?.listed)}
                            disabled={isEnabling || isDisabling}
                            onCheckedChange={handleMenuToggle}
                        />
                        <Label htmlFor="menu-toggle" className="text-sm font-medium">Show Items on Website</Label>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <Link
                            href={subdomainUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Live Menu
                        </Link>
                    </div>
                </div>
            </div>

            <section
                data-tour="sales-order-stats"
                aria-label="Totals"
                className="grid grid-cols-2 gap-3 lg:grid-cols-6"
            >
                <Stat
                    label="Orders"
                    value={totals ? String(totals.orders) : "—"}
                />
                <Stat
                    label="Total Revenue"
                    value={totals ? format(totals.revenue) : "—"}
                />
                <Stat
                    label="Stock Items Sold"
                    value={format(pageItemBreakdown.stockRevenue)}
                />
                <Stat
                    label="No-Stock Items Sold"
                    value={format(pageItemBreakdown.noStockRevenue)}
                />
                <Stat label="Paid" value={totals ? String(totals.paid) : "—"} />
                <Stat
                    label="Pending"
                    value={totals ? String(totals.pending) : "—"}
                />
            </section>

            {summaryQuery.data?.truncated && (
                <p className="-mt-2 text-[13px] text-muted-foreground">
                    Totals cover the most recent orders in this range only.
                    Narrow the dates for exact figures — the table below still
                    pages through every order.
                </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div data-tour="sales-orders-filters" className="flex flex-wrap items-center gap-2 border-b border-border p-3.5 sm:p-4">
                    <label className="relative min-w-50 flex-1">
                        <span className="sr-only">Search orders</span>
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by invoice, order or item"
                            className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20"
                        />
                    </label>

                    <FilterGroup
                        label="Date range"
                        options={DATE_FILTERS}
                        value={range}
                        onChange={applyFilter(setRange)}
                    />
                    <FilterGroup
                        label="Status"
                        options={STATUS_FILTERS}
                        value={status}
                        onChange={applyFilter(setStatus)}
                    />
                    <FilterGroup
                        label="Channel"
                        options={CHANNEL_FILTERS}
                        value={channel}
                        onChange={applyFilter(setChannel)}
                    />

                    <ColumnSelector
                        columns={SALES_COLUMNS}
                        visibleColumns={visibleColumns}
                        onToggle={toggleColumn}
                    />
                </div>

                {isLoading ? (
                    <p className="p-10 text-center text-[14px] text-muted-foreground">
                        Loading orders…
                    </p>
                ) : error ? (
                    <ErrorState error={error} onRetry={() => void refetch()} />
                ) : (

                    <>
                        {rows.length === 0 ? (
                            <EmptyState searching={Boolean(search)} />
                        ) : (
                            <div
                                data-tour="sales-orders-table"
                                className="overflow-x-auto"
                                aria-busy={isFetching}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {visibleColumns.invoice && <TableHead>Invoice</TableHead>}
                                            {visibleColumns.date && <TableHead>Date</TableHead>}
                                            {visibleColumns.channel && <TableHead>Channel</TableHead>}
                                            {visibleColumns.note && <TableHead>Order</TableHead>}
                                            {visibleColumns.items && <TableHead className="text-right">Items</TableHead>}
                                            {visibleColumns.subtotal && <TableHead className="text-right">Subtotal</TableHead>}
                                            {visibleColumns.discount && <TableHead className="text-right">Discount</TableHead>}
                                            {visibleColumns.taxRate && <TableHead className="text-right">Tax Rate</TableHead>}
                                            {visibleColumns.taxAmount && <TableHead className="text-right">Tax Amount</TableHead>}
                                            {visibleColumns.total && <TableHead className="text-right">Total</TableHead>}
                                            {visibleColumns.status && <TableHead>Status</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((order) => (
                                            <OrderRow
                                                key={order.id}
                                                order={order}
                                                visibleColumns={visibleColumns}
                                                onClick={() => setSelectedOrderId(order.id)}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* The pager stays put even when a search empties the
                            page, so the way back to the rest is never hidden. */}
                        <Pager
                            page={page}
                            pageCount={pageCount}
                            pageSize={pageSize}
                            first={firstRow}
                            last={lastRow}
                            total={totalElements}
                            busy={isFetching}
                            filtered={
                                search ? orders.length - rows.length : 0
                            }
                            onPage={setPage}
                            onPageSize={(next) => {
                                setPageSize(next);
                                setPage(0);
                            }}
                        />
                    </>
                )}
            </section>

            {/* Receipt / Order Ticket Detail Modal Dialog */}
            <Dialog
                open={Boolean(selectedOrderId)}
                onOpenChange={(open) => !open && setSelectedOrderId(null)}
            >
                <DialogContent className="max-w-[480px] p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-lg font-bold text-foreground">
                            {String(displayOrder?.status || "") === "PENDING" || String(displayOrder?.status || "") === "PARKED"
                                ? "Order Ticket (Unpaid)"
                                : "Receipt Details"}
                        </DialogTitle>
                    </DialogHeader>

                    {receiptQuery.isLoading && !selectedOrder ? (
                        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                            Loading details...
                        </div>
                    ) : displayOrder && businessQuery.data ? (
                        <div className="py-2">
                            <ReceiptTicket
                                business={businessQuery.data}
                                order={displayOrder}
                                receipt={receiptQuery.data?.receipt ?? null}
                                currencies={currenciesQuery.data}
                            />
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-destructive">
                            Could not load details.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Where in the range the table is, and how to move through it.
 *
 * Page numbers stay out of it: an owner looking for a sale reaches for the
 * date filter, not page 14. Position, a step either way, and how many rows at
 * a time is the whole of what this needs to say.
 */
function Pager({
    page,
    pageCount,
    pageSize,
    first,
    last,
    total,
    busy,
    filtered,
    onPage,
    onPageSize,
}: {
    page: number;
    pageCount: number;
    pageSize: number;
    first: number;
    last: number;
    total: number;
    busy: boolean;
    /** Rows the search hid on this page, so the count is not a mystery. */
    filtered: number;
    onPage: (next: number) => void;
    onPageSize: (next: number) => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-[13px] text-muted-foreground">
                {total === 0
                    ? "No orders"
                    : `Showing ${first}–${last} of ${total}`}
                {filtered > 0
                    ? ` — ${filtered} hidden by the search on this page`
                    : ""}
            </p>

            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    Rows
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            onPageSize(Number(event.target.value))
                        }
                        className="h-8 rounded-lg border border-border bg-card px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {ORDER_PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onPage(Math.max(0, page - 1))}
                        disabled={page === 0 || busy}
                        aria-label="Previous page"
                        className="grid size-8 place-items-center rounded-lg border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <span
                        className="min-w-24 text-center text-[13px] tabular-nums text-muted-foreground"
                        aria-live="polite"
                    >
                        Page {page + 1} of {pageCount}
                    </span>
                    <button
                        type="button"
                        onClick={() => onPage(page + 1)}
                        disabled={page + 1 >= pageCount || busy}
                        aria-label="Next page"
                        className="grid size-8 place-items-center rounded-lg border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Invoice, order name and item names — what an owner would type looking for a sale. */
function matchesSearch(order: PosOrder, search: string) {
    return (
        (order.invoiceNumber ?? "").toLowerCase().includes(search) ||
        (order.note ?? "").toLowerCase().includes(search) ||
        order.items.some((item) =>
            item.itemName.toLowerCase().includes(search),
        )
    );
}

function OrderRow({
    order,
    visibleColumns,
    onClick,
}: {
    order: PosOrder;
    visibleColumns: Record<SalesColumnKey, boolean>;
    onClick: () => void;
}) {
    const { format } = useMoney();
    const itemCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    const afterDiscount = Math.max(0, order.subtotal - order.discountAmount);
    const taxAmt = order.taxAmount ?? 0;
    const isExclusive =
        order.taxInclusionType === "EXCLUSIVE" ||
        (!order.taxInclusionType &&
            taxAmt > 0 &&
            Math.abs(order.total - afterDiscount) < 0.01);

    const displayTotal = isExclusive
        ? parseFloat((afterDiscount + taxAmt).toFixed(2))
        : order.total;

    return (
        <TableRow
            onClick={onClick}
            className="cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
        >
            {visibleColumns.invoice && (
                <TableCell className="font-bold text-primary hover:underline">
                    {order.invoiceNumber ?? "—"}
                </TableCell>
            )}
            {visibleColumns.date && (
                <TableCell className="text-muted-foreground">
                    {formatOrderDate(order.createdDate)}
                </TableCell>
            )}
            {visibleColumns.channel && (
                <TableCell className="text-muted-foreground">
                    {CHANNEL_LABELS[order.channel]}
                </TableCell>
            )}
            {visibleColumns.note && (
                <TableCell className="text-muted-foreground">
                    {order.note?.trim() || "—"}
                </TableCell>
            )}
            {visibleColumns.items && (
                <TableCell className="text-right tabular-nums text-muted-foreground">
                    {itemCount}
                </TableCell>
            )}
            {visibleColumns.subtotal && (
                <TableCell className="text-right tabular-nums text-muted-foreground font-medium">
                    {format(order.subtotal, order.currency)}
                </TableCell>
            )}
            {visibleColumns.discount && (
                <TableCell className="text-right tabular-nums text-red-500 font-semibold">
                    {order.discountAmount > 0 ? `-${format(order.discountAmount, order.currency)}` : "—"}
                </TableCell>
            )}
            {visibleColumns.taxRate && (
                <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                    {order.taxRate ? `${order.taxRate}%` : "0%"}
                </TableCell>
            )}
            {visibleColumns.taxAmount && (
                <TableCell className="text-right tabular-nums text-muted-foreground">
                    {order.taxAmount ? format(order.taxAmount, order.currency) : "—"}
                </TableCell>
            )}
            {visibleColumns.total && (
                <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {format(displayTotal, order.currency)}
                </TableCell>
            )}
            {visibleColumns.status && (
                <TableCell>
                    <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLES[order.status]}`}
                    >
                        {order.status}
                    </span>
                </TableCell>
            )}
        </TableRow>
    );
}

const CHANNEL_LABELS: Record<PosOrder["channel"], string> = {
    POS: "Point of Sale",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
    WEB: "Web Store",
};

function formatOrderDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-foreground">
                {value}
            </p>
        </div>
    );
}


function FilterGroup<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: readonly T[];
    value: T;
    onChange: (next: T) => void;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-muted p-1 border border-transparent dark:border-border shrink-0"
        >
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    aria-pressed={value === option}
                    className={`rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-[13px] whitespace-nowrap shrink-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${value === option
                            ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-transparent dark:border-[#2a3042]"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {option === "ALL" ? "All" : option}
                </button>
            ))}
        </div>
    );
}

function ErrorState({
    error,
    onRetry,
}: {
    error: unknown;
    onRetry: () => void;
}) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center gap-2 px-6 py-16 text-center"
        >
            <p className="text-[15px] font-medium text-foreground">
                Could not load orders
            </p>
            <p className="max-w-80 text-[14px] text-muted-foreground">
                {getApiErrorMessage(error, "Check the connection and try again.")}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
                <RefreshCw className="size-4" aria-hidden="true" />
                Try again
            </button>
        </div>
    );
}

function EmptyState({ searching }: { searching: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-[15px] font-medium text-foreground">
                {searching ? "No matching orders" : "No orders yet"}
            </p>
            <p className="max-w-80 text-[14px] text-muted-foreground">
                {searching
                    ? "Nothing in this range matches that search. Try another term or widen the dates."
                    : "Orders appear here as soon as your first sale is completed."}
            </p>
        </div>
    );
}

function ColumnSelector({
    columns,
    visibleColumns,
    onToggle,
}: {
    columns: typeof SALES_COLUMNS;
    visibleColumns: Record<SalesColumnKey, boolean>;
    onToggle: (key: SalesColumnKey) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [open]);

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-xs"
            >
                <Columns3 className="size-4 text-muted-foreground" aria-hidden="true" />
                Columns
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl dark:shadow-[0_10px_38px_rgba(0,0,0,0.5)] animate-in fade-in-0 zoom-in-95">
                    <div className="px-2.5 py-1.5 text-xs font-bold text-muted-foreground border-b border-border/60 mb-1">
                        Show / Hide Columns
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto scrollbar-none">
                        {columns.map((col) => (
                            <label
                                key={col.key}
                                className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 cursor-pointer transition-colors select-none"
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(visibleColumns[col.key])}
                                    onChange={() => onToggle(col.key)}
                                    className="size-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                                <span>{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}