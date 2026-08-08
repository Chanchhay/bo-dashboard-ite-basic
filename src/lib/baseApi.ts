import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: "/api",
        credentials: "same-origin",
    }),
    tagTypes: [
        "Business",
        "BusinessCategories",
        "BusinessCurrencies",
        "InventoryItems",
        "InventoryItemGroups",
        "InventoryStock",
        "InventoryStockEntries",
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
    ],
    endpoints: () => ({}),
});