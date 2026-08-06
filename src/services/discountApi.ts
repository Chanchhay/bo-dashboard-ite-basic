import { baseApi } from "@/lib/baseApi";
import type {
    CouponResponse,
    CreateCouponInput,
    CreateDiscountInput,
    DiscountResponse,
    UpdateCouponInput,
    UpdateDiscountInput,
} from "@/lib/api/discount";

export const discountApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Discounts
        getDiscounts: builder.query<DiscountResponse[], void>({
            query: () => "/discounts",
            providesTags: ["Discounts"],
        }),
        getDiscountById: builder.query<DiscountResponse, string>({
            query: (id) => `/discounts/${id}`,
            providesTags: (_res, _err, id) => [{ type: "Discounts", id }],
        }),
        createDiscount: builder.mutation<DiscountResponse, CreateDiscountInput>({
            query: (body) => ({
                url: "/discounts",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Discounts"],
        }),
        updateDiscount: builder.mutation<
            DiscountResponse,
            { id: string; body: UpdateDiscountInput }
        >({
            query: ({ id, body }) => ({
                url: `/discounts/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Discounts"],
        }),
        activateDiscount: builder.mutation<DiscountResponse, string>({
            query: (id) => ({
                url: `/discounts/${id}/activate`,
                method: "PATCH",
            }),
            invalidatesTags: ["Discounts"],
        }),
        deactivateDiscount: builder.mutation<DiscountResponse, string>({
            query: (id) => ({
                url: `/discounts/${id}/deactivate`,
                method: "PATCH",
            }),
            invalidatesTags: ["Discounts"],
        }),
        deleteDiscount: builder.mutation<void, string>({
            query: (id) => ({
                url: `/discounts/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Discounts"],
        }),

        // Coupons
        getCoupons: builder.query<CouponResponse[], string | void>({
            query: (discountId) =>
                discountId ? `/coupons?discountId=${discountId}` : "/coupons",
            providesTags: ["Coupons"],
        }),
        createCoupon: builder.mutation<CouponResponse, CreateCouponInput>({
            query: (body) => ({
                url: "/coupons",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Coupons"],
        }),
        updateCoupon: builder.mutation<
            CouponResponse,
            { id: string; body: UpdateCouponInput }
        >({
            query: ({ id, body }) => ({
                url: `/coupons/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Coupons"],
        }),
        activateCoupon: builder.mutation<CouponResponse, string>({
            query: (id) => ({
                url: `/coupons/${id}/activate`,
                method: "PATCH",
            }),
            invalidatesTags: ["Coupons"],
        }),
        deactivateCoupon: builder.mutation<CouponResponse, string>({
            query: (id) => ({
                url: `/coupons/${id}/deactivate`,
                method: "PATCH",
            }),
            invalidatesTags: ["Coupons"],
        }),
        deleteCoupon: builder.mutation<void, string>({
            query: (id) => ({
                url: `/coupons/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Coupons"],
        }),
    }),
});

export const {
    useGetDiscountsQuery,
    useGetDiscountByIdQuery,
    useCreateDiscountMutation,
    useUpdateDiscountMutation,
    useActivateDiscountMutation,
    useDeactivateDiscountMutation,
    useDeleteDiscountMutation,
    useGetCouponsQuery,
    useCreateCouponMutation,
    useUpdateCouponMutation,
    useActivateCouponMutation,
    useDeactivateCouponMutation,
    useDeleteCouponMutation,
} = discountApi;
