import { baseApi } from "@/lib/baseApi";
import type {
    AuditLogPage,
    AuditLogQuery,
    BusinessRole,
    BusinessRoleInput,
    CreateStaffInput,
    Staff,
    StaffStatus,
    UpdateStaffInput,
} from "@/lib/api/user-management";

export const userManagementApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getStaff: builder.query<Staff[], void>({
            query: () => "/user-management/staff",
            providesTags: (result) => [
                "Staff",
                ...(result || []).map((member) => ({
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
        getBusinessRoles: builder.query<BusinessRole[], void>({
            query: () => "/user-management/roles",
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
    useCreateStaffMutation,
    useUpdateStaffMutation,
    useUpdateStaffStatusMutation,
    useDeleteStaffMutation,
    useGetBusinessRolesQuery,
    useCreateBusinessRoleMutation,
    useUpdateBusinessRoleMutation,
    useDeleteBusinessRoleMutation,
    useGetAuditLogsQuery,
} = userManagementApi;
