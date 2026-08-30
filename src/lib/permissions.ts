
import type { Permission } from "@/lib/api/permission-catalog";

export type { Permission };


export type GrantedPermissions = readonly string[];


export type PermissionRule = Permission | readonly Permission[];

export function can(granted: GrantedPermissions, rule?: PermissionRule) {
    if (rule === undefined) return true;

    return typeof rule === "string"
        ? granted.includes(rule)
        : rule.some((permission) => granted.includes(permission));
}
