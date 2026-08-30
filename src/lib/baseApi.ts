import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "/api",
    credentials: "same-origin",
});

/** Set by the API routes when the sign-in is over rather than the call refused. */
function isSessionExpired(payload: unknown) {
    return (
        typeof payload === "object" &&
        payload !== null &&
        (payload as { sessionExpired?: unknown }).sessionExpired === true
    );
}

let leaving = false;

const baseQueryWithSessionGuard: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (
        result.error?.status === 401 &&
        isSessionExpired(result.error.data) &&
        typeof window !== "undefined" &&
        !leaving
    ) {
        leaving = true;
        window.location.replace("/login");
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionGuard,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    tagTypes: [
        "Business",
        "BusinessCategories",
        "BusinessCurrencies",
        "InventoryItems",
        "InventoryItemGroups",
        "DataImports",
        "DataImportRows",
        "InventoryAddOns",
        "InventoryAddOnSets",
        "InventoryOptionPresets",
        "InventoryStock",
        "InventoryStockBatches",
        "InventoryStockEntries",
        "ItemChannelStock",
        "InventoryUnits",
        "UserProfile",
        "Staff",
        "BusinessRoles",
        "AuditLogs",
        "SalesChannels",
        "ItemChannels",
        "PosOrder",
        "BakongSettings",
        "PosOpenOrders",
        "PosOrderHistory",
        "PosReceipts",
        "Storefront",
        "Discounts",
        "Coupons",
        "MembershipTypes",
        "Customers",
        "TelegramBot",
        "CustomerDisplay",
        "SalesProfit",
        "PayLaterSales",
        "SalesDailyRevenue",
        "RegisterSessions",
        "FacebookPage",
    ],
    endpoints: () => ({}),
});