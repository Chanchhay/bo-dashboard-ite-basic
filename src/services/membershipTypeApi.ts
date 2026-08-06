import { baseApi } from "@/lib/baseApi";
import type {
    CreateMembershipTypeInput,
    MembershipTypeResponse,
    UpdateMembershipTypeInput,
} from "@/lib/api/membership-type";

export const membershipTypeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMembershipTypes: builder.query<MembershipTypeResponse[], void>({
            query: () => "/membership-types",
            providesTags: ["MembershipTypes"],
        }),
        getMembershipTypeById: builder.query<MembershipTypeResponse, string>({
            query: (id) => `/membership-types/${id}`,
            providesTags: (_res, _err, id) => [{ type: "MembershipTypes", id }],
        }),
        createMembershipType: builder.mutation<
            MembershipTypeResponse,
            CreateMembershipTypeInput
        >({
            query: (body) => ({
                url: "/membership-types",
                method: "POST",
                body,
            }),
            invalidatesTags: ["MembershipTypes"],
        }),
        updateMembershipType: builder.mutation<
            MembershipTypeResponse,
            { id: string; body: UpdateMembershipTypeInput }
        >({
            query: ({ id, body }) => ({
                url: `/membership-types/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["MembershipTypes"],
        }),
        activateMembershipType: builder.mutation<MembershipTypeResponse, string>({
            query: (id) => ({
                url: `/membership-types/${id}/activate`,
                method: "PATCH",
            }),
            invalidatesTags: ["MembershipTypes"],
        }),
        deactivateMembershipType: builder.mutation<MembershipTypeResponse, string>({
            query: (id) => ({
                url: `/membership-types/${id}/deactivate`,
                method: "PATCH",
            }),
            invalidatesTags: ["MembershipTypes"],
        }),
        deleteMembershipType: builder.mutation<void, string>({
            query: (id) => ({
                url: `/membership-types/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["MembershipTypes"],
        }),
    }),
});

export const {
    useGetMembershipTypesQuery,
    useGetMembershipTypeByIdQuery,
    useCreateMembershipTypeMutation,
    useUpdateMembershipTypeMutation,
    useActivateMembershipTypeMutation,
    useDeactivateMembershipTypeMutation,
    useDeleteMembershipTypeMutation,
} = membershipTypeApi;
