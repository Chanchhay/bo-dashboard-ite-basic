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

/*
 * One redirect, however many queries fail together. A screen typically has
 * several requests in flight, and they all come back unauthorised at once.
 */
let leaving = false;

/**
 * Sends the browser back to sign in when the server reports the session is
 * finished.
 *
 * `/login` restarts OAuth on its own, so while the Keycloak SSO session is
 * still alive this reads as a brief redirect and the user carries on. A full
 * page load rather than a router push, because everything cached in this tab
 * was read with an identity that no longer holds.
 */
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
    // A back-office screen is a window onto a shop that is still trading, and
    // the till, the stock room and this browser all write to it. Cached reads
    // are what make the screens quick, but a cache only kept until something
    // in *this* tab invalidates it goes quietly wrong the moment the change
    // came from anywhere else — the shop reloads the page to see its own data.
    //
    // So a screen re-reads when it is opened, and again when the connection
    // comes back. Focus is deliberately left out: half the screens here hold a
    // form seeded from the read, and refetching under a shop mid-edit would
    // take its typing away.
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    tagTypes: [
        "Business",
        "BusinessCategories",
        "BusinessCurrencies",
        "InventoryItems",
        "InventoryItemGroups",
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