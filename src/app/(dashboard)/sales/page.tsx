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
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
} from "@/services/posOrderApi";
import {
    useGetBusinessProfileQuery,
    useGetStorefrontStatusQuery,
    useEnableStorefrontMutation,
    useDisableStorefrontMutation,
} from "@/services/businessApi";


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
        <div className="flex flex-col gap-5 pb-4">
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

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3.5 sm:p-4">
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
                                className="overflow-x-auto"
                                aria-busy={isFetching}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Channel</TableHead>
                                            <TableHead>Order</TableHead>
                                            <TableHead className="text-right">
                                                Items
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Total
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((order) => (
                                            <OrderRow
                                                key={order.id}
                                                order={order}
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

function OrderRow({ order }: { order: PosOrder }) {
    const { format } = useMoney();
    const itemCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    return (
        <TableRow>
            <TableCell className="font-medium text-foreground">
                {order.invoiceNumber ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {formatOrderDate(order.createdDate)}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {CHANNEL_LABELS[order.channel]}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {order.note?.trim() || "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
                {itemCount}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-foreground">
                {format(order.total, order.currency)}
            </TableCell>
            <TableCell>
                <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLES[order.status]}`}
                >
                    {order.status}
                </span>
            </TableCell>
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