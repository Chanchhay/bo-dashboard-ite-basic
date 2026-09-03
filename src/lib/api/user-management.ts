import { z } from "zod";
import type { PageResult } from "./pagination";


export const staffStatuses = ["ACTIVE", "INACTIVE"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export type Staff = {
    id: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    gender?: string;
    status?: StaffStatus;
    /**
     * The API moved from one role per person to a list. The form still offers
     * a single choice, so this is normally zero or one entry — but read it
     * through `staffRoleId`, because another client can assign several and the
     * old singular `roleId` field no longer exists on the response.
     */
    roleIds?: string[];
};

/** The role shown for a staff member: the first, when several are assigned. */
export function staffRoleId(staff: Staff) {
    return staff.roleIds?.[0];
}

export type StaffPage = PageResult<Staff>;

export const genders = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;

const requiredText = (max: number, message: string) =>
    z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);


export const createStaffSchema = z.object({
    username: requiredText(255, "Username is required."),
    email: z.email("Enter a valid email address."),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters.")
        .max(255, "Use 255 characters or fewer."),
    firstName: requiredText(255, "First name is required."),
    lastName: requiredText(255, "Last name is required."),
    phoneNumber: z
        .string()
        .trim()
        .min(8, "Phone number must be at least 8 characters.")
        .max(30, "Use 30 characters or fewer.")
        .regex(/^\+?[0-9 ]+$/, "Use digits, spaces and an optional leading +."),
    gender: z.enum(genders, "Select a gender."),
    roleId: z.string().trim(),
});


export const updateStaffSchema = createStaffSchema.omit({
    username: true,
    email: true,
    password: true,
});

export const staffStatusSchema = z.object({
    status: z.enum(staffStatuses),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffStatusInput = z.infer<typeof staffStatusSchema>;


/**
 * Shapes a form value for the API, which takes `roleIds` as a list.
 *
 * Sending the old singular `roleId` did not merely fail to assign. On update
 * the backend clears every `biz_*` role it finds and then adds back whatever
 * arrived in `roleIds`, so a field it does not recognise meant each save
 * silently stripped the person's role — including a save that only changed
 * their phone number.
 *
 * Omitted entirely when nothing is chosen. That is not a no-op: the backend
 * still clears the existing roles, which is exactly what picking "No role"
 * should do. There is no way to say "leave the roles as they are", so every
 * save has to send the full intended set.
 */
export function toStaffRequest<T extends { roleId: string }>(input: T) {
    const { roleId, ...rest } = input;
    return roleId ? { ...rest, roleIds: [roleId] } : rest;
}

export function staffFullName(staff: Staff) {
    const name = [staff.firstName, staff.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return name || staff.username || staff.email || "Unnamed user";
}


export type BusinessRole = {
    id: string;
    name?: string;
    permissions?: string[];
};

export type BusinessRolePage = PageResult<BusinessRole>;

export const businessRoleSchema = z.object({
    name: requiredText(150, "Role name is required."),
    permissions: z.array(z.string()),
});

export type BusinessRoleInput = z.infer<typeof businessRoleSchema>;


export const auditActionTypes = [
    "BUSINESS_ACTIVATED",
    "BUSINESS_SUSPENDED",
    "BUSINESS_ENABLED",
    "BUSINESS_DISABLED",
    "BUSINESS_CLOSED",
    "BUSINESS_REOPENED",
    "BUSINESS_DELETED",
    "BUSINESS_CATEGORY_CREATED",
    "BUSINESS_CATEGORY_UPDATED",
    "BUSINESS_CATEGORY_DELETED",
    "UNIT_CREATED",
    "UNIT_UPDATED",
    "UNIT_DELETED",
    "BUSINESS_FEATURE_ENABLED",
    "BUSINESS_FEATURE_DISABLED",
    "PLATFORM_FEATURE_ENABLED",
    "PLATFORM_FEATURE_DISABLED",
] as const;

export const auditTargetTypes = [
    "BUSINESS",
    "BUSINESS_CATEGORY",
    "UNIT",
    "REALM_ROLE",
    "PLATFORM_USER",
    "BUSINESS_ROLE",
    "BUSINESS_FEATURE",
    "PLATFORM_FEATURE",
] as const;

export type AuditActionType = (typeof auditActionTypes)[number];
export type AuditTargetType = (typeof auditTargetTypes)[number];

export type AuditLog = {
    id: string;
    actorId?: string;
    actorUsername?: string;
    actionType?: AuditActionType;
    targetType?: AuditTargetType;
    targetId?: string;
    targetLabel?: string;
    previousState?: string;
    newState?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: string;
};

export type PageMetadata = {
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
};

export type AuditLogPage = {
    content?: AuditLog[];
    page?: PageMetadata;
};

export type AuditLogQuery = {
    actionType?: string;
    targetType?: string;
    keyword?: string;
    page?: number;
    size?: number;
};


export function humanizeEnum(value: string | undefined) {
    if (!value) return "—";

    const words = value.toLowerCase().replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}