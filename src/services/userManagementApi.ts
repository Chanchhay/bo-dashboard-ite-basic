import { baseApi } from "@/lib/baseApi";
import type {
    AuditLogPage,
    AuditLogQuery,
    BusinessRole,
    BusinessRoleInput,
    BusinessRolePage,
    CreateStaffInput,
    Staff,
    StaffPage,
    StaffStatus,
    UpdateStaffInput,
} from "@/lib/api/user-management";

export const userManagementApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /** Every staff member, unpaged — for lookups (Stock movement "by"). */
        getStaff: builder.query<Staff[], void>({
            query: () => "/user-management/staff",
            transformResponse: (response: StaffPage) =>
                response.content ?? [],
            providesTags: (result) => [
                "Staff",
                ...(result || []).map((member: Staff) => ({
                    type: "Staff" as const,
                    id: member.id,
                })),
            ],
        }),
        /** One page of staff, for the Staff management list. */
        getStaffPage: builder.query<StaffPage, { page: number; size: number }>({
            query: (params) => ({ url: "/user-management/staff", params }),
            providesTags: (result) => [
                "Staff",
                ...(result?.content || []).map((member: Staff) => ({
                    type: "Staff" as const,
                    id: member.id,
                })),
            ],
        }),
        createStaff: builder.mutation<void, CreateStaffInput>({
            query: (body) => ({
                url: "/user-management/staff",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Staff"],
        }),
        updateStaff: builder.mutation<
            void,
            { userId: string; body: UpdateStaffInput }
        >({
            query: ({ userId, body }) => ({
                url: `/user-management/staff/${encodeURIComponent(userId)}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_result, _error, { userId }) => [
                "Staff",
                { type: "Staff", id: userId },
            ],
        }),
        updateStaffStatus: builder.mutation<
            void,
            { userId: string; status: StaffStatus }
        >({
            query: ({ userId, status }) => ({
                url: `/user-management/staff/${encodeURIComponent(userId)}/status`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: (_result, _error, { userId }) => [
                "Staff",
                { type: "Staff", id: userId },
            ],
        }),
        deleteStaff: builder.mutation<void, string>({
            query: (userId) => ({
                url: `/user-management/staff/${encodeURIComponent(userId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Staff"],
        }),
        /** Every role, unpaged — for lookups (Staff form role picker). */
        getBusinessRoles: builder.query<BusinessRole[], void>({
            query: () => "/user-management/roles",
            transformResponse: (response: BusinessRolePage) =>
                response.content ?? [],
            providesTags: ["BusinessRoles"],
        }),
        /** One page of roles, for the Roles management list. */
        getBusinessRolesPage: builder.query<
            BusinessRolePage,
            { page: number; size: number }
        >({
            query: (params) => ({ url: "/user-management/roles", params }),
            providesTags: ["BusinessRoles"],
        }),
        createBusinessRole: builder.mutation<void, BusinessRoleInput>({
            query: (body) => ({
                url: "/user-management/roles",
                method: "POST",
                body,
            }),
            invalidatesTags: ["BusinessRoles"],
        }),
        updateBusinessRole: builder.mutation<
            void,
            { roleId: string; body: BusinessRoleInput }
        >({
            query: ({ roleId, body }) => ({
                url: `/user-management/roles/${encodeURIComponent(roleId)}`,
                method: "PUT",
                body,
            }),
            // Staff carry a roleId, so their effective permissions change too.
            invalidatesTags: ["BusinessRoles", "Staff"],
        }),
        deleteBusinessRole: builder.mutation<void, string>({
            query: (roleId) => ({
                url: `/user-management/roles/${encodeURIComponent(roleId)}`,
                method: "DELETE",
            }),
            invalidatesTags: ["BusinessRoles", "Staff"],
        }),
        getAuditLogs: builder.query<AuditLogPage, AuditLogQuery>({
            query: (params) => ({
                url: "/user-management/audit-logs",
                params: Object.fromEntries(
                    Object.entries(params).filter(
                        ([, value]) => value !== undefined && value !== "",
                    ),
                ),
            }),
            providesTags: ["AuditLogs"],
        }),
    }),
});

export const {
    useGetStaffQuery,
    useGetStaffPageQuery,
    useCreateStaffMutation,
    useUpdateStaffMutation,
    useUpdateStaffStatusMutation,
    useDeleteStaffMutation,
    useGetBusinessRolesQuery,
    useGetBusinessRolesPageQuery,
    useCreateBusinessRoleMutation,
    useUpdateBusinessRoleMutation,
    useDeleteBusinessRoleMutation,
    useGetAuditLogsQuery,
} = userManagementApi;