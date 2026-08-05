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
                type?: string;
                isRead?: boolean;
            } | void
        >({
            query: (args) => {
                const page = args?.page ?? 0;
                const size = args?.size ?? 20;
                const sort = args?.sort ?? "createdDate,desc";
                const params: Record<string, any> = { page, size, sort };
                if (args?.type) params.type = args.type;
                if (args?.isRead !== undefined) params.isRead = args.isRead;

                return {
                    url: "/notification",
                    params,
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
            async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
                const updateFn = (draft: any) => {
                    if (!draft || !draft.content) return;
                    const target = draft.content.find((item: any) => item.id === id);
                    if (target) {
                        target.read = true;
                        target.readAt = new Date().toISOString();
                    }
                };
                const patches: any[] = [
                    dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", undefined, updateFn)),
                ];
                const state = getState() as any;
                const queries = state?.notificationApi?.queries || {};
                for (const key of Object.keys(queries)) {
                    if (key.startsWith("getReceivedNotifications(")) {
                        const originalArgs = queries[key]?.originalArgs;
                        if (originalArgs) {
                            patches.push(dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", originalArgs, updateFn)));
                        }
                    }
                }
                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p?.undo?.());
                }
            },
            invalidatesTags: ["Notification"],
        }),

        markAllAsRead: builder.mutation<void, void>({
            query: () => ({
                url: "/notification/read-all",
                method: "PATCH",
            }),
            async onQueryStarted(_, { dispatch, getState, queryFulfilled }) {
                const updateFn = (draft: any) => {
                    if (!draft || !draft.content) return;
                    draft.content.forEach((item: any) => {
                        item.read = true;
                        item.readAt = new Date().toISOString();
                    });
                };
                const patches: any[] = [
                    dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", undefined, updateFn)),
                ];
                const state = getState() as any;
                const queries = state?.notificationApi?.queries || {};
                for (const key of Object.keys(queries)) {
                    if (key.startsWith("getReceivedNotifications(")) {
                        const originalArgs = queries[key]?.originalArgs;
                        if (originalArgs) {
                            patches.push(dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", originalArgs, updateFn)));
                        }
                    }
                }
                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p?.undo?.());
                }
            },
            invalidatesTags: ["Notification"],
        }),

        deleteNotification: builder.mutation<void, { id: string; permanent?: boolean }>({
            query: ({ id, permanent }) => ({
                url: `/notification/${id}${permanent ? "?permanent=true" : ""}`,
                method: "DELETE",
            }),
            async onQueryStarted({ id }, { dispatch, getState, queryFulfilled }) {
                const updateFn = (draft: any) => {
                    if (!draft || !draft.content) return;
                    draft.content = draft.content.filter((item: any) => item.id !== id);
                    if (draft.page && draft.page.totalElements) {
                        draft.page.totalElements = Math.max(0, draft.page.totalElements - 1);
                    }
                };
                const patches: any[] = [
                    dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", undefined, updateFn)),
                ];
                const state = getState() as any;
                const queries = state?.notificationApi?.queries || {};
                for (const key of Object.keys(queries)) {
                    if (key.startsWith("getReceivedNotifications(")) {
                        const originalArgs = queries[key]?.originalArgs;
                        if (originalArgs) {
                            patches.push(dispatch(notificationApi.util.updateQueryData("getReceivedNotifications", originalArgs, updateFn)));
                        }
                    }
                }
                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p?.undo?.());
                }
            },
            invalidatesTags: ["Notification"],
        }),

        createNotification: builder.mutation<
            { id: string; count: number },
            {
                senderId: string;
                senderName?: string;
                receiverIds: string[];
                type: "ORDER" | "PAYMENT" | "INVENTORY" | "SYSTEM" | "PROMOTION";
                title: string;
                content?: string;
                deepLink?: string;
            }
        >({
            query: (body) => ({
                url: "/notification",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Notification"],
        }),
    }),
});

export const {
    useGetReceivedNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    useDeleteNotificationMutation,
    useCreateNotificationMutation,
} = notificationApi;