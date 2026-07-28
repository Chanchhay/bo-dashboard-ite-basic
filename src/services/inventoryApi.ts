import { baseApi } from "@/lib/baseApi";
import type {
    InventoryItem,
    InventoryItemInput,
    ItemGroup,
    ItemGroupInput,
    StockEntry,
    StockEntryInput,
    StockSummary,
    Unit,
} from "@/lib/api/inventory";

export const inventoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getInventoryItems: builder.query<InventoryItem[], void>({
            query: () => "/inventory/items",
            providesTags: (result) => [
                "InventoryItems",
                ...(result || []).map((item) => ({
                    type: "InventoryItems" as const,
                    id: item.id,
                })),
            ],
        }),
        getInventoryItem: builder.query<InventoryItem, string>({
            query: (itemId) =>
                `/inventory/items/${encodeURIComponent(itemId)}`,
            providesTags: (_result, _error, itemId) => [
                { type: "InventoryItems", id: itemId },
            ],
        }),
        createInventoryItem: builder.mutation<
            InventoryItem,
            InventoryItemInput
        >({
            query: (body) => ({
                url: "/inventory/items",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryItems"],
        }),
        updateInventoryItem: builder.mutation<
            InventoryItem,
            { itemId: string; body: InventoryItemInput }
        >({
            query: ({ itemId, body }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_result, _error, { itemId }) => [
                "InventoryItems",
                "InventoryStock",
                { type: "InventoryItems", id: itemId },
            ],
        }),
        deleteInventoryItem: builder.mutation<void, string>({
            query: (itemId) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryItems", "InventoryStock"],
        }),
        getItemGroups: builder.query<ItemGroup[], void>({
            query: () => "/inventory/item-groups",
            providesTags: ["InventoryItemGroups"],
        }),
        createItemGroup: builder.mutation<ItemGroup, ItemGroupInput>({
            query: (body) => ({
                url: "/inventory/item-groups",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryItemGroups"],
        }),
        updateItemGroup: builder.mutation<
            ItemGroup,
            { itemGroupId: string; body: ItemGroupInput }
        >({
            query: ({ itemGroupId, body }) => ({
                url: `/inventory/item-groups/${encodeURIComponent(itemGroupId)}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["InventoryItemGroups", "InventoryItems"],
        }),
        deleteItemGroup: builder.mutation<void, string>({
            query: (itemGroupId) => ({
                url: `/inventory/item-groups/${encodeURIComponent(itemGroupId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryItemGroups", "InventoryItems"],
        }),
        getInventoryUnits: builder.query<Unit[], void>({
            query: () => "/inventory/units",
            providesTags: ["InventoryUnits"],
        }),
        getCurrentStock: builder.query<StockSummary[], void>({
            query: () => "/inventory/stock/current",
            providesTags: ["InventoryStock"],
        }),
        getStockEntries: builder.query<StockEntry[], void>({
            query: () => "/inventory/stock-entries",
            providesTags: ["InventoryStockEntries"],
        }),
        createStockEntry: builder.mutation<
            StockEntry,
            StockEntryInput
        >({
            query: (body) => ({
                url: "/inventory/stock-entries",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                "InventoryStock",
                "InventoryStockEntries",
            ],
        }),
    }),
});

export const {
    useGetInventoryItemsQuery,
    useGetInventoryItemQuery,
    useCreateInventoryItemMutation,
    useUpdateInventoryItemMutation,
    useDeleteInventoryItemMutation,
    useGetItemGroupsQuery,
    useCreateItemGroupMutation,
    useUpdateItemGroupMutation,
    useDeleteItemGroupMutation,
    useGetInventoryUnitsQuery,
    useGetCurrentStockQuery,
    useGetStockEntriesQuery,
    useCreateStockEntryMutation,
} = inventoryApi;
