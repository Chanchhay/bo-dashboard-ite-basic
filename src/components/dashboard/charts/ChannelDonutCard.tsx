"use client";

import { PieChart as PieIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useMoney } from "@/hooks/useMoney";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

/** One channel's slice: its share, what it earned, and the colour it is drawn in. */
export type ChannelSlice = {
    name: string;
    value: number;
    revenue: number;
    color: string;
};

/**
 * Revenue share by channel, as a donut.
 *
 * Split out of the dashboard so the chart library it needs is fetched only
 * when this card is actually rendered — see the dynamic import in
 * OverviewDashboard. The dashboard still works out the figures; this only
 * draws them.
 */
export function ChannelDonutCard({ data }: { data: ChannelSlice[] }) {
    const { format } = useMoney();

    return (
        <Card data-tour="dashboard-channel-cards" className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-4">
            <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-2">
                <div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                        <PieIcon className="size-6 text-[var(--primary)]" />
                        Percentage of Channel
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Distribution of revenue share by channel</CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Donut Chart Container */}
                <div className="relative flex items-center justify-center h-64 sm:h-72 w-full my-2">
                    {data.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                            No channel revenue yet.
                        </div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={82}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                                label={({ value }) => `${value}%`}
                                labelLine={{ stroke: "#64748b", strokeWidth: 1.5, opacity: 0.7 }}
                            >
                                {data.map((entry, index) => (
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
                                    padding: "10px 14px",
                                }}
                                formatter={(value: any, name: any, entry: any) => {
                                    const rev = entry?.payload?.revenue;
                                    const priceStr = rev !== undefined ? format(rev) : "";
                                    return [
                                        priceStr || `${value}%`,
                                        name,
                                    ];
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    )}
                </div>

                {/* Bottom Legend Dots for POS, MESSENGER, TELEGRAM, WEB */}
                <div className="flex flex-wrap items-center justify-center gap-x-5.5 gap-y-2 pt-2.5 border-t border-border/40 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {data.map((c) => (
                        <span key={c.name} className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                        </span>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
