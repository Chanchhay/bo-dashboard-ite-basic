import { baseApi } from "@/lib/baseApi";
import type { BakongSettingsInput, KhqrPreviewInput } from "@/lib/api/bakong";
import type { BakongSettings } from "@/lib/api/bakong";
import type { Khqr } from "@/lib/api/pos-order";

type BakongState = {
    configured: boolean;
    active: boolean;
    settings: BakongSettings | null;
};

export const bakongApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBakongSettings: builder.query<BakongState, void>({
            query: () => "/payment-settings/bakong",
            providesTags: ["BakongSettings"],
        }),

        saveBakongSettings: builder.mutation<BakongState, BakongSettingsInput>({
            query: (body) => ({
                url: "/payment-settings/bakong",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["BakongSettings"],
        }),

        setBakongActive: builder.mutation<BakongState, boolean>({
            query: (active) => ({
                url: "/payment-settings/bakong/activate",
                method: "PATCH",
                body: { active },
            }),
            invalidatesTags: ["BakongSettings"],
        }),

        /** A throwaway code, to prove the configuration works. */
        previewKhqr: builder.mutation<Khqr, KhqrPreviewInput>({
            query: (body) => ({
                url: "/payment-settings/bakong/preview-qr",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useGetBakongSettingsQuery,
    useSaveBakongSettingsMutation,
    useSetBakongActiveMutation,
    usePreviewKhqrMutation,
} = bakongApi;
