import { baseApi } from "@/lib/baseApi";
import type {
    AddOn,
    AddOnInput,
    AddOnSet,
    AddOnSetInput,
    OptionPreset,
    OptionPresetInput,
    InventoryItem,
    InventoryItemInput,
    ItemPricingInput,
    InventoryItemPage,
    InventoryItemQuery,
    ItemGroup,
    ItemGroupInput,
    StockEntry,
    StockEntryInput,
    StockBatch,
    StockSummary,
    Unit,
    UnitInput,
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
        getOptionPresets: builder.query<OptionPreset[], void>({
            query: () => "/inventory/option-presets",
            providesTags: ["InventoryOptionPresets"],
        }),
        createOptionPreset: builder.mutation<OptionPreset, OptionPresetInput>({
            query: (body) => ({
                url: "/inventory/option-presets",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryOptionPresets"],
        }),
        updateOptionPreset: builder.mutation<
            OptionPreset,
            { presetId: string; body: OptionPresetInput }
        >({
            query: ({ presetId, body }) => ({
                url: `/inventory/option-presets/${encodeURIComponent(presetId)}`,
                method: "PUT",
                body,
            }),
            // Applying a preset copies its values, so items already using it
            // are untouched by an edit here.
            invalidatesTags: ["InventoryOptionPresets"],
        }),
        deleteOptionPreset: builder.mutation<void, string>({
            query: (presetId) => ({
                url: `/inventory/option-presets/${encodeURIComponent(presetId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryOptionPresets"],
        }),
        getAddOns: builder.query<AddOn[], void>({
            query: () => "/inventory/add-ons",
            providesTags: ["InventoryAddOns"],
        }),
        createAddOn: builder.mutation<AddOn, AddOnInput>({
            query: (body) => ({
                url: "/inventory/add-ons",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryAddOns"],
        }),
        updateAddOn: builder.mutation<
            AddOn,
            { addOnId: string; body: AddOnInput }
        >({
            query: ({ addOnId, body }) => ({
                url: `/inventory/add-ons/${encodeURIComponent(addOnId)}`,
                method: "PUT",
                body,
            }),
            // An add-on is shared, so a change to it changes every item that
            // offers it.
            invalidatesTags: ["InventoryAddOns", "InventoryItems"],
        }),
        deleteAddOn: builder.mutation<void, string>({
            query: (addOnId) => ({
                url: `/inventory/add-ons/${encodeURIComponent(addOnId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryAddOns", "InventoryItems"],
        }),
        getAddOnSets: builder.query<AddOnSet[], void>({
            query: () => "/inventory/add-on-sets",
            providesTags: ["InventoryAddOnSets"],
        }),
        createAddOnSet: builder.mutation<AddOnSet, AddOnSetInput>({
            query: (body) => ({
                url: "/inventory/add-on-sets",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryAddOnSets"],
        }),
        updateAddOnSet: builder.mutation<
            AddOnSet,
            { setId: string; body: AddOnSetInput }
        >({
            query: ({ setId, body }) => ({
                url: `/inventory/add-on-sets/${encodeURIComponent(setId)}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["InventoryAddOnSets"],
        }),
        deleteAddOnSet: builder.mutation<void, string>({
            query: (setId) => ({
                url: `/inventory/add-on-sets/${encodeURIComponent(setId)}`,
                method: "DELETE",
            }),
            // Only the grouping goes; the add-ons stay in the library.
            invalidatesTags: ["InventoryAddOnSets"],
        }),
        getInventoryUnits: builder.query<Unit[], void>({
            query: () => "/inventory/units",
            providesTags: ["InventoryUnits"],
        }),
        createUnit: builder.mutation<Unit, UnitInput>({
            query: (body) => ({
                url: "/inventory/units",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InventoryUnits"],
        }),
        updateUnit: builder.mutation<
            Unit,
            { unitId: string; body: UnitInput }
        >({
            query: ({ unitId, body }) => ({
                url: `/inventory/units/${encodeURIComponent(unitId)}`,
                method: "PUT",
                body,
            }),
            // Items and add-ons show the unit's symbol, so renaming it
            // changes what they read.
            invalidatesTags: ["InventoryUnits", "InventoryItems", "InventoryAddOns"],
        }),
        deleteUnit: builder.mutation<void, string>({
            query: (unitId) => ({
                url: `/inventory/units/${encodeURIComponent(unitId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryUnits"],
        }),
        getCurrentStock: builder.query<StockSummary[], void>({
            query: () => "/inventory/stock/current",
            providesTags: ["InventoryStock"],
        }),
        /** The deliveries still on the shelf for one item, oldest first. */
        getItemStockBatches: builder.query<StockBatch[], string>({
            query: (itemId) => `/inventory/items/${itemId}/stock-batches`,
            providesTags: (_result, _error, itemId) => [
                { type: "InventoryStockBatches", id: itemId },
            ],
        }),
        getStockEntries: builder.query<StockEntry[], void>({
            query: () => "/inventory/stock-entries",
            providesTags: ["InventoryStockEntries"],
        }),
        updateItemAddOns: builder.mutation<
            InventoryItem,
            { itemId: string; addOnIds: string[] }
        >({
            query: ({ itemId, addOnIds }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}/add-ons`,
                method: "PUT",
                body: { addOnIds },
            }),
            invalidatesTags: ["InventoryItems"],
        }),
        updateItemAddOnAvailability: builder.mutation<
            InventoryItem,
            { itemId: string; addOnId: string; available: boolean }
        >({
            query: ({ itemId, addOnId, available }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}/add-ons/${encodeURIComponent(addOnId)}`,
                method: "PUT",
                body: { available },
            }),
            invalidatesTags: ["InventoryItems"],
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
    useGetOptionPresetsQuery,
    useCreateOptionPresetMutation,
    useUpdateOptionPresetMutation,
    useDeleteOptionPresetMutation,
    useGetAddOnsQuery,
    useGetAddOnSetsQuery,
    useCreateAddOnSetMutation,
    useUpdateAddOnSetMutation,
    useDeleteAddOnSetMutation,
    useCreateAddOnMutation,
    useUpdateAddOnMutation,
    useDeleteAddOnMutation,
    useGetInventoryUnitsQuery,
    useCreateUnitMutation,
    useUpdateUnitMutation,
    useDeleteUnitMutation,
    useGetCurrentStockQuery,
    useGetItemStockBatchesQuery,
    useGetStockEntriesQuery,
    useCreateStockEntryMutation,
    useUpdateItemAddOnAvailabilityMutation,
    useUpdateItemAddOnsMutation,
    useUpdateItemPricingMutation,
} = inventoryApi;
