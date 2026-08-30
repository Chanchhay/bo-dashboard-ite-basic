"use client";

import { useMemo, useState } from "react";
import {
    DollarSign,
    ShoppingBag,
    Receipt,
    TrendingUp,
    PieChart as PieIcon,
    BarChart2,
    Layers,
    FolderTree,
    ArrowUpRight,
    RefreshCw,
    Download,
    Search,
    ArrowUpDown,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import { useMoney } from "@/hooks/useMoney";
import {
    useGetDailyRevenueByChannelQuery,
    useGetSalesProfitQuery,
    useGetPeriodProfitQuery,
    useGetItemProfitQuery,
} from "@/services/salesReportApi";
import { useGetReceiptsQuery } from "@/services/posOrderApi";
import { useGetCustomersQuery } from "@/services/customerApi";
import { toLocalDateTime, periodLabel, type OrderChannelCode, type ReportGranularity } from "@/lib/api/sales-report";
import type { InventoryItem, StockSummary } from "@/lib/api/inventory";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

interface OverviewDashboardProps {
    items?: InventoryItem[];
    stock?: StockSummary[];
}

// Color Palette for Channels matching system theme tokens
const CHANNEL_COLORS: Record<string, string> = {
    POS: "#d14341",       // Brand Red / Destructive
    WEB: "#2a78d6",       // Chart 1 Blue
    TELEGRAM: "#00932a",  // Brand Green / Primary
    MESSENGER: "#eda100", // Chart 4 Yellow / Warning
};

const stockChartConfig = {
    totalAmount: {
        label: "Total Revenue",
        color: "var(--primary)",
    },
    itemCount: {
        label: "Item Count",
        color: "#feb90d",
    },
} satisfies ChartConfig;

export function OverviewDashboard({ items = [], stock = [] }: OverviewDashboardProps) {
    const { format } = useMoney();
    const [now] = useState(() => new Date());
    const [granularity, setGranularity] = useState<ReportGranularity>("DAY");

    const fromDate = useMemo(() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return toLocalDateTime(d);
    }, [now]);

    const toDate = useMemo(() => toLocalDateTime(now), [now]);

    // Live backend queries
    const salesProfitQuery = useGetSalesProfitQuery({});
    const periodProfitQuery = useGetPeriodProfitQuery({ granularity });
    const itemProfitQuery = useGetItemProfitQuery({});
    const receiptsQuery = useGetReceiptsQuery({ size: 50 });
    const customersQuery = useGetCustomersQuery();

    // Aggregate Top 4 KPI Values directly from backend API response & props
    const kpiData = useMemo(() => {
        const total = salesProfitQuery.data?.total;

        // Total items count — the business's real catalog size
        const totalItemsCount = items.length;

        // Total categories count — distinct item groups actually in use
        const categoriesSet = new Set(items.map((i) => i.itemGroup?.name).filter(Boolean));
        const totalCategoriesCount = categoriesSet.size;

        // Total inventory quantity currently on hand
        const inventoryCount = stock.reduce((acc, s) => acc + (s.quantityOnHand || 0), 0);

        return {
            revenue: total?.revenue ?? 0,
            totalItem: totalItemsCount,
            totalCategory: totalCategoriesCount,
            inventory: inventoryCount,
        };
    }, [salesProfitQuery.data, items, stock]);

    // 1. Cumulative Profit: Running-Sum Accumulator Algorithm with Monotone Spline
    const cumulativeProfitData = useMemo(() => {
        const periods = periodProfitQuery.data?.periods;
        if (!periods || periods.length === 0) return [];

        // The API answers newest-first; a running total only means something
        // walking forward through time, and the chart has to draw left-to-right
        // the same way or it reads backwards.
        const chronological = [...periods].sort((a, b) => {
            if (!a.periodStart) return -1;
            if (!b.periodStart) return 1;
            return a.periodStart.localeCompare(b.periodStart);
        });

        let runningSum = 0;
        return chronological.map((p) => {
            runningSum += p.profit;
            let dateStr = p.periodStart ? periodLabel(p.periodStart, granularity) : "Date";
            dateStr = dateStr.replace(/^Week of /i, "").replace(/ \d{4}$/, "");
            return {
                date: dateStr,
                fullDate: p.periodStart ? periodLabel(p.periodStart, granularity) : "Date",
                profit: p.profit,
                cumulative: runningSum,
            };
        });
    }, [periodProfitQuery.data, granularity]);

    // 2. Percentage of Channel: Proportional Relative-Frequency Distribution Algorithm
    const channelPercentageData = useMemo(() => {
        const channels = salesProfitQuery.data?.channels;
        if (!channels || channels.length === 0) return [];

        const totalRevenue = channels.reduce((acc, c) => acc + (c.revenue || 0), 0);
        if (totalRevenue === 0) return [];

        return channels.map((c) => {
            const channelName = (c.channel || "OTHER").toUpperCase();
            const relativeFreq = (c.revenue || 0) / totalRevenue;
            const pct = Math.round(relativeFreq * 100);
            return {
                name: channelName,
                value: pct > 0 ? pct : 1,
                color: CHANNEL_COLORS[channelName] || "#64748b",
            };
        });
    }, [salesProfitQuery.data]);

    // 3. Total Amount of Item Type: 2 Metrics (Sum of item_count & Sum of total_amount)
    const itemVectorData = useMemo(() => {
        const itemsList = itemProfitQuery.data?.items;
        if (!itemsList || itemsList.length === 0) return [];

        return itemsList
            .filter((item) => item.itemId !== null)
            .slice()
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, 6)
            .map((item) => {
                const rawName = item.itemName || item.variantName || "Item";
                return {
                    name: rawName.length > 12 ? rawName.slice(0, 12) + "..." : rawName,
                    itemCount: item.quantitySold || 0,
                    totalAmount: Math.round(item.revenue || 0),
                };
            });
    }, [itemProfitQuery.data]);

    // 4. Stock Inventory: Top-K Sorting Algorithm O(N log N)
    const stockInventoryData = useMemo(() => {
        if (items.length === 0 || stock.length === 0) return [];

        const qtyMap = stock.reduce((map, entry) => {
            if (entry.itemId) {
                map.set(entry.itemId, (map.get(entry.itemId) || 0) + (entry.quantityOnHand || 0));
            }
            return map;
        }, new Map<string, number>());

        return items
            .map((i) => {
                const itemName = i.name || "Unnamed Item";
                const itemPrice = i.price ?? 0;
                const qty = qtyMap.get(i.id) || 0;
                return {
                    name: itemName.length > 12 ? itemName.slice(0, 12) + "..." : itemName,
                    totalAmount: Math.round(qty * itemPrice),
                    itemCount: qty,
                };
            })
            .filter((i) => i.itemCount > 0)
            .sort((a, b) => b.itemCount - a.itemCount) // Top-K Sorting Algorithm O(N log N)
            .slice(0, 5); // Top K items
    }, [items, stock]);

    const monthYearLabel = useMemo(() => {
        return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }, [now]);

    const [recentOrderFilter, setRecentOrderFilter] = useState("");
    const [bestSellingFilter, setBestSellingFilter] = useState("");
    const [recentOrderPage, setRecentOrderPage] = useState(1);
    const [bestSellingPage, setBestSellingPage] = useState(1);

    const ITEMS_PER_PAGE = 5;

    // Map customers by ID for real profile names & avatars
    const customerMap = useMemo(() => {
        const map = new Map<string, { name: string; avatarUrl?: string; initials: string }>();
        if (customersQuery.data) {
            for (const c of customersQuery.data) {
                const rawName = c.globalCustomer?.fullName || (c as any).fullName || (c as any).name;
                const fullName = rawName && rawName.toLowerCase() !== "customer"
                    ? rawName
                    : c.globalCustomer?.email
                        ? c.globalCustomer.email.split("@")[0]
                        : "";
                if (fullName) {
                    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "CU";
                    map.set(c.id, { name: fullName, avatarUrl: (c as any).avatarUrl || (c as any).photoUrl, initials });
                }
            }
        }
        return map;
    }, [customersQuery.data]);

    // Recent Orders Data (Real backend API order receipts)
    const recentOrders = useMemo(() => {
        const apiOrders = receiptsQuery.data?.content;

        let list: Array<{
            id: string;
            customer: string;
            avatar: string;
            avatarUrl?: string;
            product: string;
            amount: number;
            status: string;
        }> = [];

        if (apiOrders && apiOrders.length > 0) {
            list = apiOrders.map((o) => {
                const custInfo = o.customerId ? customerMap.get(o.customerId) : null;
                const customerName = custInfo?.name || "Walk-in Customer";
                const avatarInitials = custInfo?.initials || "WC";

                const firstItemName =
                    o.items && o.items.length > 0
                        ? o.items.length > 1
                            ? `${o.items[0].itemName} +${o.items.length - 1} more`
                            : o.items[0].itemName
                        : "—";

                let formattedStatus = "Processing";
                if (o.status === "PAID") formattedStatus = "Paid";
                else if (o.status === "CONFIRMED") formattedStatus = "Success";
                else if (o.status === "FAILED" || o.status === "CANCELLED") formattedStatus = "Failed";
                else if (o.status === "PENDING") formattedStatus = "Processing";

                const displayId = o.invoiceNumber ? (o.invoiceNumber.startsWith("#") ? o.invoiceNumber : `#${o.invoiceNumber}`) : `#${o.id.slice(-4)}`;

                return {
                    id: displayId,
                    customer: customerName,
                    avatar: avatarInitials,
                    avatarUrl: custInfo?.avatarUrl,
                    product: firstItemName,
                    amount: o.total || 0,
                    status: formattedStatus,
                };
            });
        }

        if (!recentOrderFilter.trim()) return list;
        const query = recentOrderFilter.toLowerCase();
        return list.filter(
            (o) =>
                o.customer.toLowerCase().includes(query) ||
                o.product.toLowerCase().includes(query) ||
                o.id.toLowerCase().includes(query) ||
                o.status.toLowerCase().includes(query)
        );
    }, [receiptsQuery.data, customerMap, recentOrderFilter]);

    const paginatedRecentOrders = useMemo(() => {
        const start = (recentOrderPage - 1) * ITEMS_PER_PAGE;
        return recentOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [recentOrders, recentOrderPage]);

    // Best Selling Products Data — real catalog items ranked by real sales revenue
    const bestSellingProducts = useMemo(() => {
        const profitByItemId = new Map<string, { revenue: number; quantitySold: number }>();
        for (const p of itemProfitQuery.data?.items ?? []) {
            if (!p.itemId) continue;
            const existing = profitByItemId.get(p.itemId);
            profitByItemId.set(p.itemId, {
                revenue: (existing?.revenue ?? 0) + (p.revenue || 0),
                quantitySold: (existing?.quantitySold ?? 0) + (p.quantitySold || 0),
            });
        }

        let result: Array<{ id: string; name: string; sales: number; sold: number; image?: string }>;

        if (items.length > 0) {
            result = items.map((item) => {
                const sold = item.id ? profitByItemId.get(item.id) : undefined;
                return {
                    id: item.id,
                    name: item.name || "Product",
                    sales: sold?.revenue ?? 0,
                    sold: sold?.quantitySold ?? 0,
                    image: item.images?.[0]?.url || item.colors?.[0]?.imageUrl || item.variants?.[0]?.imageUrl || undefined,
                };
            });
        } else {
            result = (itemProfitQuery.data?.items ?? [])
                .filter((item) => item.itemId !== null)
                .map((item) => ({
                    id: item.itemId as string,
                    name: item.itemName || item.variantName || "Product",
                    sales: item.revenue || 0,
                    sold: item.quantitySold || 0,
                }));
        }

        result = result.slice().sort((a, b) => b.sales - a.sales);

        if (!bestSellingFilter.trim()) return result;
        const query = bestSellingFilter.toLowerCase();
        return result.filter((p) => p.name.toLowerCase().includes(query));
    }, [items, itemProfitQuery.data, bestSellingFilter]);

    const paginatedBestSellingProducts = useMemo(() => {
        const start = (bestSellingPage - 1) * ITEMS_PER_PAGE;
        return bestSellingProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [bestSellingProducts, bestSellingPage]);

    return (
        <div className="flex flex-col gap-6 pb-6 animate-in fade-in duration-300">
            {/* KPI Metric Cards Row (Top 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* 1. TOTAL REVENUE */}
                <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL REVENUE
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {format(kpiData.revenue)}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-xs">
                            <DollarSign className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>

                {/* 2. TOTAL ITEM */}
                <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL ITEM
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {kpiData.totalItem.toLocaleString("en-US")}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25 shadow-xs">
                            <ShoppingBag className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>

                {/* 3. TOTAL CATEGORY */}
                <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL CATEGORY
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {kpiData.totalCategory.toLocaleString("en-US")}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-xs">
                            <FolderTree className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>

                {/* 4. INVENTORY */}
                <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                INVENTORY
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {kpiData.inventory.toLocaleString("en-US")}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25 shadow-xs">
                            <Layers className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Main 2x2 Grid Layout for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. TOP-LEFT: `trending_items` (Total Amount of Item Type — Vertical Bar Chart) */}
                <Card className="flex flex-col rounded-[24px] border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <BarChart2 className="size-6 text-[var(--primary)]" />
                                Total Amount of Item Type
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Metrics breakdown per item type</CardDescription>
                        </div>
                        <Badge variant="success-light" radius="full" className="px-3.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                            Item Comparison
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {itemProfitQuery.isError ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                                Couldn&apos;t load item sales — try refreshing.
                            </div>
                        ) : itemVectorData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No sales recorded yet for this business.
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                accessibilityLayer
                                data={itemVectorData}
                                margin={{ top: 12, right: 20, left: 0, bottom: 22 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--popover, #ffffff)",
                                        borderColor: "var(--border, #e2e8f0)",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                    }}
                                    formatter={(value: any, name: any) => [
                                        name === "Total Revenue" ? format(Number(value || 0)) : `${Number(value || 0).toLocaleString("en-US")} pcs`,
                                        name,
                                    ]}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "650" }} />
                                <Bar dataKey="totalAmount" name="Total Revenue" fill="var(--primary)" radius={5} />
                                <Bar dataKey="itemCount" name="Item Count" fill="#feb90d" radius={5} />
                            </BarChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 2. TOP-RIGHT: `profit` (Cumulative Profit — USD by Date) */}
                <Card className="flex flex-col rounded-[24px] border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="p-0 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <TrendingUp className="size-6 text-[var(--primary)]" />
                                Cumulative Profit
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">USD by Date</CardDescription>
                        </div>

                        {/* Time Range Granularity Selector */}
                        <div className="flex items-center gap-1 bg-[var(--primary)]/10 p-1 rounded-xl border border-[var(--primary)]/20 text-xs font-bold">
                            {(["DAY", "WEEK", "MONTH", "YEAR"] as const).map((g) => {
                                const labels: Record<typeof g, string> = {
                                    DAY: "Daily",
                                    WEEK: "Weekly",
                                    MONTH: "Monthly",
                                    YEAR: "Yearly",
                                };
                                const isActive = granularity === g;
                                return (
                                    <button
                                        type="button"
                                        key={g}
                                        onClick={() => setGranularity(g)}
                                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${isActive
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "text-[var(--primary)] hover:bg-[var(--primary)]/15"
                                            }`}
                                    >
                                        {labels[g]}
                                    </button>
                                );
                            })}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {periodProfitQuery.isError ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                                Couldn&apos;t load profit data — try refreshing.
                            </div>
                        ) : cumulativeProfitData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No profit data for this period yet.
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                accessibilityLayer
                                data={cumulativeProfitData}
                                margin={{ top: 15, right: 10, bottom: 0, left: 0 }}
                            >
                                <defs>
                                    <linearGradient id="chart16-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0.35}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                    <filter
                                        id="chart16-dot-glow"
                                        x="-50%"
                                        y="-50%"
                                        width="200%"
                                        height="200%"
                                    >
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                    <filter
                                        id="chart16-line-glow"
                                        x="-10%"
                                        y="-20%"
                                        width="120%"
                                        height="140%"
                                    >
                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(val) => {
                                        if (typeof val === "string") {
                                            return val.replace(/^Week of /i, "").replace(/ \d{4}$/, "");
                                        }
                                        return val;
                                    }}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                    domain={["auto", "auto"]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--popover, #ffffff)",
                                        borderColor: "var(--border, #e2e8f0)",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                    }}
                                    formatter={(value: any) => [format(Number(value || 0)), "Cumulative Profit"]}
                                />
                                <Area
                                    dataKey="cumulative"
                                    type="natural"
                                    fill="url(#chart16-fill)"
                                    stroke="var(--primary)"
                                    strokeWidth={2.5}
                                    filter="url(#chart16-line-glow)"
                                    dot={{
                                        r: 4.5,
                                        fill: "var(--primary)",
                                        strokeWidth: 2,
                                        stroke: "var(--background, #ffffff)",
                                        filter: "url(#chart16-dot-glow)",
                                    }}
                                    activeDot={{ r: 6.5, strokeWidth: 2.5, stroke: "var(--background, #ffffff)" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 3. BOTTOM-LEFT: `channels` (Percentage of Channel — Donut Chart) */}
                <Card className="flex flex-col justify-between rounded-[24px] border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-2">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <PieIcon className="size-6 text-[var(--primary)]" />
                                Percentage of Channel
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Distribution of revenue share by channel</CardDescription>
                        </div>
                        <Badge variant="success-light" radius="full" className="px-3.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                            Channel Share
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Donut Chart Container */}
                        <div className="relative flex items-center justify-center h-64 sm:h-72 w-full my-2">
                            {channelPercentageData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                    No channel revenue yet.
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={channelPercentageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ value }) => `${value}`}
                                        labelLine={{ stroke: "#64748b", strokeWidth: 1.5, opacity: 0.7 }}
                                    >
                                        {channelPercentageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--popover, #ffffff)",
                                            borderColor: "var(--border, #e2e8f0)",
                                            borderRadius: "12px",
                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                        }}
                                        formatter={(value: any, name: any) => [`${value}% share`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            )}
                        </div>

                        {/* Bottom Legend Dots for POS, MESSENGER, TELEGRAM, WEB */}
                        <div className="flex flex-wrap items-center justify-center gap-x-5.5 gap-y-2 pt-2.5 border-t border-border/40 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            {channelPercentageData.map((c) => (
                                <span key={c.name} className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                                    {c.name} ({c.value}%)
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. BOTTOM-RIGHT: `stock_inventory` (Stock Inventory — Horizontal Bar Chart) */}
                <Card className="flex flex-col rounded-[24px] border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <Layers className="size-6 text-[var(--primary)]" />
                                Stock Inventory
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Horizontal stock level & volume distribution</CardDescription>
                        </div>
                        <Badge variant="success-light" radius="full" className="px-3.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                            Inventory Metrics
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {stockInventoryData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No stock on hand yet.
                            </div>
                        ) : (
                        <ChartContainer config={stockChartConfig} className="h-full w-full">
                            <BarChart
                                accessibilityLayer
                                layout="vertical"
                                data={stockInventoryData}
                                margin={{ top: 12, right: 20, left: 10, bottom: 22 }}
                                barCategoryGap="25%"
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }} className="text-muted-foreground font-semibold" />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-foreground font-bold"
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            indicator="dot"
                                            className="min-w-40 gap-2.5 rounded-xl border border-border/80 bg-popover p-2.5 shadow-lg"
                                            formatter={(value, name) => (
                                                <div className="flex w-full items-center justify-between gap-3 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                                            style={{
                                                                backgroundColor: name === "totalAmount" || name === "Total Revenue" ? "var(--primary)" : "#feb90d",
                                                            }}
                                                        />
                                                        <span className="text-muted-foreground font-semibold">
                                                            {name === "totalAmount" || name === "Total Revenue" ? "Total Revenue" : "Item Count"}
                                                        </span>
                                                    </div>
                                                    <span className="text-foreground font-bold">
                                                        {name === "totalAmount" || name === "Total Revenue" ? format(Number(value)) : `${Number(value).toLocaleString()} pcs`}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "650" }} />
                                <Bar dataKey="totalAmount" name="Total Revenue" fill="var(--primary)" radius={[0, 5, 5, 0]} />
                                <Bar dataKey="itemCount" name="Item Count" fill="#feb90d" radius={[0, 5, 5, 0]} />
                            </BarChart>
                        </ChartContainer>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Recent Orders & Best Selling Products Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                {/* LEFT TABLE: Recent Orders */}
                <Card className="rounded-[24px] border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Recent Orders
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold">
                                <Download className="size-3.5" />
                                Export
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 flex flex-col gap-3">
                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter orders..."
                                    value={recentOrderFilter}
                                    onChange={(e) => {
                                        setRecentOrderFilter(e.target.value);
                                        setRecentOrderPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs sm:text-sm rounded-lg bg-muted/30 border-border/60 font-medium"
                                />
                            </div>

                            {/* Orders Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                                            <th className="py-2 px-2.5">ID</th>
                                            <th className="py-2 px-2.5">Customer</th>
                                            <th className="py-2 px-2.5">Product</th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Amount <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                            <th className="py-2 px-2.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {paginatedRecentOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium">
                                                    No orders yet.
                                                </td>
                                            </tr>
                                        )}
                                        {paginatedRecentOrders.map((order) => {
                                            const getStatusBadgeStyle = (status: string) => {
                                                const s = status.toLowerCase();
                                                if (s === "success" || s === "paid") {
                                                    return "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30";
                                                }
                                                if (s === "processing" || s === "pending") {
                                                    return "bg-[#feb90d]/15 text-[#9a6900] dark:text-[#feb90d] border border-[#feb90d]/35";
                                                }
                                                if (s === "failed" || s === "fail") {
                                                    return "bg-[#d14341]/15 text-[#d14341] dark:text-red-400 border border-[#d14341]/30";
                                                }
                                                return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
                                            };

                                            return (
                                                <tr key={order.id} className="h-12 hover:bg-muted/30 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono font-bold text-[var(--primary)] text-xs whitespace-nowrap">{order.id}</td>
                                                    <td className="py-2 px-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 text-foreground flex items-center justify-center text-[10px] font-black shrink-0 border border-border/50 shadow-2xs">
                                                                {order.avatarUrl ? (
                                                                    <img
                                                                        src={order.avatarUrl}
                                                                        alt={order.customer}
                                                                        className="size-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLElement).style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    order.avatar
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px] inline-block">{order.customer}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2.5 text-muted-foreground font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px]">{order.product}</td>
                                                    <td className="py-2 px-2.5 font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{format(order.amount)}</td>
                                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs transition-all ${getStatusBadgeStyle(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground font-medium">
                        <span>
                            Showing {recentOrders.length > 0 ? (recentOrderPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(recentOrderPage * ITEMS_PER_PAGE, recentOrders.length)} of {recentOrders.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.max(1, p - 1))}
                                disabled={recentOrderPage === 1}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="px-1.5 text-xs font-bold text-foreground">
                                {recentOrderPage} / {Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE))}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.min(Math.ceil(recentOrders.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={recentOrderPage >= Math.ceil(recentOrders.length / ITEMS_PER_PAGE)}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* RIGHT TABLE: Best Selling Products */}
                <Card className="h-full rounded-[24px] border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Best Selling Products
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold">
                                <Download className="size-3.5" />
                                Export
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 flex flex-col gap-3">
                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter products..."
                                    value={bestSellingFilter}
                                    onChange={(e) => {
                                        setBestSellingFilter(e.target.value);
                                        setBestSellingPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs sm:text-sm rounded-lg bg-muted/30 border-border/60 font-medium"
                                />
                            </div>

                            {/* Best Selling Products Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                                            <th className="py-2 px-2.5">Product</th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Sales <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Sold <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {paginatedBestSellingProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-muted-foreground font-medium">
                                                    No products yet.
                                                </td>
                                            </tr>
                                        )}
                                        {paginatedBestSellingProducts.map((prod, i) => (
                                            <tr key={`${prod.name}-${i}`} className="h-12 hover:bg-muted/30 transition-colors">
                                                <td className="py-2 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="size-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shrink-0 border border-border/50 shadow-2xs">
                                                            {prod.image ? (
                                                                <img
                                                                    src={prod.image}
                                                                    alt={prod.name}
                                                                    className="size-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).style.display = "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="size-full flex items-center justify-center text-[10px] bg-slate-200 dark:bg-slate-700 font-bold text-foreground">
                                                                    {prod.name.slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[180px] inline-block">{prod.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2.5 font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{format(prod.sales)}</td>
                                                <td className="py-2 px-2.5 text-muted-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">{prod.sold}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground font-medium">
                        <span>
                            Showing {bestSellingProducts.length > 0 ? (bestSellingPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(bestSellingPage * ITEMS_PER_PAGE, bestSellingProducts.length)} of {bestSellingProducts.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.max(1, p - 1))}
                                disabled={bestSellingPage === 1}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="px-1.5 text-xs font-bold text-foreground">
                                {bestSellingPage} / {Math.max(1, Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE))}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.min(Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={bestSellingPage >= Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE)}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
