import Link from "next/link";
import {
    Boxes,
    CircleCheck,
    Package,
    Plus,
    TriangleAlert,
    Warehouse,
    type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { backendRequest } from "@/lib/api/backend";
import {
    getAllInventoryItems,
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";
import type { InventoryItem, StockSummary } from "@/lib/api/inventory";

type Overview = {
    items: InventoryItem[];
    stock: StockSummary[];
    error?: string;
};

async function loadOverview(): Promise<Overview> {
    try {
        const businessId = await getInventoryBusinessId();
        const [items, stock] = await Promise.all([
            getAllInventoryItems(businessId),
            backendRequest<StockSummary[]>(
                `/api/v1/businesses/${businessId}/stock-entries/current`,
            ),
        ]);

        return { items: items ?? [], stock: stock ?? [] };
    } catch {
        // A dashboard that throws is worse than one that says it can't reach
        // the API — the rest of the shell stays usable either way.
        return {
            items: [],
            stock: [],
            error: "We couldn't reach the inventory service, so these figures are unavailable.",
        };
    }
}

function compact(value: number) {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (value >= 10_000) {
        return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return value.toLocaleString("en-US");
}

export default async function DashboardPage() {
    const { items, stock, error } = await loadOverview();

    const quantityByItem = new Map(
        stock.map((entry) => [entry.itemId, entry.quantityOnHand ?? 0]),
    );

    const activeItems = items.filter(
        (item) => item.status === "ACTIVE",
    ).length;
    const unitsInStock = stock.reduce(
        (total, entry) => total + (entry.quantityOnHand ?? 0),
        0,
    );
    const lowStock = items.filter((item) => {
        const threshold = item.lowStockDefault ?? 0;
        return threshold > 0 && (quantityByItem.get(item.id) ?? 0) <= threshold;
    }).length;

    const topStocked = items
        .map((item) => ({
            id: item.id,
            name: item.name || "Unnamed item",
            quantity: quantityByItem.get(item.id) ?? 0,
        }))
        .filter((entry) => entry.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6);

    return (
        <div className="flex flex-col gap-5 pb-4">
                {error && (
                    <p
                        role="status"
                        className="flex items-start gap-2.5 rounded-2xl border border-[#f0d9a8] bg-[#fff9ec] px-4 py-3 text-[14px] text-[#8a5f00]"
                    >
                        <TriangleAlert
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                        />
                        {error}
                    </p>
                )}

                <section
                    aria-labelledby="overview-heading"
                    className="rounded-[24px] bg-white dark:bg-[#1a1e29] border border-transparent dark:border-[#242937] p-6 lg:p-7 shadow-xs dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                    <h2
                        id="overview-heading"
                        className="text-[17px] font-semibold text-[#16181c] dark:text-[#f8fafc]"
                    >
                        Overview
                    </h2>
                    <p className="mt-1 text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
                        Live figures from your inventory.
                    </p>

                    <div className="mt-7 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat
                            icon={Package}
                            label="Items"
                            value={compact(items.length)}
                            note="In your catalog"
                        />
                        <Stat
                            icon={CircleCheck}
                            label="Active items"
                            value={compact(activeItems)}
                            note={
                                items.length > 0
                                    ? `of ${compact(items.length)} total`
                                    : "Nothing published yet"
                            }
                        />
                        <Stat
                            icon={Warehouse}
                            label="Units in stock"
                            value={compact(unitsInStock)}
                            note="Across all items"
                        />
                        <Stat
                            icon={TriangleAlert}
                            label="Low stock"
                            value={compact(lowStock)}
                            note={
                                lowStock > 0
                                    ? "At or below threshold"
                                    : "Nothing to restock"
                            }
                            alert={lowStock > 0}
                        />
                    </div>
                </section>

                <section
                    aria-labelledby="stock-heading"
                    className="rounded-[24px] bg-white dark:bg-[#1a1e29] border border-transparent dark:border-[#242937] p-6 lg:p-7 shadow-xs dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2
                                id="stock-heading"
                                className="text-[17px] font-semibold text-[#16181c] dark:text-[#f8fafc]"
                            >
                                Stock on hand
                            </h2>
                            <p className="mt-1 text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
                                Your six best-stocked items.
                            </p>
                        </div>

                        <Link
                            href="/inventory/stock"
                            className={buttonVariants({
                                variant: "outline",
                            })}
                        >
                            View all stock
                        </Link>
                    </div>

                    {topStocked.length > 0 ? (
                        <ul className="mt-7 flex flex-col gap-5">
                            {topStocked.map((entry) => (
                                <li key={entry.id}>
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="truncate text-[15px] font-medium text-[#16181c] dark:text-[#f8fafc]">
                                            {entry.name}
                                        </span>
                                        <span className="shrink-0 text-[15px] font-semibold text-[#16181c] dark:text-[#f8fafc] tabular-nums">
                                            {entry.quantity.toLocaleString(
                                                "en-US",
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2.5 w-full rounded-[4px] bg-[#eceeea] dark:bg-[#252a38]">
                                        <div
                                            className="h-full rounded-r-[4px] bg-[#00932a] dark:bg-[#10b981]"
                                            style={{
                                                width: `${Math.max(
                                                    (entry.quantity /
                                                        topStocked[0]
                                                            .quantity) *
                                                        100,
                                                    2,
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState hasItems={items.length > 0} />
                    )}
            </section>
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    note,
    alert,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    note: string;
    alert?: boolean;
}) {
    return (
        <div>
            <span
                aria-hidden="true"
                className={
                    alert
                        ? "grid size-11 place-items-center rounded-full bg-[#fff4d6] dark:bg-[#d14341]/20 text-[#8a5f00] dark:text-[#f87171]"
                        : "grid size-11 place-items-center rounded-full bg-primary/10 dark:bg-[#00932a]/20 text-primary dark:text-[#10b981]"
                }
            >
                <Icon className="size-5" />
            </span>

            <p className="mt-4 text-[14px] font-medium text-[#5c6660] dark:text-[#94a3b8]">{label}</p>
            <p className="mt-1 text-[38px] leading-none font-bold text-[#16181c] dark:text-[#f8fafc] tabular-nums">
                {value}
            </p>
            <p className="mt-2 text-[13px] text-[#8a8f89] dark:text-[#64748b]">{note}</p>
        </div>
    );
}

function EmptyState({ hasItems }: { hasItems: boolean }) {
    return (
        <div className="mt-7 rounded-2xl bg-[#f7f7f6] dark:bg-[#151821] border border-transparent dark:border-[#242937] px-6 py-10 text-center">
            <span
                aria-hidden="true"
                className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 dark:bg-[#00932a]/20 text-primary dark:text-[#10b981]"
            >
                <Boxes className="size-5" />
            </span>
            <p className="mt-4 text-[15px] font-medium text-[#16181c] dark:text-[#f8fafc]">
                {hasItems ? "No stock recorded yet" : "No items yet"}
            </p>
            <p className="mt-1 text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
                {hasItems
                    ? "Record a stock entry to see quantities here."
                    : "Create your first item to start tracking inventory."}
            </p>
            <Link
                href={hasItems ? "/inventory/stock/adjust" : "/inventory/new"}
                /* A link that acts as a button borrows the same variants. */
                className={buttonVariants({ className: "mt-5" })}
            >
                <Plus className="size-4" aria-hidden="true" />
                {hasItems ? "Record stock" : "Create item"}
            </Link>
        </div>
    );
}
