import { baseApi } from "@/lib/baseApi";
import type {
    Business,
    BusinessCategory,
    BusinessProfileInput,
} from "@/lib/api/business";

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
        // The two logo endpoints deliberately skip `invalidatesTags`: the
        // profile form runs them as one step of a save and the `PUT` that
        // follows refreshes the cached business once, instead of remounting
        // the form on top of a half-saved profile.
        uploadBusinessLogo: builder.mutation<Business, File>({
            query: (file) => {
                const body = new FormData();
                body.append("file", file);

                return {
                    url: "/business-profile/logo",
                    method: "POST",
                    body,
                };
            },
        }),
        deleteBusinessLogo: builder.mutation<Business, void>({
            query: () => ({
                url: "/business-profile/logo",
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
} = businessApi;
