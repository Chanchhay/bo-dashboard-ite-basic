"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
    DollarSign,
    ShoppingBag,
    Layers,
    FolderTree,
    Download,
    Search,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useMoney } from "@/hooks/useMoney";
import {
    useGetBestSellingQuery,
    useGetDashboardOverviewQuery,
    useGetRecentOrdersQuery,
    useLazyGetBestSellingQuery,
    useLazyGetRecentOrdersQuery,
} from "@/services/dashboardApi";
import type { ReportGranularity } from "@/lib/api/sales-report";
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
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ChartCardSkeleton } from "@/components/dashboard/charts/ChartCardSkeleton";

/*
 * The three charting cards are fetched only once the dashboard is on screen.
 *
 * Recharts is by far the heaviest thing this page pulls in, and none of it is
 * needed to paint the figures above the charts or the tables below them. Held
 * back like this, the numbers land first and the charts fill in behind them —
 * rather than everything waiting on the chart library to parse.
 *
 * `ssr: false` because these render nothing meaningful on the server anyway:
 * they size themselves against a real viewport.
 */
const ChannelDonutCard = dynamic(
    () => import("@/components/dashboard/charts/ChannelDonutCard").then((mod) => mod.ChannelDonutCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-4" /> },
);

const CumulativeProfitCard = dynamic(
    () => import("@/components/dashboard/charts/CumulativeProfitCard").then((mod) => mod.CumulativeProfitCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-8" /> },
);

const ItemTypeBarCard = dynamic(
    () => import("@/components/dashboard/charts/ItemTypeBarCard").then((mod) => mod.ItemTypeBarCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-7" /> },
);

// Color Palette for Channels matching system theme tokens
const CHANNEL_COLORS: Record<string, string> = {
    POS: "#00932a",       // Green (swapped with Telegram)
    WEB: "#eda100",       // Yellow (swapped with Messenger)
    TELEGRAM: "#d14341",  // Red (swapped with POS)
    MESSENGER: "#2a78d6", // Blue (swapped with Web)
};
export function OverviewDashboard() {
    const { format } = useMoney();
    const [granularity, setGranularity] = useState<ReportGranularity>("DAY");

    const [recentOrderFilter, setRecentOrderFilter] = useState("");
    const [bestSellingFilter, setBestSellingFilter] = useState("");
    const [recentOrderPage, setRecentOrderPage] = useState(1);
    const [bestSellingPage, setBestSellingPage] = useState(1);

    const ITEMS_PER_PAGE = 5;
    /** One page big enough to hold a CSV export of everything matching. */
    const EXPORT_PAGE_SIZE = 1000;

    /*
     * Three reads, and nothing derived from them here.
     *
     * This screen used to fetch four reports plus the entire catalogue — up
     * to ten thousand items — and then total, rank, accumulate and join them
     * in the browser on every render. Most of that arithmetic needed the whole
     * set to be right: a running total, a share of revenue, a ranking, a bar
     * scaled to the largest row. The server has the whole set; a page does not.
     */
    const overviewQuery = useGetDashboardOverviewQuery({ granularity });
    const overview = overviewQuery.data;

    // Searching and paging are the server's too, so a search reaches rows
    // this page does not hold.
    const recentOrdersQuery = useGetRecentOrdersQuery({
        search: recentOrderFilter.trim() || undefined,
        page: recentOrderPage - 1,
        size: ITEMS_PER_PAGE,
    });

    const bestSellingQuery = useGetBestSellingQuery({
        search: bestSellingFilter.trim() || undefined,
        page: bestSellingPage - 1,
        size: ITEMS_PER_PAGE,
    });

    const kpiData = {
        revenue: overview?.kpis.revenue ?? 0,
        totalItem: overview?.kpis.totalItems ?? 0,
        totalCategory: overview?.kpis.totalCategories ?? 0,
        inventory: overview?.kpis.inventoryOnHand ?? 0,
    };

    // The only thing still worked out here is which colour a channel is drawn
    // in, which belongs to the theme rather than to the data.
    const channelPercentageData = useMemo(
        () =>
            (overview?.channels ?? []).map((channel) => ({
                name: channel.channel,
                value: channel.percentage,
                revenue: channel.revenue,
                color: CHANNEL_COLORS[channel.channel] || "#64748b",
            })),
        [overview?.channels],
    );

    const cumulativeProfitData = overview?.profitTrend.points ?? [];
    const itemVectorData = overview?.topItems ?? [];
    const stockInventoryData = overview?.stockLevels ?? [];

    const monthYearLabel = useMemo(
        () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        [],
    );

    const paginatedRecentOrders = recentOrdersQuery.data?.content ?? [];
    const recentOrderTotalPages = recentOrdersQuery.data?.totalPages ?? 0;
    const recentOrderTotal = recentOrdersQuery.data?.totalElements ?? 0;

    const [fetchAllRecentOrders] = useLazyGetRecentOrdersQuery();
    const [fetchAllBestSelling] = useLazyGetBestSellingQuery();

    const paginatedBestSellingProducts = bestSellingQuery.data?.content ?? [];
    const bestSellingTotalPages = bestSellingQuery.data?.totalPages ?? 0;
    const bestSellingTotal = bestSellingQuery.data?.totalElements ?? 0;


    /*
     * Export takes every row the current search matches, not the five on
     * screen. The table itself reads a page at a time, so the rest is fetched
     * here, on the click — the one moment anybody wants it.
     */
    const handleExportRecentOrders = async () => {
        const all = await fetchAllRecentOrders({
            search: recentOrderFilter.trim() || undefined,
            page: 0,
            size: EXPORT_PAGE_SIZE,
        }).unwrap();

        const headers = ["Order ID", "Customer", "Product", "Category", "Amount ($)", "Status"];
        const rows = all.content.map((o) => [
            o.reference,
            o.customerName,
            o.product,
            o.category,
            o.amount,
            o.status,
        ]);

        const csvContent = [
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const str = String(cell ?? "");
                        return `"${str.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "recent-orders.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportBestSelling = async () => {
        const all = await fetchAllBestSelling({
            search: bestSellingFilter.trim() || undefined,
            page: 0,
            size: EXPORT_PAGE_SIZE,
        }).unwrap();

        const headers = ["Product", "Category", "Total Sales ($)", "Units Sold"];
        const rows = all.content.map((p) => [p.name, p.category, p.sales, p.sold]);

        const csvContent = [
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const str = String(cell ?? "");
                        return `"${str.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "best-selling-products.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isDashboardLoading = overviewQuery.isLoading;

    if (isDashboardLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div data-tour="dashboard-overview" className="flex flex-col gap-6 pb-6 animate-in fade-in duration-300">
            {/* KPI Metric Cards Row (Top 3) */}
            <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. TOTAL REVENUE */}
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
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
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
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
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
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
            </div>

            {/* Main Grid Layout for Charts (Top: 6/6 split, Bottom: 4/8 split) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. TOP-LEFT: `channels` (Percentage of Channel — Donut Chart) */}
                <ChannelDonutCard data={channelPercentageData} />

                {/* 2. TOP-RIGHT: `profit` (Cumulative Profit — USD by Date) */}
                <CumulativeProfitCard
                    data={cumulativeProfitData}
                    granularity={granularity}
                    onGranularityChange={setGranularity}
                    isError={overviewQuery.isError}
                />

                {/* 3. BOTTOM-LEFT: `trending_items` (Total Amount of Item Type — Vertical Bar Chart) */}
                <ItemTypeBarCard data={itemVectorData} isError={overviewQuery.isError} />

                {/* 4. BOTTOM-RIGHT: `stock_inventory` (Stock Inventory — Horizontal Bar Chart) */}
                <Card data-tour="dashboard-stock-on-hand" className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-5">
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
                            <div className="flex flex-col justify-between h-full pt-1 pb-1">
                                <div className="space-y-2">
                                    {stockInventoryData.map((item) => {
                                        // Floored at 3% so a real but tiny row is still a visible bar.
                                        const revPct = Math.min(100, Math.max(3, item.revenuePercent));
                                        const countPct = Math.min(100, Math.max(3, item.countPercent));
                                        return (
                                            <div key={item.name} className="relative group flex flex-col gap-1.5 p-1.5 px-2.5 rounded-xl transition-all duration-200 hover:bg-muted/40 cursor-pointer">
                                                {/* Hover Tooltip (Picture 2 format) */}
                                                <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 hidden -translate-x-1/2 group-hover:flex flex-col gap-2 rounded-xl border border-border/80 bg-popover p-3 shadow-xl backdrop-blur-xs min-w-48 text-xs">
                                                    <div className="font-bold text-foreground pb-1.5 border-b border-border/40 text-sm">{item.name}</div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                                                            <span className="size-2.5 rounded-xs bg-[var(--primary)] shrink-0" />
                                                            Total Revenue
                                                        </div>
                                                        <span className="font-bold text-foreground">{format(item.totalAmount)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                                                            <span className="size-2.5 rounded-xs bg-[#feb90d] shrink-0" />
                                                            Item Count
                                                        </div>
                                                        <span className="font-bold text-foreground">{item.quantityOnHand.toLocaleString()} pcs</span>
                                                    </div>
                                                </div>

                                                {/* Text Directly Above Bar (Product Name Only) */}
                                                <div className="flex items-center text-xs sm:text-sm font-bold text-foreground">
                                                    <span className="truncate">{item.name}</span>
                                                </div>

                                                {/* Horizontal Bars */}
                                                <div className="space-y-1">
                                                    <div className="h-2 w-full">
                                                        <div
                                                            className="h-full rounded-full bg-[var(--primary)] transition-all duration-500 group-hover:brightness-110 shadow-2xs"
                                                            style={{ width: `${revPct}%` }}
                                                        />
                                                    </div>
                                                    <div className="h-2 w-full">
                                                        <div
                                                            className="h-full rounded-full bg-[#feb90d] transition-all duration-500 group-hover:brightness-110 shadow-2xs"
                                                            style={{ width: `${countPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Polished Bottom Legend Pill Badges */}
                                <div className="flex items-center justify-center gap-3 pt-3 pb-1 mt-2 text-xs font-bold">
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/60 text-foreground font-semibold shadow-2xs">
                                        <span className="size-2.5 rounded-full bg-[var(--primary)] shrink-0" />
                                        Total Revenue
                                    </span>
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/60 text-foreground font-semibold shadow-2xs">
                                        <span className="size-2.5 rounded-full bg-[#feb90d] shrink-0" />
                                        Item Count
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Recent Orders & Best Selling Products Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* LEFT TABLE: Recent Orders */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between lg:col-span-7">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Recent Orders
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={handleExportRecentOrders} className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold cursor-pointer">
                                <Download className="size-3.5 text-primary" />
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
                                                <tr key={order.reference} className="h-12 hover:bg-muted/30 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono font-bold text-[var(--primary)] text-xs whitespace-nowrap">{order.reference}</td>
                                                    <td className="py-2 px-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 text-foreground flex items-center justify-center text-[10px] font-black shrink-0 border border-border/50 shadow-2xs">
                                                                {order.customerAvatarUrl ? (
                                                                    <img
                                                                        src={order.customerAvatarUrl}
                                                                        alt={order.customerName}
                                                                        className="size-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    order.customerInitials
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px] inline-block">{order.customerName}</span>
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
                            Showing {recentOrderTotal > 0 ? (recentOrderPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(recentOrderPage * ITEMS_PER_PAGE, recentOrderTotal)} of {recentOrderTotal}
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
                                {recentOrderPage} / {Math.max(1, recentOrderTotalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.min(Math.max(1, recentOrderTotalPages), p + 1))}
                                disabled={recentOrderPage >= recentOrderTotalPages}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* RIGHT TABLE: Best Selling Products */}
                <Card className="h-full rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between lg:col-span-5">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Best Selling Products
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={handleExportBestSelling} className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold cursor-pointer">
                                <Download className="size-3.5 text-primary" />
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
                                                            {prod.imageUrl ? (
                                                                <img
                                                                    src={prod.imageUrl}
                                                                    alt={prod.name}
                                                                    className="size-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
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
                            Showing {bestSellingTotal > 0 ? (bestSellingPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(bestSellingPage * ITEMS_PER_PAGE, bestSellingTotal)} of {bestSellingTotal}
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
                                {bestSellingPage} / {Math.max(1, bestSellingTotalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.min(Math.max(1, bestSellingTotalPages), p + 1))}
                                disabled={bestSellingPage >= bestSellingTotalPages}
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
