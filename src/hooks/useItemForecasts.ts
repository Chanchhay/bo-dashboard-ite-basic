"use client";

import { useMemo } from "react";

import type { PredictionWindow } from "@/lib/api/sales-report";
import { useGetSalesPredictionsQuery } from "@/services/salesReportApi";

/**
 * Thresholds used to sort the backend's per-item numbers into the 4 buckets
 * this page cares about. The averages, trend and restock math themselves are
 * computed server-side (`GET /sales/predictions`) — this file just groups
 * the results the same way everywhere they're shown, so the dashboard tiles
 * and the full Prediction page never disagree.
 */
export const GROWTH_THRESHOLD_PERCENT = 10;
export const SLOW_MOVER_MAX_UNITS_30D = 3;

/** The date-range choices the Prediction page's filter offers. */
export const PREDICTION_WINDOWS: Record<PredictionWindow, { label: string }> = {
    WEEK: { label: "Week" },
    MONTH: { label: "Month" },
};

export type PredictionWindowKey = PredictionWindow;

export function useItemForecasts(window: PredictionWindowKey) {
    const query = useGetSalesPredictionsQuery({ window });

    const forecasts = useMemo(() => query.data?.items ?? [], [query.data]);
    const windowDays = query.data?.windowDays ?? (window === "WEEK" ? 7 : 30);

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

    return {
        loading: query.isLoading,
        hasError: query.isError,
        // The backend returns one row per catalog item, sale or no sale — so
        // forecasts.length alone can't tell "no sales" from "no items."
        hasAnySales: forecasts.some((f) => f.expectedDemandWindow > 0),
        forecasts,
        rising,
        stockoutSoon,
        slowMovers,
        restockNeeded,
        revenueForecast: query.data?.revenueForecast ?? {
            low: 0,
            mid: 0,
            high: 0,
        },
    };
}
