import { baseApi } from "@/lib/baseApi";
import type {
    InventoryItem,
    InventoryItemInput,
    ItemPricingInput,
    InventoryItemPage,
    InventoryItemQuery,
    ItemGroup,
    ItemGroupInput,
    StockEntry,
    StockEntryInput,
    StockSummary,
    Unit,
} from "@/lib/api/inventory";

/**
 * Item saves are multipart now, so the fields travel as one JSON part and the
 * newly picked pictures as `files` parts beside them.
 */
function toItemBody(body: InventoryItemInput, files?: readonly File[]) {
    const formData = new FormData();
    formData.append("item", JSON.stringify(body));

    for (const file of files || []) {
        formData.append("files", file, file.name);
    }

    return formData;
}

export const inventoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getInventoryItems: builder.query<
            InventoryItemPage,
            InventoryItemQuery
        >({
            query: (params) => ({
                url: "/inventory/items",
                params,
            }),
            providesTags: (result) => [
                "InventoryItems",
                ...(result?.content || []).map((item) => ({
                    type: "InventoryItems" as const,
                    id: item.id,
                })),
            ],
        }),
        getInventoryItemOptions: builder.query<InventoryItem[], void>({
            query: () => "/inventory/items/options",
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
        findInventoryItemByBarcode: builder.query<InventoryItem, string>({
            query: (barcode) =>
                `/inventory/items/barcode/${encodeURIComponent(barcode)}`,
            providesTags: (result) =>
                result
                    ? [{ type: "InventoryItems" as const, id: result.id }]
                    : [],
        }),
        generateInventoryBarcode: builder.mutation<
            { barcode: string },
            void
        >({
            query: () => ({
                url: "/inventory/items/barcode/generate",
                method: "POST",
            }),
        }),
        createInventoryItem: builder.mutation<
            InventoryItem,
            { body: InventoryItemInput; files?: readonly File[] }
        >({
            query: ({ body, files }) => ({
                url: "/inventory/items",
                method: "POST",
                body: toItemBody(body, files),
            }),
            invalidatesTags: ["InventoryItems"],
        }),
        updateInventoryItem: builder.mutation<
            InventoryItem,
            {
                itemId: string;
                body: InventoryItemInput;
                files?: readonly File[];
            }
        >({
            query: ({ itemId, body, files }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}`,
                method: "PUT",
                body: toItemBody(body, files),
            }),
            invalidatesTags: (_result, _error, { itemId }) => [
                "InventoryItems",
                "InventoryStock",
                { type: "InventoryItems", id: itemId },
            ],
        }),
        uploadItemImages: builder.mutation<
            InventoryItem,
            { itemId: string; files: readonly File[] }
        >({
            query: ({ itemId, files }) => {
                const body = new FormData();

                for (const file of files) {
                    body.append("files", file, file.name);
                }

                return {
                    url: `/inventory/items/${encodeURIComponent(itemId)}/images`,
                    method: "POST",
                    body,
                };
            },
            invalidatesTags: (_result, _error, { itemId }) => [
                "InventoryItems",
                { type: "InventoryItems", id: itemId },
            ],
        }),
        reorderItemImages: builder.mutation<
            InventoryItem,
            { itemId: string; imageIds: string[] }
        >({
            query: ({ itemId, imageIds }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}/images/order`,
                method: "PUT",
                body: { imageIds },
            }),
            invalidatesTags: (_result, _error, { itemId }) => [
                "InventoryItems",
                { type: "InventoryItems", id: itemId },
            ],
        }),
        deleteItemImage: builder.mutation<
            InventoryItem,
            { itemId: string; imageId: string }
        >({
            query: ({ itemId, imageId }) => ({
                url:
                    `/inventory/items/${encodeURIComponent(itemId)}` +
                    `/images/${encodeURIComponent(imageId)}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { itemId }) => [
                "InventoryItems",
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
        updateItemPricing: builder.mutation<
            InventoryItem,
            { itemId: string; pricing: ItemPricingInput }
        >({
            query: ({ itemId, pricing }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}/pricing`,
                method: "PUT",
                body: pricing,
            }),
            invalidatesTags: ["InventoryItems"],
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
    useGetInventoryItemOptionsQuery,
    useGetInventoryItemQuery,
    useLazyFindInventoryItemByBarcodeQuery,
    useGenerateInventoryBarcodeMutation,
    useCreateInventoryItemMutation,
    useUpdateInventoryItemMutation,
    useDeleteInventoryItemMutation,
    useUploadItemImagesMutation,
    useReorderItemImagesMutation,
    useDeleteItemImageMutation,
    useGetItemGroupsQuery,
    useCreateItemGroupMutation,
    useUpdateItemGroupMutation,
    useDeleteItemGroupMutation,
    useGetInventoryUnitsQuery,
    useGetCurrentStockQuery,
    useGetStockEntriesQuery,
    useCreateStockEntryMutation,
    useUpdateItemPricingMutation,
} = inventoryApi;
