import { baseApi } from "@/lib/baseApi";
import type {
    ItemChannelStock,
    SaveItemChannelStockInput,
} from "@/lib/api/channel-stock";
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

/**
 * What a change to an item invalidates beyond the item lists.
 *
 * A channel does not hold its own copy of an item — `GET /sales-channels/{code}
 * /items` answers with the items themselves, prices and all, and that read is
 * what the till and the menu are built from. So an item edited here changes
 * what those screens should be showing, even though nothing about the channel
 * was touched.
 */
const itemReadTags = ["InventoryItems", "ItemChannels"] as const;

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
            invalidatesTags: [...itemReadTags],
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
                ...itemReadTags,
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
                ...itemReadTags,
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
                ...itemReadTags,
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
                ...itemReadTags,
                { type: "InventoryItems", id: itemId },
            ],
        }),
        deleteInventoryItem: builder.mutation<void, string>({
            query: (itemId) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}`,
                method: "DELETE",
            }),
            invalidatesTags: [...itemReadTags, "InventoryStock"],
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
            invalidatesTags: [
                "InventoryItemGroups",
                ...itemReadTags,
            ],
        }),
        deleteItemGroup: builder.mutation<void, string>({
            query: (itemGroupId) => ({
                url: `/inventory/item-groups/${encodeURIComponent(itemGroupId)}`,
                method: "DELETE",
            }),
            invalidatesTags: [
                "InventoryItemGroups",
                ...itemReadTags,
            ],
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
            invalidatesTags: ["InventoryAddOns", ...itemReadTags],
        }),
        deleteAddOn: builder.mutation<void, string>({
            query: (addOnId) => ({
                url: `/inventory/add-ons/${encodeURIComponent(addOnId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InventoryAddOns", ...itemReadTags],
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
            invalidatesTags: [
                "InventoryUnits",
                "InventoryAddOns",
                ...itemReadTags,
            ],
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
        /**
         * How one item's balance is shared out between its channels.
         *
         * Read per item rather than for the catalogue: the split is edited one
         * item at a time, and most items never have one — a shop-wide read
         * would carry a page of "SHARED" to answer a question about one row.
         */
        getItemChannelStock: builder.query<ItemChannelStock, string>({
            query: (itemId) =>
                `/inventory/items/${encodeURIComponent(itemId)}/channel-stock`,
            providesTags: (_result, _error, itemId) => [
                { type: "ItemChannelStock", id: itemId },
            ],
        }),
        saveItemChannelStock: builder.mutation<
            ItemChannelStock,
            { itemId: string; body: SaveItemChannelStockInput }
        >({
            query: ({ itemId, body }) => ({
                url: `/inventory/items/${encodeURIComponent(itemId)}/channel-stock`,
                method: "PUT",
                body,
            }),
            // The stock screens show what each channel may sell, so a changed
            // split is a changed answer there too.
            invalidatesTags: (_result, _error, { itemId }) => [
                { type: "ItemChannelStock", id: itemId },
                "InventoryStock",
            ],
        }),
        getStockEntries: builder.query<StockEntry[], void>({
            query: () => "/inventory/stock-entries",
            providesTags: ["InventoryStockEntries"],
        }),
        /**
         * One movement, with the batches it drew from.
         *
         * The list leaves that breakdown out, so a screen wanting to explain a
         * movement's cost has to ask for the movement on its own.
         */
        getStockEntry: builder.query<StockEntry, string>({
            query: (stockEntryId) =>
                `/inventory/stock-entries/${encodeURIComponent(stockEntryId)}`,
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
            invalidatesTags: [...itemReadTags],
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
            invalidatesTags: [...itemReadTags],
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
            // The item's own entry too: the edit form reads that one, and
            // saving it writes the whole item back, so a stale copy would
            // push the old prices over the ones just set.
            invalidatesTags: (_result, _error, { itemId }) => [
                ...itemReadTags,
                { type: "InventoryItems", id: itemId },
            ],
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
                // A delivery is a batch, so the per-item batch lists gained a
                // row rather than only a changed total.
                "InventoryStockBatches",
            ],
        }),
    }),
});

export const {
    useGetInventoryItemsQuery,
    useLazyGetInventoryItemsQuery,
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
    useGetStockEntryQuery,
    useGetItemChannelStockQuery,
    useSaveItemChannelStockMutation,
    useGetStockEntriesQuery,
    useCreateStockEntryMutation,
    useUpdateItemAddOnAvailabilityMutation,
    useUpdateItemAddOnsMutation,
    useUpdateItemPricingMutation,
} = inventoryApi;
