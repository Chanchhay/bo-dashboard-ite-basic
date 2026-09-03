"use client";

import { BarChart2 } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { useMoney } from "@/hooks/useMoney";
import { Badge } from "@/components/reui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

/** One item's two measures, side by side: what it earned and how many sold. */
export type ItemTypePoint = {
    name: string;
    itemCount: number;
    totalAmount: number;
};

/** Revenue and units sold for the best-earning items, as paired bars. */
export function ItemTypeBarCard({
    data,
    isError,
}: {
    data: ItemTypePoint[];
    isError?: boolean;
}) {
    const { format } = useMoney();

    return (
        <Card className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-7">
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
                {isError ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                        Couldn&apos;t load item sales — try refreshing.
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                        No sales recorded yet for this business.
                    </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        accessibilityLayer
                        data={data}
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
    );
}
