"use client";

import { TrendingUp } from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { useMoney } from "@/hooks/useMoney";
import type { ReportGranularity } from "@/lib/api/sales-report";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

/** One point on the running total: the period, and profit up to and including it. */
export type CumulativeProfitPoint = {
    /** The period this point covers, already named by the server. */
    label: string;
    profit: number;
    cumulative: number;
};

/**
 * Profit accumulating over time, with the period selector that drives it.
 *
 * The granularity lives on the dashboard rather than here, because it is what
 * the query is keyed on — this card only says when it has been changed.
 */
export function CumulativeProfitCard({
    data,
    granularity,
    onGranularityChange,
    isError,
}: {
    data: CumulativeProfitPoint[];
    granularity: ReportGranularity;
    onGranularityChange: (granularity: ReportGranularity) => void;
    isError?: boolean;
}) {
    const { format } = useMoney();

    return (
        <Card className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-8">
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
                                onClick={() => onGranularityChange(g)}
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
                {isError ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                        Couldn&apos;t load profit data — try refreshing.
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                        No profit data for this period yet.
                    </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        accessibilityLayer
                        data={data}
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
                            dataKey="label"
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
    );
}
