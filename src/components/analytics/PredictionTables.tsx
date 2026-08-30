"use client";

import Link from "next/link";
import {
    AlertTriangle,
    ChevronDown,
    Flame,
    PackageX,
    Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    PREDICTION_WINDOWS,
    useItemForecasts,
    type PredictionWindowKey,
} from "@/hooks/useItemForecasts";
import {
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";
import { cn } from "@/lib/utils";
import { PredictionSummary } from "@/components/analytics/PredictionSummary";

/** Natural phrasing for sentences — "expected to sell more ___". */
const WINDOW_PHRASE: Record<PredictionWindowKey, string> = {
    WEEK: "this week",
    MONTH: "this month",
};

export function PredictionTables() {
    const [windowKey, setWindowKey] = useState<PredictionWindowKey>("WEEK");
    const windowDays = PREDICTION_WINDOWS[windowKey].days;
    const windowPhrase = WINDOW_PHRASE[windowKey];

    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const inventoryLoading = itemsQuery.isLoading || stockQuery.isLoading;
    const inventoryError = itemsQuery.isError || stockQuery.isError;

    const { loading, hasError, hasAnySales, rising, stockoutSoon, restockNeeded } =
        useItemForecasts(itemsQuery.data ?? [], stockQuery.data ?? [], windowDays);

    const [search, setSearch] = useState("");
    const query = search.trim().toLowerCase();

    const filteredRising = useMemo(
        () =>
            query
                ? rising.filter((f) => f.name.toLowerCase().includes(query))
                : rising,
        [rising, query],
    );
    const filteredStockoutSoon = useMemo(
        () =>
            query
                ? stockoutSoon.filter((f) =>
                      f.name.toLowerCase().includes(query),
                  )
                : stockoutSoon,
        [stockoutSoon, query],
    );
    const filteredRestockNeeded = useMemo(
        () =>
            query
                ? restockNeeded.filter((f) =>
                      f.name.toLowerCase().includes(query),
                  )
                : restockNeeded,
        [restockNeeded, query],
    );

    const rangeSelector = (
        <div className="flex items-center gap-1 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-1 text-xs font-bold">
            {(Object.keys(PREDICTION_WINDOWS) as PredictionWindowKey[]).map(
                (key) => {
                    const isActive = windowKey === key;
                    return (
                        <button
                            type="button"
                            key={key}
                            onClick={() => setWindowKey(key)}
                            className={cn(
                                "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                                isActive
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "text-[var(--primary)] hover:bg-[var(--primary)]/15",
                            )}
                        >
                            {PREDICTION_WINDOWS[key].label}
                        </button>
                    );
                },
            )}
        </div>
    );

    if (inventoryLoading || loading) {
        return <InventoryLoading label="Working out predictions" />;
    }

    if (inventoryError || hasError) {
        return (
            <InventoryError message="Couldn't work out predictions right now — try refreshing." />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div
                data-tour="prediction-controls"
                className="flex flex-wrap items-center justify-between gap-3"
            >
                <div className="relative min-w-56 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter by product name…"
                        aria-label="Filter predictions by product name"
                        className="h-10 max-w-sm rounded-xl pl-9 text-sm"
                    />
                </div>
                {rangeSelector}
            </div>

            {!hasAnySales ? (
                <InventoryEmpty
                    title="Nothing to predict from yet"
                    description={`No sales recorded ${windowPhrase} — try a wider range, or come back once you've rung up a few more sales.`}
                />
            ) : (
                <>
                    <PredictionSummary
                        items={itemsQuery.data ?? []}
                        stock={stockQuery.data ?? []}
                        windowDays={windowDays}
                        windowPhrase={windowPhrase}
                    />

                    <PredictionTable
                        icon={<Flame className="size-5 text-orange-600 dark:text-orange-400" />}
                        title={`Predicted to sell more ${windowPhrase}`}
                        description="Trending up at least 10% vs the previous period — worth having plenty on hand."
                        emptyLabel={
                            query
                                ? `No matches for "${search}".`
                                : "Nothing is trending up right now."
                        }
                        columns={[
                            "Product",
                            `Expected demand (${PREDICTION_WINDOWS[windowKey].label})`,
                            "Trend",
                        ]}
                        rows={filteredRising.map((f) => (
                            <TableRow key={f.itemId}>
                                <TableCell className="font-semibold text-foreground">
                                    {f.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {Math.round(
                                        f.expectedDemandWindow,
                                    ).toLocaleString()}{" "}
                                    units
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums text-success">
                                    +{f.trendPercent?.toFixed(1)}%
                                </TableCell>
                            </TableRow>
                        ))}
                    />

                    <PredictionTable
                        icon={<PackageX className="size-5 text-rose-600 dark:text-rose-400" />}
                        title={`Stock alert — may run out ${windowPhrase}`}
                        description="Current stock won't cover expected demand at the recent rate of sale."
                        emptyLabel={
                            query
                                ? `No matches for "${search}".`
                                : "Nothing is at risk of running out."
                        }
                        columns={["Product", "Current stock", "Est. stockout"]}
                        rows={filteredStockoutSoon.map((f) => (
                            <TableRow key={f.itemId}>
                                <TableCell className="font-semibold text-foreground">
                                    {f.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {f.currentStock.toLocaleString()}
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "text-right font-semibold tabular-nums",
                                        (f.estimatedStockoutDays ?? 99) <= 2
                                            ? "text-danger"
                                            : "text-amber-600 dark:text-amber-400",
                                    )}
                                >
                                    ~
                                    {Math.max(
                                        0,
                                        Math.round(
                                            f.estimatedStockoutDays ?? 0,
                                        ),
                                    )}{" "}
                                    day
                                    {Math.round(
                                        f.estimatedStockoutDays ?? 0,
                                    ) === 1
                                        ? ""
                                        : "s"}
                                </TableCell>
                            </TableRow>
                        ))}
                    />

                    <PredictionTable
                        icon={<AlertTriangle className="size-5 text-danger" />}
                        title="Restock recommendation"
                        description="How many units to order — already worked out for you, nothing to calculate."
                        emptyLabel={
                            query
                                ? `No matches for "${search}".`
                                : "No restocking needed right now."
                        }
                        columns={[
                            "Product",
                            "Current stock",
                            "Recommended restock",
                            "",
                        ]}
                        rows={filteredRestockNeeded.map((f) => (
                            <TableRow key={f.itemId}>
                                <TableCell className="font-semibold text-foreground">
                                    {f.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {f.currentStock.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold tabular-nums text-foreground">
                                    {f.recommendedRestock.toLocaleString()}{" "}
                                    units
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        nativeButton={false}
                                        render={
                                            <Link
                                                href={`/inventory/stock/in?itemId=${f.itemId}`}
                                            />
                                        }
                                        className="h-8 rounded-lg text-xs"
                                    >
                                        Restock
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    />
                </>
            )}
        </div>
    );
}

function PredictionTable({
    icon,
    title,
    description,
    emptyLabel,
    columns,
    rows,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    emptyLabel: string;
    columns: string[];
    rows: ReactNode[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <Card
            data-tour="prediction-group"
            className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm"
        >
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-start justify-between gap-3 text-left"
            >
                <CardHeader className="w-full p-0">
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        {icon}
                        {title}
                        <span className="text-xs font-semibold text-muted-foreground">
                            ({rows.length})
                        </span>
                    </CardTitle>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {description}
                    </p>
                </CardHeader>
                <ChevronDown
                    className={cn(
                        "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open ? (
                <CardContent className="p-0 border-t border-border/60 pt-4 mt-4">
                    {rows.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {emptyLabel}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        {columns.map((col, i) => (
                                            <TableHead
                                                key={col || i}
                                                className={
                                                    i === 0 ? "" : "text-right"
                                                }
                                            >
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{rows}</TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            ) : null}
        </Card>
    );
}
