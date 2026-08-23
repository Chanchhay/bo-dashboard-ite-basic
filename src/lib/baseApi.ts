import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: "/api",
        credentials: "same-origin",
    }),
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