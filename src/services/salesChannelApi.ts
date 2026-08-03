import { baseApi } from "@/lib/baseApi";
import type {
    ChannelItem,
    CreateItemChannelInput,
    ItemChannel,
    SalesChannel,
    ToggleItemChannelInput,
} from "@/lib/api/sales-channels";

export const salesChannelApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /api/v1/sales-channels
        getSalesChannels: builder.query<SalesChannel[], void>({
            query: () => "/sales-channels",
            providesTags: ["SalesChannels"],
        }),

        // POST /api/v1/item-channels
        createItemChannel: builder.mutation<ItemChannel, CreateItemChannelInput>({
            query: (body) => ({
                url: "/item-channels",
                method: "POST",
                body,
            }),
            invalidatesTags: ["ItemChannels"],
        }),

        // GET /api/v1/sales-channels/{channelCode}/items
        // The items already published to a channel. Used for membership: the
        // backend answers with items, not item-channel links, so removing one
        // still needs its link id looked up by item.
        getChannelItems: builder.query<ChannelItem[], string>({
            query: (channelCode) => `/sales-channels/${channelCode}/items`,
            providesTags: (_result, _error, channelCode) => [
                { type: "ItemChannels", id: `channel-${channelCode}` },
                "ItemChannels",
            ],
        }),

        // GET /api/v1/item-channels/items/{itemId}
        getItemChannelsByItem: builder.query<ItemChannel[], string>({
            query: (itemId) => `/item-channels/items/${itemId}`,
            providesTags: (_result, _error, itemId) => [
                { type: "ItemChannels", id: itemId },
                "ItemChannels",
            ],
        }),

        // PATCH /api/v1/item-channels/{id}/toggle
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

        // DELETE /api/v1/item-channels/{id}
        deleteItemChannel: builder.mutation<void, string>({
            query: (id) => ({
                url: `/item-channels/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["ItemChannels"],
        }),

    }),
});

export const {
    useGetSalesChannelsQuery,
    useGetChannelItemsQuery,
    useCreateItemChannelMutation,
    useGetItemChannelsByItemQuery,
    useLazyGetItemChannelsByItemQuery,
    useToggleItemChannelMutation,
    useDeleteItemChannelMutation,
} = salesChannelApi;
