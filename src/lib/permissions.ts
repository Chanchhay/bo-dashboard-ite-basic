/**
 * Matching a user's granted permissions against what a screen requires.
 *
 * The vocabulary itself lives in `@/lib/api/permission-catalog` and comes from
 * Keycloak; this module only answers "does this user hold what this entry
 * asks for". There is no translation layer and no hardcoded role → permission
 * table: a role is whatever composite of permissions the business built for
 * it, so the only thing that can be reasoned about is the permissions
 * themselves.
 *
 * These gate *navigation affordances only* — which apps appear in the launcher
 * and which sections appear in the sidebar. They are not a security boundary:
 * the backend still authorizes every request, and a user who types a URL
 * directly is stopped there, not here.
 *
 * This module stays free of server-only imports so client components can use
 * it. Reading the access token lives in `permissions-server.ts`.
 */
import type { Permission } from "@/lib/api/permission-catalog";

export type { Permission };

/**
 * What a user holds. Kept as plain strings rather than `Permission[]` because
 * it originates in a token: Keycloak may hand us a name this build has never
 * heard of, and that should be ignored, not crash a render.
 */
export type GrantedPermissions = readonly string[];

/**
 * What an entry requires. A single permission, or several of which *any one*
 * suffices — a section opens if the user can reach at least one page inside
 * it. Undefined means the entry is open to everyone.
 */
export type PermissionRule = Permission | readonly Permission[];

export function can(granted: GrantedPermissions, rule?: PermissionRule) {
    if (rule === undefined) return true;

    return typeof rule === "string"
        ? granted.includes(rule)
        : rule.some((permission) => granted.includes(permission));
}
