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
    }),
});

export const {
    useGetBusinessProfileQuery,
    useGetBusinessCategoriesQuery,
    useUpdateBusinessProfileMutation,
} = businessApi;
