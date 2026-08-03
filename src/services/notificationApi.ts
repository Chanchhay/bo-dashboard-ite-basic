import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type { NotificationResponse } from "@/lib/api/notification";
import { notificationSocket } from "@/lib/notification-socket";

export const notificationApi = createApi({
    reducerPath: "notificationApi",

    baseQuery: fetchBaseQuery({
        baseUrl: "/api",
    }),

    tagTypes: ["Notification"],

    endpoints: (builder) => ({
        getReceivedNotifications: builder.query<
            NotificationResponse,
            {
                page?: number;
                size?: number;
                sort?: string;
            } | void
        >({
            query: (args) => {
                const page = args?.page ?? 0;
                const size = args?.size ?? 6;
                const sort = args?.sort ?? "DESC";
                return {
                    url: "/notification",
                    params: { page, size, sort },
                };
            },

            providesTags: ["Notification"],

            async onCacheEntryAdded(
                _arg,
                { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
            ) {
                try {
                    await cacheDataLoaded;
                } catch {
                    return;
                }

                const unsubscribe = notificationSocket.subscribe((newNotification) => {
                    updateCachedData((draft) => {
                        if (!draft || !draft.content) return;
                        const exists = draft.content.some((item) => item.id === newNotification.id);
                        if (!exists) {
                            draft.content.unshift(newNotification);
                            if (draft.page) {
                                draft.page.totalElements = (draft.page.totalElements || 0) + 1;
                            }
                        }
                    });
                });

                await cacheEntryRemoved;
                unsubscribe();
            },
        }),

        markAsRead: builder.mutation<void, string>({
            query: (id) => ({
                url: `/notification/${id}/read`,
                method: "PATCH",
            }),
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    notificationApi.util.updateQueryData(
                        "getReceivedNotifications",
                        undefined,
                        (draft) => {
                            if (!draft || !draft.content) return;
                            const target = draft.content.find((item) => item.id === id);
                            if (target) {
                                target.read = true;
                                target.readAt = new Date().toISOString();
                            }
                        }
                    )
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ["Notification"],
        }),

        markAllAsRead: builder.mutation<void, void>({
            query: () => ({
                url: "/notification/read-all",
                method: "PATCH",
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    notificationApi.util.updateQueryData(
                        "getReceivedNotifications",
                        undefined,
                        (draft) => {
                            if (!draft || !draft.content) return;
                            draft.content.forEach((item) => {
                                item.read = true;
                                item.readAt = new Date().toISOString();
                            });
                        }
                    )
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ["Notification"],
        }),
    }),
});

export const {
    useGetReceivedNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
} = notificationApi;