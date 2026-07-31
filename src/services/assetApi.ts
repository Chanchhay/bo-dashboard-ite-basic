import { baseApi } from "@/lib/baseApi";
import type { UploadedAsset } from "@/lib/api/inventory";

// An asset belongs to whatever embeds its URL, so there is nothing to
// invalidate here — the form holding the URL owns it from now on.
export const assetApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        uploadAsset: builder.mutation<UploadedAsset, File>({
            query: (file) => {
                const body = new FormData();
                body.append("file", file, file.name);

                return { url: "/assets", method: "POST", body };
            },
        }),
        deleteAsset: builder.mutation<void, string>({
            query: (key) => ({
                url: `/assets/${encodeURIComponent(key)}`,
                method: "DELETE",
            }),
        }),
    }),
});

export const { useUploadAssetMutation, useDeleteAssetMutation } = assetApi;
