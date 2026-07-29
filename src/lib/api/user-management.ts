import { z } from "zod";

/* ------------------------------ Staff ------------------------------- */
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
    roleId?: string;
};

export const genders = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;

const requiredText = (max: number, message: string) =>
    z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);

/** Matches CreateStaffRequest in the OpenAPI document. */
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

/** Matches UpdateStaffRequest — no username, email or password. */
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

/** The backend rejects an empty `roleId`, so send it only when chosen. */
export function toStaffRequest<T extends { roleId: string }>(input: T) {
    const { roleId, ...rest } = input;
    return roleId ? { ...rest, roleId } : rest;
}

export function staffFullName(staff: Staff) {
    const name = [staff.firstName, staff.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return name || staff.username || staff.email || "Unnamed user";
}

/* ------------------------------ Roles ------------------------------- */
export type BusinessRole = {
    id: string;
    name?: string;
    permissions?: string[];
};

export const businessRoleSchema = z.object({
    name: requiredText(150, "Role name is required."),
    permissions: z.array(z.string()),
});

export type BusinessRoleInput = z.infer<typeof businessRoleSchema>;

/* ---------------------------- Audit logs ---------------------------- */
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

/** `BUSINESS_CATEGORY_UPDATED` → `Business category updated`. */
export function humanizeEnum(value: string | undefined) {
    if (!value) return "—";

    const words = value.toLowerCase().replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}
