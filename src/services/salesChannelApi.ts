import { baseApi } from "@/lib/baseApi";
import type {
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

        enableItemSale: builder.mutation<void, string>({
            query: (id) => ({
                url: `/item-channels/${id}/toggle`, 
                method: "PATCH",
            }),
            invalidatesTags: ["ItemChannels"],
        }),
    }),
});

export const {
    useGetSalesChannelsQuery,
    useCreateItemChannelMutation,
    useGetItemChannelsByItemQuery,
    useToggleItemChannelMutation,
    useDeleteItemChannelMutation,
    useEnableItemSaleMutation,
} = salesChannelApi;
