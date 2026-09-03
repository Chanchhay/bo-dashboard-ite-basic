import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import {
    NO_BUSINESS_SIGN_OUT_URL,
    isNoBusinessPayload,
} from "@/lib/api/no-business";

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

    if (typeof window !== "undefined" && !leaving) {
        if (result.error?.status === 401 && isSessionExpired(result.error.data)) {
            leaving = true;
            window.location.replace("/login");
        } else if (
            result.error?.status === 404 &&
            isNoBusinessPayload(result.error.data)
        ) {
            /*
             * The sign-in is fine — the account simply has no business, which
             * is the normal state of a platform administrator's account. Post
             * rather than navigate: the route drops this app's session before
             * showing the login page, so the middleware does not read the
             * session cookie and send the browser back to /dashboard. The
             * Keycloak session itself is left alone.
             */
            leaving = true;

            const form = document.createElement("form");
            form.method = "post";
            form.action = NO_BUSINESS_SIGN_OUT_URL;
            form.hidden = true;
            document.body.append(form);
            form.submit();
        }
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionGuard,
    /*
     * Seconds, not `true`.
     *
     * `true` refetched on every mount, so the cache never once served a
     * navigation: stepping from Inventory to Sales and back re-hit the
     * network and put a spinner over figures already on screen. A number
     * refetches only when the cached answer is older than that, which keeps
     * the data honest while making the second visit to a screen instant.
     *
     * The two places that genuinely cannot show a stale answer — the open
     * order list and the KHQR payment poll — pass `true` at the call site,
     * which still overrides this.
     */
    refetchOnMountOrArgChange: 30,
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