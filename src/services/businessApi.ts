import { baseApi } from "@/lib/baseApi";
import type {
    Business,
    BusinessCategory,
    BusinessProfileInput,
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
        updateBusinessProfile: builder.mutation<
            Business,
            BusinessProfileInput
        >({
            query: (body) => ({
                url: "/business-profile",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Business"],
        }),
        // The four picture endpoints deliberately skip `invalidatesTags`: the
        // profile form runs them as one step of a save and the `PUT` that
        // follows refreshes the cached business once, instead of remounting
        // the form on top of a half-saved profile.
        uploadBusinessLogo: builder.mutation<Business, File>({
            query: (file) => uploadImage("/business-profile/logo", file),
        }),
        deleteBusinessLogo: builder.mutation<Business, void>({
            query: () => ({
                url: "/business-profile/logo",
                method: "DELETE",
            }),
        }),
        uploadBusinessThumbnail: builder.mutation<Business, File>({
            query: (file) => uploadImage("/business-profile/thumbnail", file),
        }),
        deleteBusinessThumbnail: builder.mutation<Business, void>({
            query: () => ({
                url: "/business-profile/thumbnail",
                method: "DELETE",
            }),
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
} = businessApi;
