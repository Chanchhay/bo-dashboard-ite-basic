"use client";

import { DollarSign, Flame, PackageX, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
    useItemForecasts,
    type PredictionWindowKey,
} from "@/hooks/useItemForecasts";
import { useMoney } from "@/hooks/useMoney";
import { cn } from "@/lib/utils";

interface PredictionSummaryProps {
    windowKey: PredictionWindowKey;
    /** e.g. "this week", "this month" — used in the tile copy. */
    windowPhrase: string;
}

/** The 4 headline numbers — the tables below spell out exactly which products. */
export function PredictionSummary({
    windowKey,
    windowPhrase,
}: PredictionSummaryProps) {
    const { format } = useMoney();
    const { loading, hasError, hasAnySales, rising, stockoutSoon, slowMovers, revenueForecast } =
        useItemForecasts(windowKey);

    if (hasError) {
        return (
            <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm">
                <p className="text-sm font-medium text-danger">
                    Couldn&apos;t work out predictions — try refreshing.
                </p>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                    Crunching the numbers…
                </p>
            </Card>
        );
    }

    if (!hasAnySales) {
        return (
            <Card className="rounded-[22px] border border-border/80 bg-card p-6 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                    No sales {windowPhrase} yet — predictions need at least
                    some recent sales to work from.
                </p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <PredictionTile
                icon={<Flame className="size-6 stroke-[2.5]" />}
                colorClass="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/25"
                value={rising.length.toLocaleString()}
                label={`Product${rising.length === 1 ? "" : "s"} expected to sell more ${windowPhrase}`}
            />
            <PredictionTile
                icon={<PackageX className="size-6 stroke-[2.5]" />}
                colorClass="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/25"
                value={stockoutSoon.length.toLocaleString()}
                label={`Product${stockoutSoon.length === 1 ? "" : "s"} may run out ${windowPhrase}`}
            />
            <PredictionTile
                icon={<TrendingDown className="size-6 stroke-[2.5]" />}
                colorClass="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/25"
                value={slowMovers.length.toLocaleString()}
                label={`Product${slowMovers.length === 1 ? "" : "s"} becoming slow-moving`}
            />
            <PredictionTile
                icon={<DollarSign className="size-6 stroke-[2.5]" />}
                colorClass="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/25"
                value={`${format(revenueForecast.low)} – ${format(revenueForecast.high)}`}
                label={`Revenue forecast, ${windowPhrase}`}
            />
        </div>
    );
}

function PredictionTile({
    icon,
    colorClass,
    value,
    label,
}: {
    icon: ReactNode;
    colorClass: string;
    value: string;
    label: string;
}) {
    return (
        <Card className="rounded-[22px] border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div
                className={cn(
                    "flex size-11 items-center justify-center rounded-2xl border shadow-xs",
                    colorClass,
                )}
            >
                {icon}
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-foreground tabular-nums">
                {value}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {label}
            </p>
        </Card>
    );
}
