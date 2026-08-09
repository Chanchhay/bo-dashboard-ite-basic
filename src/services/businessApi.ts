import { baseApi } from "@/lib/baseApi";
import type {
    Business,
    BusinessCategory,
    BusinessProfileInput,
    StorefrontStatus,
} from "@/lib/api/business";

/** Both pictures post the same single `file` part to their own route. */
function uploadImage(url: string, file: File) {
    const body = new FormData();
    body.append("file", file, file.name);

    return { url, method: "POST", body };
}

export const businessApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBusinessProfile: builder.query<Business, void>({
            query: () => "/business-profile",
            providesTags: ["Business"],
        }),
        getBusinessCategories: builder.query<BusinessCategory[], void>({
            query: () => "/business-categories",
            providesTags: ["BusinessCategories"],
        }),
        updateBusinessProfile: builder.mutation<Business, BusinessProfileInput>({
            query: (body) => ({
                url: "/business-profile",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Business"],
        }),
        uploadBusinessLogo: builder.mutation<Business, File>({
            query: (file) => uploadImage("/business-profile/logo", file),
            invalidatesTags: ["Business"],
        }),
        deleteBusinessLogo: builder.mutation<Business, void>({
            query: () => ({
                url: "/business-profile/logo",
                method: "DELETE",
            }),
            invalidatesTags: ["Business"],
        }),
        uploadBusinessThumbnail: builder.mutation<Business, File>({
            query: (file) => uploadImage("/business-profile/thumbnail", file),
            invalidatesTags: ["Business"],
        }),
        deleteBusinessThumbnail: builder.mutation<Business, void>({
            query: () => ({
                url: "/business-profile/thumbnail",
                method: "DELETE",
            }),
            invalidatesTags: ["Business"],
        }),
   
        getStorefrontStatus: builder.query<StorefrontStatus, void>({
            query: () => "/business-profile/storefront",
            providesTags: ["Storefront"],
        }),
        enableStorefront: builder.mutation<StorefrontStatus, void>({
            query: () => ({
                url: "/business-profile/storefront/enable",
                method: "PATCH",
            }),
            invalidatesTags: ["Storefront"],
        }),
        disableStorefront: builder.mutation<StorefrontStatus, void>({
            query: () => ({
                url: "/business-profile/storefront/disable",
                method: "PATCH",
            }),
            invalidatesTags: ["Storefront"],
        }),
    }),
});

export const {
    useGetBusinessProfileQuery,
    useGetBusinessCategoriesQuery,
    useUpdateBusinessProfileMutation,
    useUploadBusinessLogoMutation,
    useDeleteBusinessLogoMutation,
    useUploadBusinessThumbnailMutation,
    useDeleteBusinessThumbnailMutation,
    useGetStorefrontStatusQuery,
    useEnableStorefrontMutation,
    useDisableStorefrontMutation,
} = businessApi;