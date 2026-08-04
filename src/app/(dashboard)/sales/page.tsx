"use client";

import { useState } from "react";
import { Receipt, Search } from "lucide-react";

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
    PAID: "bg-[#e7f6ea] text-[#00701f]",
    PENDING: "bg-[#fff4d6] text-[#7a5600]",
    CANCELLED: "bg-[#f0f0ee] text-[#5c6660]",
    FAILED: "bg-[#fdeaea] text-[#a11212]",
};

export default function SalesOrdersPage() {
    const [status, setStatus] =
        useState<(typeof STATUS_FILTERS)[number]>("ALL");
    const [channel, setChannel] =
        useState<(typeof CHANNEL_FILTERS)[number]>("ALL");
    const [range, setRange] = useState<(typeof DATE_FILTERS)[number]>("Today");
    const [query, setQuery] = useState("");

    const orders: Order[] = [];
    const isLoading = false;

    return (
        <div className="flex flex-col gap-5 pb-4">
            <section
                aria-label="Totals"
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
                <Stat label="Orders" value={String(orders.length)} />
                <Stat label="Revenue" value={formatCurrency(0)} />
                <Stat label="Paid" value="0" />
                <Stat label="Pending" value="0" />
            </section>

            <section className="rounded-2xl border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1a1e29]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#e2e2de] dark:border-[#242937] p-4">
                    <label className="relative min-w-50 flex-1">
                        <span className="sr-only">Search orders</span>
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a8f89] dark:text-[#94a3b8]"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search invoice or customer"
                            className="h-10 w-full rounded-xl border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1e2330] pr-3 pl-9 text-[14px] text-[#16181c] dark:text-[#f8fafc] outline-none placeholder:text-[#8a8f89] dark:placeholder:text-[#64748b] focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20"
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
                    <p className="p-10 text-center text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
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
            <TableCell className="font-medium text-[#16181c] dark:text-[#f8fafc]">
                {order.invoice_number ?? "—"}
            </TableCell>
            <TableCell className="text-[#5c6660] dark:text-[#94a3b8]">
                {formatOrderDate(order.created_at)}
            </TableCell>
            <TableCell className="text-[#5c6660] dark:text-[#94a3b8]">
                {CHANNEL_LABELS[order.channel]}
            </TableCell>
            <TableCell className="text-[#5c6660] dark:text-[#94a3b8]">
                {order.cashier_id ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums text-[#5c6660] dark:text-[#94a3b8]">
                {itemCount}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-[#16181c] dark:text-[#f8fafc]">
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
        <div className="rounded-2xl border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-4 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <p className="text-[13px] text-[#5c6660] dark:text-[#94a3b8]">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#16181c] dark:text-[#f8fafc]">
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
            className="flex items-center gap-1 rounded-xl bg-[#f0f0ee] dark:bg-[#151821] p-1 border border-transparent dark:border-[#242937]"
        >
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    aria-pressed={value === option}
                    className={`rounded-lg px-2.5 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00932a] ${
                        value === option
                            ? "bg-white dark:bg-[#1e2330] font-medium text-[#16181c] dark:text-[#f8fafc] shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-transparent dark:border-[#2a3042]"
                            : "text-[#5c6660] dark:text-[#94a3b8] hover:text-[#16181c] dark:hover:text-[#f8fafc]"
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
            <Receipt className="size-8 text-[#c4c9c3] dark:text-[#475569]" aria-hidden="true" />
            <p className="text-[15px] font-medium text-[#16181c] dark:text-[#f8fafc]">
                No orders yet
            </p>
            <p className="max-w-80 text-[14px] text-[#5c6660] dark:text-[#94a3b8]">
                Orders appear here as soon as your first sale is completed.
            </p>
        </div>
    );
}
