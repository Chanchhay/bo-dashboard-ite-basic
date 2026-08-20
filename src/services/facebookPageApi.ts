import { baseApi } from "@/lib/baseApi";

export type FacebookPageSetting = {
    id: string | null;
    businessId: string;
    pageId: string | null;
    pageName: string | null;
    connected: boolean;
    active: boolean;
    welcomeMessage: string | null;
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
    }),
});

export const {
    useGetFacebookPageSettingQuery,
    useLazyGetFacebookConnectUrlQuery,
    useDisconnectFacebookPageMutation,
} = facebookPageApi;
