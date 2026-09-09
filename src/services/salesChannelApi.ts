import { baseApi } from "@/lib/baseApi";
import type {
    ChannelListing,
    SaveChannelListingInput,
} from "@/lib/api/channel-pricing";
import type { ChannelStockAvailability } from "@/lib/api/channel-stock";
import type {
    ChannelItem,
    CreateItemChannelInput,
    ItemChannel,
    SalesChannel,
    ToggleItemChannelInput,
} from "@/lib/api/sales-channels";

export const salesChannelApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getSalesChannels: builder.query<SalesChannel[], void>({
            query: () => "/sales-channels",
            providesTags: ["SalesChannels"],
        }),

        createItemChannel: builder.mutation<ItemChannel, CreateItemChannelInput>({
            query: (body) => ({
                url: "/item-channels",
                method: "POST",
                body,
            }),
            invalidatesTags: ["ItemChannels"],
        }),

        getChannelItems: builder.query<ChannelItem[], string>({
            query: (channelCode) => `/sales-channels/${channelCode}/items`,
            providesTags: (_result, _error, channelCode) => [
                { type: "ItemChannels", id: `channel-${channelCode}` },
                "ItemChannels",
            ],
        }),

        getChannelStockAvailability: builder.query<ChannelStockAvailability[], string>({
            query: (channelCode) => `/sales-channels/${channelCode}/stock`,
            providesTags: (_result, _error, channelCode) => [
                { type: "ItemChannelStock", id: `channel-${channelCode}` },
                "ItemChannelStock",
                "InventoryStock",
            ],
        }),

        getItemChannelsByItem: builder.query<ItemChannel[], string>({
            query: (itemId) => `/item-channels/items/${itemId}`,
            providesTags: (_result, _error, itemId) => [
                { type: "ItemChannels", id: itemId },
                "ItemChannels",
            ],
        }),

        toggleItemChannel: builder.mutation<
            ItemChannel,
            { id: string; body: ToggleItemChannelInput }
        >({
            query: ({ id, body }) => ({
                url: `/item-channels/${id}/toggle`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["ItemChannels"],
        }),

        deleteItemChannel: builder.mutation<void, string>({
            query: (id) => ({
                url: `/item-channels/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["ItemChannels"],
        }),

        getChannelListing: builder.query<ChannelListing, string>({
            query: (channelId) => `/sales-channels/${channelId}/listing`,
            providesTags: (_result, _error, channelId) => [
                { type: "ItemChannels", id: `listing-${channelId}` },
                "ItemChannels",
            ],
        }),

        saveChannelListing: builder.mutation<
            ChannelListing,
            { channelId: string; body: SaveChannelListingInput }
        >({
            query: ({ channelId, body }) => ({
                url: `/sales-channels/${channelId}/listing`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_result, _error, { channelId }) => [
                { type: "ItemChannels", id: `listing-${channelId}` },
                "ItemChannels",
            ],
        }),
    }),
});

export const {
    useGetSalesChannelsQuery,
    useGetChannelItemsQuery,
    useGetChannelStockAvailabilityQuery,
    useCreateItemChannelMutation,
    useGetItemChannelsByItemQuery,
    useLazyGetItemChannelsByItemQuery,
    useToggleItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetChannelListingQuery,
    useSaveChannelListingMutation,
} = salesChannelApi;
