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
    Sparkles,
    Calendar,
    Filter,
    Layers,
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
    { date: "Mon", pos: 3400, online: 2950, mobile: 1840, marketplace: 1220 },
    { date: "Tue", pos: 3850, online: 3200, mobile: 2120, marketplace: 1410 },
    { date: "Wed", pos: 3100, online: 3450, mobile: 2310, marketplace: 1380 },
    { date: "Thu", pos: 4250, online: 3900, mobile: 2630, marketplace: 1710 },
    { date: "Fri", pos: 5100, online: 4650, mobile: 3240, marketplace: 2190 },
    { date: "Sat", pos: 5850, online: 5100, mobile: 3650, marketplace: 2450 },
    { date: "Sun", pos: 4950, online: 4350, mobile: 2980, marketplace: 1920 },
];

const MOCK_SALES_30D: ChannelSalesPoint[] = [
    { date: "Week 1", pos: 22400, online: 18900, mobile: 12500, marketplace: 8100 },
    { date: "Week 2", pos: 25200, online: 20400, mobile: 14100, marketplace: 9600 },
    { date: "Week 3", pos: 28100, online: 23800, mobile: 16200, marketplace: 11200 },
    { date: "Week 4", pos: 31800, online: 26600, mobile: 18800, marketplace: 12900 },
];

interface ChannelDef {
    key: "pos" | "online" | "mobile" | "marketplace";
    label: string;
    shortLabel: string;
    icon: typeof Store;
    gradient: string;
    strokeColor: string;
    fillGradientId: string;
    badgeBg: string;
    textColor: string;
    growth: string;
}

const CHANNELS_CONFIG: ChannelDef[] = [
    {
        key: "pos",
        label: "Point of Sale (POS)",
        shortLabel: "POS",
        icon: Store,
        gradient: "from-emerald-500 to-teal-400",
        strokeColor: "#10b981",
        fillGradientId: "grad-pos",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        textColor: "text-emerald-500",
        growth: "+35%",
    },
    {
        key: "online",
        label: "Online Store",
        shortLabel: "Online",
        icon: Globe,
        gradient: "from-blue-500 to-cyan-400",
        strokeColor: "#3b82f6",
        fillGradientId: "grad-online",
        badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        textColor: "text-blue-500",
        growth: "+31%",
    },
    {
        key: "mobile",
        label: "Mobile App",
        shortLabel: "Mobile",
        icon: Smartphone,
        gradient: "from-violet-500 to-purple-400",
        strokeColor: "#8b5cf6",
        fillGradientId: "grad-mobile",
        badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        textColor: "text-purple-500",
        growth: "+20%",
    },
    {
        key: "marketplace",
        label: "Marketplace",
        shortLabel: "Marketplace",
        icon: ShoppingBag,
        gradient: "from-amber-500 to-orange-400",
        strokeColor: "#f59e0b",
        fillGradientId: "grad-marketplace",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        textColor: "text-amber-500",
        growth: "+14%",
    },
];

export function SalesChannelsChart() {
    const [timeRange, setTimeRange] = useState<"7D" | "30D">("7D");
    const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({
        pos: true,
        online: true,
        mobile: true,
        marketplace: true,
    });
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [chartMode, setChartMode] = useState<"bar" | "area">("area");

    const rawData = timeRange === "7D" ? MOCK_SALES_7D : MOCK_SALES_30D;

    // Filtered data based on active channel toggles
    const data = useMemo(() => {
        return rawData.map((d) => ({
            ...d,
            pos: activeChannels.pos ? d.pos : 0,
            online: activeChannels.online ? d.online : 0,
            mobile: activeChannels.mobile ? d.mobile : 0,
            marketplace: activeChannels.marketplace ? d.marketplace : 0,
        }));
    }, [rawData, activeChannels]);

    // Calculate totals
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

    function toggleChannel(key: string) {
        setActiveChannels((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            // Ensure at least one channel remains active
            if (!Object.values(next).some(Boolean)) return prev;
            return next;
        });
    }

    // Chart Dimensions for SVG rendering
    const svgWidth = 800;
    const svgHeight = 240;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = svgWidth - padding.left - padding.right;
    const innerHeight = svgHeight - padding.top - padding.bottom;

    const maxVal = useMemo(() => {
        const highestPoint = Math.max(
            ...data.map((d) => Math.max(d.pos, d.online, d.mobile, d.marketplace, 100))
        );
        return highestPoint * 1.15; // 15% headroom
    }, [data]);

    // Generate SVG path for a given channel key
    function getChannelAreaPoints(key: "pos" | "online" | "mobile" | "marketplace") {
        if (!data || data.length === 0) return { pathD: "", areaD: "", coords: [] };

        const stepX = innerWidth / (data.length - 1 || 1);
        const coords = data.map((point, index) => {
            const x = padding.left + index * stepX;
            const val = point[key];
            const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
            return { x, y, val, date: point.date };
        });

        // Smooth Bezier Curve path construction
        let pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const current = coords[i];
            const next = coords[i + 1];
            const cpX = (current.x + next.x) / 2;
            pathD += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
        }

        const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padding.top + innerHeight} L ${coords[0].x} ${padding.top + innerHeight} Z`;

        return { pathD, areaD, coords };
    }

    const hoveredData = hoveredIdx !== null ? data[hoveredIdx] : null;

    return (
        <div data-tour="dashboard-sales-chart" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all space-y-6">
            {/* Top Bar Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-xs">
                            <BarChart3 className="size-5" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Sales Channel Performance
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Sparkles className="size-3" /> Live Analytics
                            </span>
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Revenue trends across physical POS, Online Store, Mobile App, and Marketplaces
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* View Mode Toggle: Area Curve vs Bar */}
                    <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1">
                        <button
                            type="button"
                            onClick={() => setChartMode("area")}
                            className={`flex items-center gap-1 px-2.5 py-1.2 text-xs font-semibold rounded-lg transition-all ${
                                chartMode === "area"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <TrendingUp className="size-3.5" /> Curve
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode("bar")}
                            className={`flex items-center gap-1 px-2.5 py-1.2 text-xs font-semibold rounded-lg transition-all ${
                                chartMode === "bar"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Layers className="size-3.5" /> Bar
                        </button>
                    </div>

                    {/* Time Range Selector */}
                    <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1">
                        <button
                            type="button"
                            onClick={() => setTimeRange("7D")}
                            className={`px-3 py-1.2 text-xs font-semibold rounded-lg transition-all ${
                                timeRange === "7D"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            7 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => setTimeRange("30D")}
                            className={`px-3 py-1.2 text-xs font-semibold rounded-lg transition-all ${
                                timeRange === "30D"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            30 Days
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div data-tour="dashboard-channel-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {CHANNELS_CONFIG.map((channel) => {
                    const totalVal = totals[channel.key];
                    const isActive = activeChannels[channel.key];
                    const percent =
                        totals.grandTotal > 0
                            ? Math.round((totalVal / totals.grandTotal) * 100)
                            : 0;

                    const Icon = channel.icon;

                    return (
                        <div
                            key={channel.key}
                            onClick={() => toggleChannel(channel.key)}
                            className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? "border-border bg-card shadow-xs hover:shadow-md"
                                    : "border-border/40 bg-muted/10 opacity-50 hover:opacity-80"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${channel.gradient} text-white shadow-xs`}
                                    >
                                        <Icon className="size-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[100px] sm:max-w-none">
                                        {channel.shortLabel}
                                    </span>
                                </div>
                                <span
                                    className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${channel.badgeBg}`}
                                >
                                    <ArrowUpRight className="size-3" />
                                    {channel.growth}
                                </span>
                            </div>

                            <div className="mt-3 flex items-baseline justify-between">
                                <div>
                                    <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                        ${totalVal.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {percent}% of total sales
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Interactive Graph Display */}
            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                    <span className="flex items-center gap-1.5">
                        <Filter className="size-3.5 text-primary" /> Dynamic Revenue Stream Graph
                    </span>
                    <span className="font-mono text-foreground font-bold">
                        Grand Total: <span className="text-primary">${totals.grandTotal.toLocaleString()}</span>
                    </span>
                </div>

                <div className="relative rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 p-4 sm:p-6 overflow-hidden">
                    {/* Floating Tooltip Box when hovering over data point */}
                    {hoveredIdx !== null && hoveredData && (
                        <div
                            className="absolute top-4 right-4 z-20 rounded-xl border border-border bg-popover/95 p-3.5 text-xs shadow-xl backdrop-blur-md transition-all animate-in fade-in-50 duration-150 min-w-[180px]"
                        >
                            <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                    <Calendar className="size-3.5 text-primary" /> {hoveredData.date}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-primary">
                                    $
                                    {(
                                        hoveredData.pos +
                                        hoveredData.online +
                                        hoveredData.mobile +
                                        hoveredData.marketplace
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="space-y-1 font-mono">
                                {activeChannels.pos && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>POS:</span>
                                        <span className="font-bold">${hoveredData.pos.toLocaleString()}</span>
                                    </div>
                                )}
                                {activeChannels.online && (
                                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                        <span>Online:</span>
                                        <span className="font-bold">${hoveredData.online.toLocaleString()}</span>
                                    </div>
                                )}
                                {activeChannels.mobile && (
                                    <div className="flex justify-between text-purple-600 dark:text-purple-400">
                                        <span>Mobile:</span>
                                        <span className="font-bold">${hoveredData.mobile.toLocaleString()}</span>
                                    </div>
                                )}
                                {activeChannels.marketplace && (
                                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                        <span>Marketplace:</span>
                                        <span className="font-bold">${hoveredData.marketplace.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {chartMode === "area" ? (
                        /* Smooth Area SVG Curve Chart */
                        <div className="relative w-full overflow-x-auto">
                            <svg
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                className="w-full h-64 overflow-visible"
                            >
                                <defs>
                                    {CHANNELS_CONFIG.map((c) => (
                                        <linearGradient
                                            key={c.fillGradientId}
                                            id={c.fillGradientId}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop offset="0%" stopColor={c.strokeColor} stopOpacity="0.35" />
                                            <stop offset="100%" stopColor={c.strokeColor} stopOpacity="0.0" />
                                        </linearGradient>
                                    ))}
                                </defs>

                                {/* Horizontal Grid Lines */}
                                {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                                    const y = padding.top + innerHeight * ratio;
                                    return (
                                        <line
                                            key={idx}
                                            x1={padding.left}
                                            y1={y}
                                            x2={svgWidth - padding.right}
                                            y2={y}
                                            stroke="currentColor"
                                            strokeOpacity="0.08"
                                            strokeDasharray="4 4"
                                        />
                                    );
                                })}

                                {/* Hover Vertical Highlight Guide Line */}
                                {hoveredIdx !== null && (
                                    <line
                                        x1={
                                            padding.left +
                                            hoveredIdx * (innerWidth / (data.length - 1 || 1))
                                        }
                                        y1={padding.top}
                                        x2={
                                            padding.left +
                                            hoveredIdx * (innerWidth / (data.length - 1 || 1))
                                        }
                                        y2={padding.top + innerHeight}
                                        stroke="currentColor"
                                        strokeOpacity="0.25"
                                        strokeDasharray="3 3"
                                        strokeWidth="1.5"
                                    />
                                )}

                                {/* Render Area Curves for each channel */}
                                {CHANNELS_CONFIG.map((channel) => {
                                    if (!activeChannels[channel.key]) return null;
                                    const { pathD, areaD, coords } = getChannelAreaPoints(channel.key);

                                    return (
                                        <g key={channel.key}>
                                            {/* Filled Area below curve */}
                                            <path
                                                d={areaD}
                                                fill={`url(#${channel.fillGradientId})`}
                                                className="transition-all duration-300"
                                            />
                                            {/* Smooth Curved Line */}
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke={channel.strokeColor}
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                className="transition-all duration-300"
                                            />
                                            {/* Data points */}
                                            {coords.map((pt, idx) => (
                                                <circle
                                                    key={idx}
                                                    cx={pt.x}
                                                    cy={pt.y}
                                                    r={hoveredIdx === idx ? "5.5" : "3.5"}
                                                    fill={channel.strokeColor}
                                                    stroke="#ffffff"
                                                    strokeWidth="2"
                                                    className="transition-all duration-150"
                                                />
                                            ))}
                                        </g>
                                    );
                                })}

                                {/* X-Axis Date Labels & Hover Overlay Trigger Columns */}
                                {data.map((pt, idx) => {
                                    const stepX = innerWidth / (data.length - 1 || 1);
                                    const x = padding.left + idx * stepX;

                                    return (
                                        <g
                                            key={pt.date}
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                            onMouseLeave={() => setHoveredIdx(null)}
                                            className="cursor-pointer"
                                        >
                                            {/* Transparent Overlay Box for Mouse Hover Target */}
                                            <rect
                                                x={x - stepX / 2}
                                                y={padding.top}
                                                width={stepX}
                                                height={innerHeight}
                                                fill="transparent"
                                            />
                                            <text
                                                x={x}
                                                y={svgHeight - 10}
                                                textAnchor="middle"
                                                className={`text-[11px] font-bold transition-colors ${
                                                    hoveredIdx === idx
                                                        ? "fill-primary font-black"
                                                        : "fill-muted-foreground"
                                                }`}
                                            >
                                                {pt.date}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    ) : (
                        /* Modern Gradient Rounded Bar Chart */
                        <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 pb-2">
                            {data.map((point, idx) => {
                                const isHovered = hoveredIdx === idx;

                                return (
                                    <div
                                        key={point.date}
                                        onMouseEnter={() => setHoveredIdx(idx)}
                                        onMouseLeave={() => setHoveredIdx(null)}
                                        className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                                    >
                                        {/* Grouped Bar Columns */}
                                        <div className="flex items-end justify-center gap-1.5 w-full h-[85%]">
                                            {CHANNELS_CONFIG.map((channel) => {
                                                if (!activeChannels[channel.key]) return null;
                                                const val = point[channel.key];
                                                const heightPct = (val / maxVal) * 100;

                                                return (
                                                    <div
                                                        key={channel.key}
                                                        style={{ height: `${heightPct}%` }}
                                                        className={`w-full max-w-[16px] rounded-t-lg bg-gradient-to-t ${channel.gradient} transition-all duration-200 group-hover:scale-y-105 group-hover:brightness-110 shadow-xs`}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* X-Axis Date Label */}
                                        <span
                                            className={`mt-2 text-xs font-bold transition-colors ${
                                                isHovered ? "text-primary" : "text-muted-foreground"
                                            }`}
                                        >
                                            {point.date}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Interactive Channel Filter Legend Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground">Filter Channels:</span>
                {CHANNELS_CONFIG.map((c) => {
                    const isActive = activeChannels[c.key];
                    return (
                        <button
                            type="button"
                            key={c.key}
                            onClick={() => toggleChannel(c.key)}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                    ? c.badgeBg
                                    : "border-border/50 bg-muted/10 text-muted-foreground line-through opacity-50"
                            }`}
                        >
                            <span className={`size-2.5 rounded-full bg-gradient-to-r ${c.gradient}`} />
                            <span>{c.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
