"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Receipt,
    RefreshCw,
    Search,
    QrCode,
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
import { formatCurrency } from "@/lib/money";
import type { PosOrder } from "@/lib/api/pos-order";
import { useGetOrderHistoryQuery } from "@/services/posOrderApi";
import {
    useGetBusinessProfileQuery,
    useGetStorefrontStatusQuery,
    useEnableStorefrontMutation,
    useDisableStorefrontMutation,
} from "@/services/businessApi";
import MenuQRModal from "@/components/menu/menu-qr-modal";


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

const ROWS_PER_PAGE = 50;

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
    const [status, setStatus] =
        useState<(typeof STATUS_FILTERS)[number]>("ALL");
    const [channel, setChannel] =
        useState<(typeof CHANNEL_FILTERS)[number]>("ALL");
    const [range, setRange] = useState<DateFilter>("Today");
    const [query, setQuery] = useState("");
    const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

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
            setStorefrontError(getApiErrorMessage(err));
        }
    };

    const subdomainUrl = businessProfile?.slug 
        ? `https://${businessProfile.slug}.fluxibiz.store` 
        : "#";

    const { data, error, isLoading, isFetching, refetch } =
        useGetOrderHistoryQuery({ status, channel, from });

    const orders = useMemo(() => data?.content ?? [], [data]);
    const totals = data?.totals;

    const search = query.trim().toLowerCase();
    const matches = useMemo(
        () =>
            search
                ? orders.filter((order) => matchesSearch(order, search))
                : orders,
        [orders, search],
    );

    const rows = matches.slice(0, visibleRows);

    /** Any filter change starts the list from the top again. */
    function applyFilter<T>(set: (next: T) => void) {
        return (next: T) => {
            set(next);
            setVisibleRows(ROWS_PER_PAGE);
        };
    }

    return (
        <div className="flex flex-col gap-5 pb-4">
            {/* Business Owner Digital Menu Banner */}
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
                        <Label htmlFor="menu-toggle" className="text-sm font-medium">Enable Menu</Label>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsQRModalOpen(true)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-white border border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 transition-colors"
                        >
                            <QrCode className="h-4 w-4 text-[#00a651]" />
                            QR Code
                        </button>
                        <Link
                            href={subdomainUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-[#00a651] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#008f45] transition-colors"
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
                    value={totals ? formatCurrency(totals.revenue) : "—"}
                />
                <Stat label="Paid" value={totals ? String(totals.paid) : "—"} />
                <Stat
                    label="Pending"
                    value={totals ? String(totals.pending) : "—"}
                />
            </section>

            <MenuQRModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                menuUrl={subdomainUrl !== "#" ? subdomainUrl : undefined}
            />

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
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setVisibleRows(ROWS_PER_PAGE);
                            }}
                            placeholder="Search invoice, order name or item"
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
                ) : matches.length === 0 ? (
                    <EmptyState searching={Boolean(search)} />
                ) : (
                  
                    <>
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

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
                            <p className="text-[13px] text-muted-foreground">
                                Showing {rows.length} of {matches.length}
                                {data?.truncated
                                    ? " — the most recent orders in this range. Narrow the dates to see the rest."
                                    : ""}
                            </p>
                            {rows.length < matches.length && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setVisibleRows(
                                            (shown) => shown + ROWS_PER_PAGE,
                                        )
                                    }
                                    className="rounded-xl border border-border px-3 py-1.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    Show more
                                </button>
                            )}
                        </div>
                    </>
                )}
            </section>
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
                {formatCurrency(order.total)}
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

/**
 * Segmented rather than a dropdown: there are few enough options that showing
 * them costs less than a click, and the current filter stays readable.
 */
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
                    className={`rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-[13px] whitespace-nowrap shrink-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                        value === option
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