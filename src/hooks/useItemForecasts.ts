"use client";

import { useMemo, useState } from "react";

import type { InventoryItem, StockSummary } from "@/lib/api/inventory";
import { toLocalDateTime } from "@/lib/api/sales-report";
import { useGetItemProfitQuery } from "@/services/salesReportApi";

/**
 * No ML here — just averages and a period-over-period trend, on purpose. An
 * owner should be able to trust these numbers without knowing what a
 * confidence interval is. Shared by the dashboard summary tiles and the
 * full Prediction page so the two never disagree on what counts as
 * "rising", "running out" or "slow".
 */
export const SAFETY_STOCK_DAYS = 2;
export const GROWTH_THRESHOLD_PERCENT = 10;
export const SLOW_MOVER_MAX_UNITS_30D = 3;

/**
 * The date-range choices the Prediction page's filter offers.
 *
 * Deliberately just these two. A single day is too small a sample — one
 * unusually big sale reads as a +900% trend — and a year-long window makes
 * "recommended restock" suggest buying a year's worth of stock at once,
 * which isn't realistic advice for cash flow or anything perishable. Week
 * and month are the two horizons an owner can actually act on.
 */
export const PREDICTION_WINDOWS = {
    WEEK: { label: "Week", days: 7 },
    MONTH: { label: "Month", days: 30 },
} as const;

export type PredictionWindowKey = keyof typeof PREDICTION_WINDOWS;

export type ItemForecast = {
    itemId: string;
    name: string;
    currentStock: number;
    avgDailyDemand: number;
    /** Naive forecast: next period assumed roughly equal to the last one. */
    expectedDemandWindow: number;
    /** Null when there's no prior-period baseline to compare against. */
    trendPercent: number | null;
    /** Null when nothing has sold recently, so a rate can't be worked out. */
    estimatedStockoutDays: number | null;
    recommendedRestock: number;
    qtySold30d: number;
};

function dateRange(daysAgoStart: number, daysAgoEnd: number, now: Date) {
    const from = new Date(now);
    from.setDate(from.getDate() - daysAgoStart);
    const to = new Date(now);
    to.setDate(to.getDate() - daysAgoEnd);
    return { from: toLocalDateTime(from), to: toLocalDateTime(to) };
}

export function useItemForecasts(
    items: InventoryItem[],
    stock: StockSummary[],
    windowDays = 7,
) {
    const [now] = useState(() => new Date());

    const windowRange = useMemo(
        () => dateRange(windowDays, 0, now),
        [now, windowDays],
    );
    const prevWindowRange = useMemo(
        () => dateRange(windowDays * 2, windowDays, now),
        [now, windowDays],
    );
    // Slow-movers are judged on a fixed 30-day lookback regardless of the
    // selected window — "sold almost nothing in 30 days" stops meaning
    // anything if the window were, say, a single day.
    const last30Range = useMemo(() => dateRange(30, 0, now), [now]);

    const windowQuery = useGetItemProfitQuery(windowRange);
    const prevWindowQuery = useGetItemProfitQuery(prevWindowRange);
    const last30Query = useGetItemProfitQuery(last30Range);

    const loading =
        windowQuery.isLoading ||
        prevWindowQuery.isLoading ||
        last30Query.isLoading;
    const hasError =
        windowQuery.isError || prevWindowQuery.isError || last30Query.isError;

    const stockByItem = useMemo(() => {
        const map = new Map<string, number>();
        for (const entry of stock) {
            if (!entry.itemId) continue;
            map.set(
                entry.itemId,
                (map.get(entry.itemId) ?? 0) + (entry.quantityOnHand ?? 0),
            );
        }
        return map;
    }, [stock]);

    const itemNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const item of items) {
            if (item.id) map.set(item.id, item.name || "Unnamed item");
        }
        return map;
    }, [items]);

    const forecasts = useMemo(() => {
        const windowItems = windowQuery.data?.items ?? [];
        const prevById = new Map(
            (prevWindowQuery.data?.items ?? [])
                .filter((row) => row.itemId)
                .map((row) => [row.itemId as string, row.quantitySold || 0]),
        );
        const qty30ById = new Map(
            (last30Query.data?.items ?? [])
                .filter((row) => row.itemId)
                .map((row) => [row.itemId as string, row.quantitySold || 0]),
        );

        return windowItems
            .filter((row): row is typeof row & { itemId: string } =>
                Boolean(row.itemId),
            )
            .map((row): ItemForecast => {
                const itemId = row.itemId;
                const currentStock = stockByItem.get(itemId) ?? 0;
                const qtyWindow = row.quantitySold || 0;
                const avgDailyDemand = qtyWindow / windowDays;
                const prevQty = prevById.get(itemId) ?? 0;
                const trendPercent =
                    prevQty > 0 ? ((qtyWindow - prevQty) / prevQty) * 100 : null;
                const expectedDemandWindow = qtyWindow;
                const safetyStock = Math.ceil(avgDailyDemand * SAFETY_STOCK_DAYS);
                const recommendedRestock = Math.max(
                    0,
                    Math.ceil(expectedDemandWindow + safetyStock - currentStock),
                );
                const estimatedStockoutDays =
                    avgDailyDemand > 0 ? currentStock / avgDailyDemand : null;

                return {
                    itemId,
                    name:
                        itemNameById.get(itemId) ||
                        row.itemName ||
                        row.variantName ||
                        "Item",
                    currentStock,
                    avgDailyDemand,
                    expectedDemandWindow,
                    trendPercent,
                    estimatedStockoutDays,
                    recommendedRestock,
                    qtySold30d: qty30ById.get(itemId) ?? 0,
                };
            });
    }, [
        windowQuery.data,
        prevWindowQuery.data,
        last30Query.data,
        stockByItem,
        itemNameById,
        windowDays,
    ]);

    const rising = useMemo(
        () =>
            forecasts
                .filter(
                    (f) =>
                        f.trendPercent !== null &&
                        f.trendPercent >= GROWTH_THRESHOLD_PERCENT,
                )
                .sort((a, b) => (b.trendPercent ?? 0) - (a.trendPercent ?? 0)),
        [forecasts],
    );

    const stockoutSoon = useMemo(
        () =>
            forecasts
                .filter(
                    (f) =>
                        f.estimatedStockoutDays !== null &&
                        f.estimatedStockoutDays <= windowDays,
                )
                .sort(
                    (a, b) =>
                        (a.estimatedStockoutDays ?? 0) -
                        (b.estimatedStockoutDays ?? 0),
                ),
        [forecasts, windowDays],
    );

    const slowMovers = useMemo(
        () =>
            forecasts
                .filter(
                    (f) =>
                        f.currentStock > 0 &&
                        f.qtySold30d <= SLOW_MOVER_MAX_UNITS_30D,
                )
                .sort((a, b) => a.qtySold30d - b.qtySold30d),
        [forecasts],
    );

    const restockNeeded = useMemo(
        () =>
            forecasts
                .filter((f) => f.recommendedRestock > 0)
                .sort(
                    (a, b) =>
                        (a.estimatedStockoutDays ?? Infinity) -
                        (b.estimatedStockoutDays ?? Infinity),
                ),
        [forecasts],
    );

    const windowRevenue = windowQuery.data?.total.revenue ?? 0;
    const prevWindowRevenue = prevWindowQuery.data?.total.revenue ?? 0;
    // Clamped so one unusually good or bad period doesn't swing the forecast wildly.
    const revenueTrend =
        prevWindowRevenue > 0
            ? Math.max(
                  -0.5,
                  Math.min(
                      0.5,
                      (windowRevenue - prevWindowRevenue) / prevWindowRevenue,
                  ),
              )
            : 0;
    const revenueForecastMid = windowRevenue * (1 + revenueTrend);
    const revenueForecast = {
        low: revenueForecastMid * 0.9,
        mid: revenueForecastMid,
        high: revenueForecastMid * 1.1,
    };

    const hasAnySales = (windowQuery.data?.items.length ?? 0) > 0;

    return {
        loading,
        hasError,
        hasAnySales,
        forecasts,
        rising,
        stockoutSoon,
        slowMovers,
        restockNeeded,
        revenueForecast,
    };
}
