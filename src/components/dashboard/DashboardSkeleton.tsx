"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 pb-6 animate-pulse">
            {/* KPI Metric Cards Row (Top 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
                        <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-3.5 w-28 rounded-md" />
                                <Skeleton className="h-9 w-36 rounded-lg" />
                            </div>
                            <Skeleton className="size-11 rounded-2xl shrink-0" />
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Top Charts Grid Row (Percentage of Channel lg:col-span-4 & Cumulative Profit lg:col-span-8) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Percentage of Channel Skeleton */}
                <Card className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-4 h-96">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="size-6 rounded-md" />
                                <Skeleton className="h-6 w-44 rounded-md" />
                            </div>
                            <Skeleton className="h-3.5 w-56 rounded-md" />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex flex-col items-center justify-between flex-1">
                        {/* Donut Circle Skeleton */}
                        <div className="relative flex items-center justify-center my-4">
                            <Skeleton className="size-44 sm:size-48 rounded-full border-[18px] border-muted/30 bg-transparent" />
                        </div>

                        {/* Legend Dots Skeleton */}
                        <div className="flex flex-wrap items-center justify-center gap-4 w-full pt-3 border-t border-border/40">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <Skeleton className="size-2.5 rounded-full" />
                                    <Skeleton className="h-3.5 w-12 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Cumulative Profit Skeleton */}
                <Card className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-8 h-96 justify-between">
                    <CardHeader className="p-0 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 mb-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="size-6 rounded-md" />
                                <Skeleton className="h-6 w-40 rounded-md" />
                            </div>
                            <Skeleton className="h-3.5 w-24 rounded-md" />
                        </div>
                        {/* Granularity Pill Selector Skeleton */}
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-6 w-14 rounded-lg" />
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col justify-end">
                        {/* Chart Waves / Grid Bars Skeleton */}
                        <div className="flex items-end justify-between gap-3 h-56 w-full pt-4">
                            {[40, 65, 30, 80, 55, 90, 45, 70, 85, 60].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <Skeleton className="w-full rounded-t-md opacity-70" style={{ height: `${h}%` }} />
                                    <Skeleton className="h-3 w-8 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Charts Grid Row (Total Amount lg:col-span-7 & Stock Inventory lg:col-span-5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3. Total Amount of Item Type Skeleton */}
                <Card className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-7 h-96 justify-between">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="size-6 rounded-md" />
                                <Skeleton className="h-6 w-52 rounded-md" />
                            </div>
                            <Skeleton className="h-3.5 w-48 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col justify-end">
                        <div className="flex items-end justify-between gap-4 h-56 w-full pt-4">
                            {[50, 85, 40, 75, 60, 95].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <div className="flex items-end gap-1.5 w-full h-full justify-center">
                                        <Skeleton className="w-4 sm:w-5 rounded-t-sm" style={{ height: `${h}%` }} />
                                        <Skeleton className="w-4 sm:w-5 rounded-t-sm" style={{ height: `${h * 0.6}%` }} />
                                    </div>
                                    <Skeleton className="h-3 w-12 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Stock Inventory Skeleton */}
                <Card className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-5 h-96 justify-between">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="size-6 rounded-md" />
                                <Skeleton className="h-6 w-36 rounded-md" />
                            </div>
                            <Skeleton className="h-3.5 w-60 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col justify-between pt-1">
                        <div className="space-y-3">
                            {[85, 60, 45, 70, 50].map((w, i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="h-4 w-32 rounded-md" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-2 rounded-full" style={{ width: `${w}%` }} />
                                        <Skeleton className="h-2 rounded-full" style={{ width: `${w * 0.7}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Legend Pills Skeleton */}
                        <div className="flex items-center justify-center gap-3 pt-3 pb-1 mt-2">
                            <Skeleton className="h-6 w-28 rounded-full" />
                            <Skeleton className="h-6 w-28 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tables Row Skeleton (Recent Orders lg:col-span-7 & Best Selling Products lg:col-span-5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* Recent Orders Skeleton */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm lg:col-span-7 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <Skeleton className="h-6 w-32 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-lg" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-lg" />

                        {/* Table Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-border/40 pt-1">
                            <Skeleton className="h-3.5 w-12 rounded-sm" />
                            <Skeleton className="h-3.5 w-24 rounded-sm" />
                            <Skeleton className="h-3.5 w-20 rounded-sm" />
                            <Skeleton className="h-3.5 w-16 rounded-sm" />
                            <Skeleton className="h-3.5 w-14 rounded-sm" />
                        </div>

                        {/* Table Rows */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
                                <Skeleton className="h-4 w-28 rounded-md" />
                                <div className="flex items-center gap-2 w-32">
                                    <Skeleton className="size-7 rounded-full shrink-0" />
                                    <Skeleton className="h-4 w-20 rounded-md" />
                                </div>
                                <Skeleton className="h-4 w-24 rounded-md" />
                                <Skeleton className="h-4 w-14 rounded-md" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-7 rounded-lg" />
                            <Skeleton className="h-4 w-12 rounded-md" />
                            <Skeleton className="size-7 rounded-lg" />
                        </div>
                    </div>
                </Card>

                {/* Best Selling Products Skeleton */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <Skeleton className="h-6 w-44 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-lg" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-lg" />

                        {/* Table Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-border/40 pt-1">
                            <Skeleton className="h-3.5 w-24 rounded-sm" />
                            <Skeleton className="h-3.5 w-16 rounded-sm" />
                            <Skeleton className="h-3.5 w-14 rounded-sm" />
                        </div>

                        {/* Table Rows */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
                                <div className="flex items-center gap-2.5 w-40">
                                    <Skeleton className="size-7 rounded-lg shrink-0" />
                                    <Skeleton className="h-4 w-24 rounded-md" />
                                </div>
                                <Skeleton className="h-4 w-16 rounded-md" />
                                <Skeleton className="h-4 w-12 rounded-md" />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-7 rounded-lg" />
                            <Skeleton className="h-4 w-12 rounded-md" />
                            <Skeleton className="size-7 rounded-lg" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
