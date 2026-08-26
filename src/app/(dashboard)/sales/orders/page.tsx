"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Receipt,
    RefreshCw,
    Search,
    ExternalLink,
    Clock,
    Package,
    PackageCheck,
    User,
    QrCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { useToast } from "@/components/ui/toast";
import MenuQRModal from "@/components/menu/menu-qr-modal";

import { getApiErrorMessage } from "@/lib/api-error";
import { useMoney } from "@/hooks/useMoney";
import type { PosOrder } from "@/lib/api/pos-order";
import { DEFAULT_PAGE_SIZE, ORDER_PAGE_SIZES } from "@/lib/api/pos-order";
import { usePendingOfflineOrders } from "@/lib/offline-orders";
import { itemThumbnail } from "@/lib/api/inventory";
import {
    useApprovePayLaterOrderMutation,
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
import { useGetCustomersQuery } from "@/services/customerApi";
import { useGetInventoryItemOptionsQuery } from "@/services/inventoryApi";


const STATUS_FILTERS = [
    "ALL",
    "PENDING",
    "CONFIRMED",
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

const STATUS_STYLES: Record<PosOrder["status"], string> = {
    PAID: "bg-success/10 text-success",
    PENDING: "bg-warning/15 text-warning",
    CONFIRMED: "bg-primary/10 text-primary",
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


export default function SalesOrdersDraftPage() {
    const { format } = useMoney();
    const { toast } = useToast();
    const [approvePayLaterOrder] = useApprovePayLaterOrderMutation();
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

    async function handleApprovePayLaterOrder(order: PosOrder) {
        setConfirmingOrderId(order.id);
        try {
            await approvePayLaterOrder(order.id).unwrap();
            toast({
                tone: "success",
                title: "Order approved",
                description: `${order.invoiceNumber ?? "This order"}'s stock has been taken off the shelf.`,
            });
        } catch (cause) {
            toast({
                tone: "error",
                title: "Could not approve the order",
                description: getApiErrorMessage(cause, "Please try again."),
            });
        } finally {
            setConfirmingOrderId(null);
        }
    }

    const [status, setStatus] =
        useState<(typeof STATUS_FILTERS)[number]>("ALL");
    const [channel, setChannel] =
        useState<(typeof CHANNEL_FILTERS)[number]>("ALL");
    const [range, setRange] = useState<DateFilter>("Today");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const businessQuery = useGetBusinessProfileQuery();
    const currenciesQuery = useGetBusinessCurrenciesQuery();


    const itemOptionsQuery = useGetInventoryItemOptionsQuery();
    const itemThumbnailById = useMemo(() => {
        const map = new Map<string, string | undefined>();
        for (const item of itemOptionsQuery.data ?? []) {
            map.set(item.id, itemThumbnail(item));
        }
        return map;
    }, [itemOptionsQuery.data]);


    const { data: customers = [] } = useGetCustomersQuery();
    const customerNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const customer of customers) {
            const name = customer.globalCustomer?.fullName;
            if (name) map.set(customer.id, name);
        }
        return map;
    }, [customers]);

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
    const pendingOfflineOrders = usePendingOfflineOrders();

    // Cached on the filters alone, so turning a page never recounts the range.
    const summaryQuery = useGetOrderSummaryQuery({ status, channel, from });

    const orders = useMemo(() => {
        const serverOrders = data?.content ?? [];
        const pendingIds = new Set(pendingOfflineOrders.map((o: PosOrder) => o.id));
        const filteredServer = serverOrders.filter((o: PosOrder) => !pendingIds.has(o.id));
        return [...pendingOfflineOrders, ...filteredServer];
    }, [data, pendingOfflineOrders]);
    const totals = summaryQuery.data?.totals;
    const metadata = data?.page;

    // Only a PAID order has a receipt — the backend rejects anything else
    // with a 409, so an order still awaiting payment renders straight from
    // the row data it already has instead of asking for one.
    const selectedOrder = useMemo(
        () => orders.find((order) => order.id === selectedOrderId) ?? null,
        [orders, selectedOrderId],
    );
    const isPaid = selectedOrder?.status === "PAID";
    const receiptQuery = useGetReceiptQuery(selectedOrderId ?? "", {
        skip: selectedOrderId === null || !isPaid,
    });

    const matchingReceipt =
        isPaid && receiptQuery.data?.order?.id === selectedOrderId
            ? receiptQuery.data
            : null;
    const displayOrder = matchingReceipt?.order ?? selectedOrder;
    const isUnpaid = !displayOrder || displayOrder.status !== "PAID";

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
        <div className="flex flex-col gap-5 pb-12 sm:pb-16">
            <div className="sticky top-0 z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-3.5 bg-shell/95 backdrop-blur-md transition-all flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card rounded-2xl border border-border p-4 shadow-sm">
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsQrModalOpen(true)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
                            >
                                <QrCode className="h-4 w-4 text-primary" />
                                <span>QR Code</span>
                            </Button>
                            <Link
                                href={subdomainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Live Menu
                            </Link>
                        </div>
                    </div>
                </div>

                <section
                    aria-label="Totals"
                    className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                >
                    <Stat
                        label="Orders"
                        value={totals ? String(totals.orders) : "—"}
                    />
                    <Stat
                        label="Revenue"
                        value={totals ? format(totals.revenue) : "—"}
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
            </div>

            <section className="relative rounded-2xl border border-border bg-card shadow-xs">
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border p-3.5 sm:p-4 bg-card rounded-t-2xl shadow-xs">
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
                            placeholder="Search this page by invoice, order name or item"
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
                </div>

                {isLoading ? (
                    <CardListSkeleton count={4} />
                ) : error ? (
                    <ErrorState error={error} onRetry={() => void refetch()} />
                ) : (

                    <div>
                        {rows.length === 0 ? (
                            <EmptyState searching={Boolean(search)} />
                        ) : (
                            <div
                                className="flex flex-col gap-3 p-3.5 sm:p-4"
                                aria-busy={isFetching}
                            >
                                {rows.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onClick={() => setSelectedOrderId(order.id)}
                                        itemThumbnailById={itemThumbnailById}
                                        customerNameById={customerNameById}
                                        onApprovePayLater={() => void handleApprovePayLaterOrder(order)}
                                        isConfirming={confirmingOrderId === order.id}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="border-t border-border bg-card rounded-b-2xl">
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
                        </div>
                    </div>
                )}
            </section>

            {/* Order Detail Modal Dialog */}
            <Dialog
                open={Boolean(selectedOrderId)}
                onOpenChange={(open) => !open && setSelectedOrderId(null)}
            >
                <DialogContent className="max-w-[480px] p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-lg font-bold text-foreground">
                            {isUnpaid
                                ? "Order Ticket (Unpaid)"
                                : "Receipt Details"}
                        </DialogTitle>
                    </DialogHeader>

                    {isPaid && receiptQuery.isLoading && !matchingReceipt ? (
                        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                            Loading details...
                        </div>
                    ) : displayOrder && businessQuery.data ? (
                        <div className="py-2">
                            <ReceiptTicket
                                business={businessQuery.data}
                                order={displayOrder}
                                receipt={matchingReceipt?.receipt ?? null}
                                currencies={currenciesQuery.data}
                            />
                        </div>
                    ) : businessQuery.isLoading || currenciesQuery.isLoading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                            Loading details...
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-destructive">
                            Could not load details.
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Digital Menu QR Code Modal */}
            <MenuQRModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                menuUrl={subdomainUrl}
            />
        </div>
    );
}


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


function matchesSearch(order: PosOrder, search: string) {
    return (
        (order.invoiceNumber ?? "").toLowerCase().includes(search) ||
        (order.note ?? "").toLowerCase().includes(search) ||
        order.items.some((item) =>
            item.itemName.toLowerCase().includes(search),
        )
    );
}


function ItemThumbnail({
    url,
    size = "size-7",
    iconSize = "size-3.5",
}: {
    url?: string;
    size?: string;
    iconSize?: string;
}) {
    return (
        <span
            className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground`}
        >
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
            ) : (
                <Package className={iconSize} aria-hidden="true" />
            )}
        </span>
    );
}


function OrderCard({
    order,
    onClick,
    itemThumbnailById,
    customerNameById,
    onApprovePayLater,
    isConfirming,
}: {
    order: PosOrder;
    onClick: () => void;
    itemThumbnailById: Map<string, string | undefined>;
    customerNameById: Map<string, string>;
    onApprovePayLater: () => void;
    isConfirming: boolean;
}) {
    const { format } = useMoney();

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

    // Recorded the moment the customer orders — status alone can bury that
    // among cards that already settled, so it also gets a tinted card.
    const isAwaitingPayment =
        order.status === "PENDING" ||
        order.status === "CONFIRMED" ||
        (order.status === "PAID" && order.paymentMethod === "PAY_LATER");

    return (
        <div
            onClick={onClick}
            className={`flex cursor-pointer flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 ${isAwaitingPayment ? "bg-warning/5 dark:bg-warning/10" : ""
                }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-primary">
                            {order.invoiceNumber ?? "—"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                            {formatOrderDate(order.createdDate)} · {CHANNEL_LABELS[order.channel]}
                        </span>
                    </div>
                    {order.customerId && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-foreground">
                            <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            {customerNameById.get(order.customerId) ?? "Customer"}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {order.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-semibold text-primary">
                            <PackageCheck className="size-3" aria-hidden="true" />
                            Confirmed
                        </span>
                    ) : isAwaitingPayment ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-[12px] font-semibold text-warning">
                            <Clock className="size-3" aria-hidden="true" />
                            Pending
                        </span>
                    ) : (
                        <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLES[order.status]}`}
                        >
                            {order.status}
                        </span>
                    )}
                    <span className="text-lg font-bold tabular-nums text-foreground">
                        {format(displayTotal, order.currency)}
                    </span>
                </div>
            </div>

            <LineItemListPanel order={order} itemThumbnailById={itemThumbnailById} />

            {order.status === "PENDING" && order.awaitingPayLaterApproval && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        Customer chose to pay later — approving takes stock off the shelf now.
                    </p>
                    <button
                        type="button"
                        onClick={(event) => {
                            // The card underneath opens the receipt dialog —
                            // this is a different action entirely.
                            event.stopPropagation();
                            onApprovePayLater();
                        }}
                        disabled={isConfirming}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                        <PackageCheck className="size-3.5" aria-hidden="true" />
                        {isConfirming ? "Approving…" : "Approve order"}
                    </button>
                </div>
            )}
        </div>
    );
}

/** Every line on an order: thumbnail, name/variant, quantity, unit price and line total. */
function LineItemListPanel({
    order,
    itemThumbnailById,
}: {
    order: PosOrder;
    itemThumbnailById: Map<string, string | undefined>;
}) {
    const { format } = useMoney();

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                        Line Item List
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Review products, quantity, and personalization details.
                    </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-foreground">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="divide-y divide-border">
                {order.items.map((item) => {
                    const subtitle = lineItemSubtitle(item);
                    return (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <ItemThumbnail
                                url={itemThumbnailById.get(item.itemId)}
                                size="size-10"
                                iconSize="size-4"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {item.itemName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {subtitle || "—"}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                                x{item.quantity}
                            </span>
                            <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                                {format(item.unitPrice, order.currency)}
                            </span>
                            <div className="w-20 shrink-0 text-right">
                                <p className="text-sm font-bold tabular-nums text-foreground">
                                    {format(item.lineTotal, order.currency)}
                                </p>
                                {item.discountAmount > 0 && (
                                    <p className="text-xs tabular-nums text-red-500">
                                        -{format(item.discountAmount, order.currency)}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const CHANNEL_LABELS: Record<PosOrder["channel"], string> = {
    POS: "Point of Sale",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
    WEB: "Web Store",
};

/** "Sugar Level: 50% / Grey / S" — everything that says how a line was made or chosen. */
function lineItemSubtitle(item: PosOrder["items"][number]) {
    const parts = [
        item.variantName,
        ...(item.selections || []).map((selection) => selection.label),
    ].filter(Boolean);

    return parts.join(" / ");
}


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

