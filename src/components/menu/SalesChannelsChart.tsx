"use client";

import { useMemo, useState } from "react";
import {
    BarChart3,
    TrendingUp,
    Globe,
    Send,
    MessageSquare,
    Store,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Sparkles,
    Calendar,
    Filter,
    Layers,
} from "lucide-react";

import {
    getApiErrorMessage,
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { useMoney } from "@/hooks/useMoney";
import { toLocalDateTime, type OrderChannelCode } from "@/lib/api/sales-report";
import { useGetDailyRevenueByChannelQuery } from "@/services/salesReportApi";

type ChannelKey = "POS" | "WEB" | "TELEGRAM" | "MESSENGER";

const CHANNEL_KEYS: ChannelKey[] = ["POS", "WEB", "TELEGRAM", "MESSENGER"];

interface ChannelSalesPoint {
    date: string;
    POS: number;
    WEB: number;
    TELEGRAM: number;
    MESSENGER: number;
}

interface ChannelDef {
    key: ChannelKey;
    label: string;
    shortLabel: string;
    icon: typeof Store;
    gradient: string;
    strokeColor: string;
    fillGradientId: string;
    badgeBg: string;
}

const CHANNELS_CONFIG: ChannelDef[] = [
    {
        key: "POS",
        label: "Point of Sale",
        shortLabel: "POS",
        icon: Store,
        gradient: "from-emerald-500 to-teal-400",
        strokeColor: "#10b981",
        fillGradientId: "grad-pos",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
        key: "WEB",
        label: "Online Store",
        shortLabel: "Online",
        icon: Globe,
        gradient: "from-blue-500 to-cyan-400",
        strokeColor: "#3b82f6",
        fillGradientId: "grad-web",
        badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
        key: "TELEGRAM",
        label: "Telegram",
        shortLabel: "Telegram",
        icon: Send,
        gradient: "from-violet-500 to-purple-400",
        strokeColor: "#8b5cf6",
        fillGradientId: "grad-telegram",
        badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
        key: "MESSENGER",
        label: "Messenger",
        shortLabel: "Messenger",
        icon: MessageSquare,
        gradient: "from-amber-500 to-orange-400",
        strokeColor: "#f59e0b",
        fillGradientId: "grad-messenger",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
];

const zeroEntry = (): Record<ChannelKey, number> => ({
    POS: 0,
    WEB: 0,
    TELEGRAM: 0,
    MESSENGER: 0,
});

function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function dateKey(d: Date) {
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Splits a chronological list into up to `numChunks` contiguous, near-equal groups. */
function chunkInto<T>(items: T[], numChunks: number): T[][] {
    if (items.length === 0) return [];
    const size = Math.ceil(items.length / numChunks);
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function sumChannel(points: Record<ChannelKey, number>[], key: ChannelKey) {
    return points.reduce((total, point) => total + point[key], 0);
}

/**
 * Change against the period immediately before it, in words as well as a
 * sign — a channel with nothing to compare against is "New", not a
 * meaningless percentage of zero.
 */
function growthFor(current: number, previous: number): { label: string; up: boolean | null } {
    if (previous <= 0) {
        if (current <= 0) return { label: "—", up: null };
        return { label: "New", up: true };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function SalesChannelsChart() {
    const { format } = useMoney();
    const [timeRange, setTimeRange] = useState<"7D" | "30D">("7D");
    const [activeChannels, setActiveChannels] = useState<Record<ChannelKey, boolean>>({
        POS: true,
        WEB: true,
        TELEGRAM: true,
        MESSENGER: true,
    });
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [chartMode, setChartMode] = useState<"bar" | "area">("area");

    const rangeDays = timeRange === "7D" ? 7 : 30;

    // A day for both period boundaries, fixed at mount so the query key stays
    // stable across re-renders instead of drifting with `new Date()`.
    const [referenceDate] = useState(() => new Date());

    // Both the period shown and the one before it, in one request: a channel
    // with no history yet still needs "New" rather than a division by zero.
    const from = useMemo(
        () => toLocalDateTime(startOfDay(addDays(referenceDate, -(rangeDays * 2 - 1)))),
        [referenceDate, rangeDays],
    );
    const to = useMemo(
        () => toLocalDateTime(endOfDay(referenceDate)),
        [referenceDate],
    );

    const revenueQuery = useGetDailyRevenueByChannelQuery({ from, to });

    const byDate = useMemo(() => {
        const map = new Map<string, Record<ChannelKey, number>>();
        for (const row of revenueQuery.data ?? []) {
            const code = row.channel as OrderChannelCode;
            if (!CHANNEL_KEYS.includes(code as ChannelKey)) continue;

            const entry = map.get(row.date) ?? zeroEntry();
            entry[code as ChannelKey] += row.revenue;
            map.set(row.date, entry);
        }
        return map;
    }, [revenueQuery.data]);

    const allDays = useMemo(() => {
        const days: string[] = [];
        for (let i = rangeDays * 2 - 1; i >= 0; i--) {
            days.push(dateKey(addDays(referenceDate, -i)));
        }
        return days;
    }, [referenceDate, rangeDays]);

    const previousDays = allDays.slice(0, rangeDays);
    const currentDays = allDays.slice(rangeDays);

    const currentPoints = useMemo(
        () =>
            currentDays.map((key) => {
                const entry = byDate.get(key) ?? zeroEntry();
                return { dateKey: key, ...entry };
            }),
        [currentDays, byDate],
    );

    const previousPoints = useMemo(
        () =>
            previousDays.map((key) => {
                const entry = byDate.get(key) ?? zeroEntry();
                return { dateKey: key, ...entry };
            }),
        [previousDays, byDate],
    );

    // 7 days plots one point per day; 30 days groups into ~weekly buckets so
    // the x-axis stays readable instead of thirty crowded ticks.
    const rawData: ChannelSalesPoint[] = useMemo(() => {
        if (timeRange === "7D") {
            return currentPoints.map((point) => ({
                date: new Date(`${point.dateKey}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                }),
                POS: point.POS,
                WEB: point.WEB,
                TELEGRAM: point.TELEGRAM,
                MESSENGER: point.MESSENGER,
            }));
        }

        return chunkInto(currentPoints, 4).map((bucket, idx) => ({
            date: `Week ${idx + 1}`,
            POS: bucket.reduce((total, p) => total + p.POS, 0),
            WEB: bucket.reduce((total, p) => total + p.WEB, 0),
            TELEGRAM: bucket.reduce((total, p) => total + p.TELEGRAM, 0),
            MESSENGER: bucket.reduce((total, p) => total + p.MESSENGER, 0),
        }));
    }, [timeRange, currentPoints]);

    // Filtered data based on active channel toggles
    const data = useMemo(() => {
        return rawData.map((d) => ({
            ...d,
            POS: activeChannels.POS ? d.POS : 0,
            WEB: activeChannels.WEB ? d.WEB : 0,
            TELEGRAM: activeChannels.TELEGRAM ? d.TELEGRAM : 0,
            MESSENGER: activeChannels.MESSENGER ? d.MESSENGER : 0,
        }));
    }, [rawData, activeChannels]);

    // Calculate totals over the period shown, and growth against the period
    // right before it — real trend, not a hardcoded badge.
    const totals = useMemo(() => {
        const result = {
            POS: 0,
            WEB: 0,
            TELEGRAM: 0,
            MESSENGER: 0,
            grandTotal: 0,
        };
        for (const point of data) {
            result.POS += point.POS;
            result.WEB += point.WEB;
            result.TELEGRAM += point.TELEGRAM;
            result.MESSENGER += point.MESSENGER;
            result.grandTotal += point.POS + point.WEB + point.TELEGRAM + point.MESSENGER;
        }
        return result;
    }, [data]);

    const growth = useMemo(() => {
        const previousTotals: Record<ChannelKey, number> = {
            POS: sumChannel(previousPoints, "POS"),
            WEB: sumChannel(previousPoints, "WEB"),
            TELEGRAM: sumChannel(previousPoints, "TELEGRAM"),
            MESSENGER: sumChannel(previousPoints, "MESSENGER"),
        };
        return {
            POS: growthFor(totals.POS, previousTotals.POS),
            WEB: growthFor(totals.WEB, previousTotals.WEB),
            TELEGRAM: growthFor(totals.TELEGRAM, previousTotals.TELEGRAM),
            MESSENGER: growthFor(totals.MESSENGER, previousTotals.MESSENGER),
        };
    }, [previousPoints, totals]);

    function toggleChannel(key: ChannelKey) {
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
            ...data.map((d) => Math.max(d.POS, d.WEB, d.TELEGRAM, d.MESSENGER)),
        );
        // A real quiet period has nothing to scale against — fall back to 1
        // rather than 0, which would divide every height into NaN.
        return (highestPoint > 0 ? highestPoint : 1) * 1.15; // 15% headroom
    }, [data]);

    // Generate SVG path for a given channel key
    function getChannelAreaPoints(key: ChannelKey) {
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

    if (revenueQuery.isLoading) {
        return (
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <InventoryLoading label="Loading sales channel performance" />
            </div>
        );
    }

    if (revenueQuery.error) {
        return (
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <InventoryError
                    message={getApiErrorMessage(
                        revenueQuery.error,
                        "Unable to load sales channel performance.",
                    )}
                    retry={revenueQuery.refetch}
                />
            </div>
        );
    }

    const nothingSold = !revenueQuery.data || revenueQuery.data.length === 0;

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
                                <Sparkles className="size-3" /> Live
                            </span>
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Revenue trends across POS, Online Store, Telegram, and Messenger
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

            {nothingSold ? (
                <InventoryEmpty
                    title="No sales recorded yet"
                    description="Take a sale on any channel and it will show up here."
                />
            ) : (
                <>
                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {CHANNELS_CONFIG.map((channel) => {
                            const totalVal = totals[channel.key];
                            const isActive = activeChannels[channel.key];
                            const percent =
                                totals.grandTotal > 0
                                    ? Math.round((totalVal / totals.grandTotal) * 100)
                                    : 0;
                            const channelGrowth = growth[channel.key];

                            const Icon = channel.icon;
                            const GrowthIcon =
                                channelGrowth.up === null
                                    ? Minus
                                    : channelGrowth.up
                                      ? ArrowUpRight
                                      : ArrowDownRight;

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
                                            className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                                                channelGrowth.up === null
                                                    ? "bg-muted text-muted-foreground border-border/50"
                                                    : channel.badgeBg
                                            }`}
                                        >
                                            <GrowthIcon className="size-3" />
                                            {channelGrowth.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-baseline justify-between">
                                        <div>
                                            <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                                {format(totalVal)}
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
                                Grand Total: <span className="text-primary">{format(totals.grandTotal)}</span>
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
                                            {format(
                                                hoveredData.POS +
                                                    hoveredData.WEB +
                                                    hoveredData.TELEGRAM +
                                                    hoveredData.MESSENGER,
                                            )}
                                        </span>
                                    </div>
                                    <div className="space-y-1 font-mono">
                                        {activeChannels.POS && (
                                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                                <span>POS:</span>
                                                <span className="font-bold">{format(hoveredData.POS)}</span>
                                            </div>
                                        )}
                                        {activeChannels.WEB && (
                                            <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                                <span>Online:</span>
                                                <span className="font-bold">{format(hoveredData.WEB)}</span>
                                            </div>
                                        )}
                                        {activeChannels.TELEGRAM && (
                                            <div className="flex justify-between text-purple-600 dark:text-purple-400">
                                                <span>Telegram:</span>
                                                <span className="font-bold">{format(hoveredData.TELEGRAM)}</span>
                                            </div>
                                        )}
                                        {activeChannels.MESSENGER && (
                                            <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                                <span>Messenger:</span>
                                                <span className="font-bold">{format(hoveredData.MESSENGER)}</span>
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
                                            if (coords.length === 0) return null;

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
                                                    key={`${pt.date}-${idx}`}
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
                                                key={`${point.date}-${idx}`}
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
                </>
            )}
        </div>
    );
}
