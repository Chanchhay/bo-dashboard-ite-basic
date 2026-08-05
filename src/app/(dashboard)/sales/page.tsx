"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, Search, QrCode, Store, ExternalLink } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/money";
import type { Order, OrderChannel, OrderStatus } from "@/types/pos-type";
import MenuQRModal from "@/components/menu/menu-qr-modal";

/**
 * Orders — the record of what was sold, and nothing else. Getting to other
 * pages is the sidebar's job, so this page never links sideways; every pixel
 * answers "what happened in my store".
 *
 * Not wired to an API yet. The list renders from `orders`, which stays empty
 * until `GET /businesses/{businessId}/orders` exists (see
 * api-docs/pos-backend-spec.md, Task 6) — deliberately no mock rows, so an
 * empty store and an unbuilt endpoint look the same and neither lies.
 */

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

/** Status pill colours. Paid is the only success; pending is the only wait. */
const STATUS_STYLES: Record<OrderStatus, string> = {
    PAID: "bg-success/10 text-success",
    PENDING: "bg-warning/15 text-warning",
    CANCELLED: "bg-muted text-muted-foreground",
    FAILED: "bg-danger/10 text-danger",
};

export default function SalesOrdersPage() {
    const [status, setStatus] =
        useState<(typeof STATUS_FILTERS)[number]>("ALL");
    const [channel, setChannel] =
        useState<(typeof CHANNEL_FILTERS)[number]>("ALL");
    const [range, setRange] = useState<(typeof DATE_FILTERS)[number]>("Today");
    const [query, setQuery] = useState("");
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    const orders: Order[] = [];
    const isLoading = false;

    return (
        <div className="flex flex-col gap-5 pb-4">
            {/* Business Owner Digital Menu Banner */}


            <section
                aria-label="Totals"
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
                <Stat label="Orders" value={String(orders.length)} />
                <Stat label="Revenue" value={formatCurrency(0)} />
                <Stat label="Paid" value="0" />
                <Stat label="Pending" value="0" />
            </section>

            <MenuQRModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
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
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search invoice or customer"
                            className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20"
                        />
                    </label>

                    <FilterGroup
                        label="Date range"
                        options={DATE_FILTERS}
                        value={range}
                        onChange={setRange}
                    />
                    <FilterGroup
                        label="Status"
                        options={STATUS_FILTERS}
                        value={status}
                        onChange={setStatus}
                    />
                    <FilterGroup
                        label="Channel"
                        options={CHANNEL_FILTERS}
                        value={channel}
                        onChange={setChannel}
                    />
                </div>

                {isLoading ? (
                    <p className="p-10 text-center text-[14px] text-muted-foreground">
                        Loading orders…
                    </p>
                ) : orders.length === 0 ? (
                    <EmptyState />
                ) : (
                    /* The table scrolls inside its own box so the page never
                       scrolls sideways on a narrow screen. */
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Cashier</TableHead>
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
                                {orders.map((order) => (
                                    <OrderRow key={order.id} order={order} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>
        </div>
    );
}

function OrderRow({ order }: { order: Order }) {
    const itemCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    return (
        <TableRow>
            <TableCell className="font-medium text-foreground">
                {order.invoice_number ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {formatOrderDate(order.created_at)}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {CHANNEL_LABELS[order.channel]}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {order.cashier_id ?? "—"}
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

const CHANNEL_LABELS: Record<OrderChannel, string> = {
    POS: "Point of Sale",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
    WEB: "Web Store",
};

function formatOrderDate(value: string) {
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
                            : "text-muted-foreground hover:text-foreground hover:text-foreground"
                    }`}
                >
                    {option === "ALL" ? "All" : option}
                </button>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-[15px] font-medium text-foreground">
                No orders yet
            </p>
            <p className="max-w-80 text-[14px] text-muted-foreground">
                Orders appear here as soon as your first sale is completed.
            </p>
        </div>
    );
}
