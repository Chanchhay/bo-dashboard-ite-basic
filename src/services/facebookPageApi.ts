import { baseApi } from "@/lib/baseApi";

export type FacebookPageSetting = {
    id: string | null;
    businessId: string;
    pageId: string | null;
    pageName: string | null;
    connected: boolean;
    active: boolean;
    welcomeMessage: string | null;
    miniAppEnabled: boolean;
    /** Where the persistent menu's "Open Shop" button points when miniAppEnabled — null otherwise. */
    miniAppUrl: string | null;
};

export const facebookPageApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getFacebookPageSetting: build.query<FacebookPageSetting, void>({
            query: () => "/businesses/social-settings/facebook",
            providesTags: ["FacebookPage"],
        }),
        getFacebookConnectUrl: build.query<{ url: string }, void>({
            query: () => "/businesses/social-settings/facebook/connect-url",
        }),
        disconnectFacebookPage: build.mutation<void, void>({
            query: () => ({
                url: "/businesses/social-settings/facebook",
                method: "DELETE",
            }),
            invalidatesTags: ["FacebookPage"],
        }),
        activateFacebookPage: build.mutation<FacebookPageSetting, void>({
            query: () => ({
                url: "/businesses/social-settings/facebook/activate",
                method: "PATCH",
            }),
            invalidatesTags: ["FacebookPage"],
        }),
        deactivateFacebookPage: build.mutation<FacebookPageSetting, void>({
            query: () => ({
                url: "/businesses/social-settings/facebook/deactivate",
                method: "PATCH",
            }),
            invalidatesTags: ["FacebookPage"],
        }),
        setFacebookMiniAppEnabled: build.mutation<FacebookPageSetting, boolean>({
            query: (enabled) => ({
                url: `/businesses/social-settings/facebook/mini-app?enabled=${enabled}`,
                method: "PATCH",
            }),
            invalidatesTags: ["FacebookPage"],
        }),
    }),
});

export const {
    useGetFacebookPageSettingQuery,
    useLazyGetFacebookConnectUrlQuery,
    useDisconnectFacebookPageMutation,
    useActivateFacebookPageMutation,
    useDeactivateFacebookPageMutation,
    useSetFacebookMiniAppEnabledMutation,
} = facebookPageApi;
