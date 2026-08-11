"use client";

import { useMemo, useState } from "react";
import {
    BarChart3,
    TrendingUp,
    ShoppingBag,
    Store,
    Smartphone,
    Globe,
    ArrowUpRight,
} from "lucide-react";

interface ChannelSalesPoint {
    date: string;
    pos: number;
    online: number;
    mobile: number;
    marketplace: number;
}

// Mock Sales Performance Data by Channel over time
const MOCK_SALES_7D: ChannelSalesPoint[] = [
    { date: "Mon", pos: 1200, online: 950, mobile: 640, marketplace: 420 },
    { date: "Tue", pos: 1450, online: 1100, mobile: 720, marketplace: 510 },
    { date: "Wed", pos: 1100, online: 1250, mobile: 810, marketplace: 480 },
    { date: "Thu", pos: 1650, online: 1400, mobile: 930, marketplace: 610 },
    { date: "Fri", pos: 2100, online: 1850, mobile: 1240, marketplace: 890 },
    { date: "Sat", pos: 2450, online: 2100, mobile: 1450, marketplace: 1050 },
    { date: "Sun", pos: 1950, online: 1750, mobile: 1180, marketplace: 820 },
];

const MOCK_SALES_30D: ChannelSalesPoint[] = [
    { date: "Week 1", pos: 8400, online: 6900, mobile: 4500, marketplace: 3100 },
    { date: "Week 2", pos: 9200, online: 7400, mobile: 5100, marketplace: 3600 },
    { date: "Week 3", pos: 10100, online: 8800, mobile: 6200, marketplace: 4200 },
    { date: "Week 4", pos: 11800, online: 9600, mobile: 6800, marketplace: 4900 },
];

const CHANNELS_CONFIG = [
    {
        key: "pos" as const,
        label: "Point of Sale (POS)",
        color: "bg-primary text-primary",
        icon: Store,
    },
    {
        key: "online" as const,
        label: "Online Store",
        color: "bg-blue-500 text-blue-500",
        icon: Globe,
    },
    {
        key: "mobile" as const,
        label: "Mobile App",
        color: "bg-purple-500 text-purple-500",
        icon: Smartphone,
    },
    {
        key: "marketplace" as const,
        label: "Marketplace",
        color: "bg-amber-500 text-amber-500",
        icon: ShoppingBag,
    },
];

export function SalesChannelsChart() {
    const [timeRange, setTimeRange] = useState<"7D" | "30D">("7D");
    const [hoveredPoint, setHoveredPoint] = useState<ChannelSalesPoint | null>(null);

    const data = timeRange === "7D" ? MOCK_SALES_7D : MOCK_SALES_30D;

    // Calculate aggregated totals
    const totals = useMemo(() => {
        return data.reduce(
            (acc, curr) => ({
                pos: acc.pos + curr.pos,
                online: acc.online + curr.online,
                mobile: acc.mobile + curr.mobile,
                marketplace: acc.marketplace + curr.marketplace,
                grandTotal:
                    acc.grandTotal + curr.pos + curr.online + curr.mobile + curr.marketplace,
            }),
            { pos: 0, online: 0, mobile: 0, marketplace: 0, grandTotal: 0 }
        );
    }, [data]);

    // Maximum value for SVG chart scaling
    const maxBarVal = useMemo(() => {
        return Math.max(
            ...data.map((d) => Math.max(d.pos, d.online, d.mobile, d.marketplace))
        );
    }, [data]);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                            <BarChart3 className="size-4" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            Sales Channel Performance
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Sales volume comparison across active sales channels
                    </p>
                </div>

                {/* Time Range Filter Buttons */}
                <div className="inline-flex items-center rounded-xl border border-border bg-muted/30 p-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setTimeRange("7D")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            timeRange === "7D"
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeRange("30D")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            timeRange === "30D"
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Last 30 Days
                    </button>
                </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {CHANNELS_CONFIG.map((channel) => {
                    const totalVal = totals[channel.key];
                    const percent =
                        totals.grandTotal > 0
                            ? Math.round((totalVal / totals.grandTotal) * 100)
                            : 0;

                    return (
                        <div
                            key={channel.key}
                            className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2 transition-all hover:bg-muted/40"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground truncate">
                                    {channel.label}
                                </span>
                                <span className={`size-2.5 rounded-full ${channel.color.split(" ")[0]}`} />
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-base sm:text-lg font-extrabold text-foreground">
                                    ${totalVal.toLocaleString()}
                                </span>
                                <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                                    <ArrowUpRight className="size-3" />
                                    {percent}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Visual Bar Chart (Shadcn c-chart-14 style) */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                    <span>Channel Comparison Graph</span>
                    <span>Total Volume: ${totals.grandTotal.toLocaleString()}</span>
                </div>

                {/* SVG & Bar Chart Graphic */}
                <div className="relative h-64 w-full rounded-2xl bg-muted/10 p-4 border border-border/40 flex items-end justify-between gap-2 sm:gap-4 overflow-hidden">
                    {data.map((point) => {
                        const isHovered = hoveredPoint?.date === point.date;

                        return (
                            <div
                                key={point.date}
                                onMouseEnter={() => setHoveredPoint(point)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                            >
                                {/* Tooltip */}
                                {isHovered && (
                                    <div className="absolute -top-12 z-20 rounded-xl border border-border bg-popover p-2 text-[11px] shadow-xl animate-in fade-in-50 zoom-in-95 pointer-events-none whitespace-nowrap min-w-[120px]">
                                        <p className="font-bold text-foreground border-b border-border/60 pb-1 mb-1">
                                            {point.date} Sales
                                        </p>
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-semibold">POS: ${point.pos.toLocaleString()}</p>
                                            <p className="text-blue-500 font-semibold">Online: ${point.online.toLocaleString()}</p>
                                            <p className="text-purple-500 font-semibold">Mobile: ${point.mobile.toLocaleString()}</p>
                                            <p className="text-amber-500 font-semibold">Marketplace: ${point.marketplace.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Grouped Bar Columns */}
                                <div className="flex items-end gap-1 w-full justify-center h-[82%]">
                                    {/* POS Bar */}
                                    <div
                                        style={{ height: `${(point.pos / maxBarVal) * 100}%` }}
                                        className="w-full max-w-[14px] bg-primary rounded-t-md transition-all group-hover:brightness-110"
                                    />
                                    {/* Online Store Bar */}
                                    <div
                                        style={{ height: `${(point.online / maxBarVal) * 100}%` }}
                                        className="w-full max-w-[14px] bg-blue-500 rounded-t-md transition-all group-hover:brightness-110"
                                    />
                                    {/* Mobile App Bar */}
                                    <div
                                        style={{ height: `${(point.mobile / maxBarVal) * 100}%` }}
                                        className="w-full max-w-[14px] bg-purple-500 rounded-t-md transition-all group-hover:brightness-110"
                                    />
                                    {/* Marketplace Bar */}
                                    <div
                                        style={{ height: `${(point.marketplace / maxBarVal) * 100}%` }}
                                        className="w-full max-w-[14px] bg-amber-500 rounded-t-md transition-all group-hover:brightness-110"
                                    />
                                </div>

                                {/* X-Axis Date Label */}
                                <span className="mt-2 text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                    {point.date}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 border-t border-border/50 text-xs font-bold">
                {CHANNELS_CONFIG.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                        <span className={`size-3 rounded-md ${c.color.split(" ")[0]}`} />
                        <span className="text-foreground">{c.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
