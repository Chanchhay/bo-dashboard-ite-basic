/**
 * What a user is allowed to reach in the UI.
 *
 * These gate *navigation affordances only* — which apps appear in the launcher
 * and which sections appear in the sidebar. They are not a security boundary:
 * the backend still authorizes every request, and a user who types a URL
 * directly is stopped there, not here.
 *
 * This module stays free of server-only imports so client components can use
 * the constants. Role resolution lives in `permissions-server.ts`.
 */
export const PERMISSIONS = {
    BUSINESS_MANAGE: "business:manage",
    USERS_MANAGE: "users:manage",
    INVENTORY_MANAGE: "inventory:manage",
    SALES_MANAGE: "sales:manage",
    ANALYTICS_VIEW: "analytics:view",
    BILLING_MANAGE: "billing:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Keycloak role → permissions. Role names are matched case-insensitively and
 * with `-`/`_` treated the same, so `general-manager` and `GENERAL_MANAGER`
 * both land here. Add rows as you define roles in Keycloak.
 */
export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
    OWNER: ALL_PERMISSIONS,
    BUSINESS_OWNER: ALL_PERMISSIONS,
    ADMIN: ALL_PERMISSIONS,
    GENERAL_MANAGER: [
        PERMISSIONS.BUSINESS_MANAGE,
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.INVENTORY_MANAGE,
        PERMISSIONS.SALES_MANAGE,
        PERMISSIONS.ANALYTICS_VIEW,
    ],
    MANAGER: [
        PERMISSIONS.INVENTORY_MANAGE,
        PERMISSIONS.SALES_MANAGE,
        PERMISSIONS.ANALYTICS_VIEW,
    ],
    INVENTORY_STAFF: [PERMISSIONS.INVENTORY_MANAGE],
    STOCK_KEEPER: [PERMISSIONS.INVENTORY_MANAGE],
    CASHIER: [PERMISSIONS.SALES_MANAGE],
};

export function normalizeRole(role: string) {
    return role.trim().toUpperCase().replace(/-/g, "_");
}

export function permissionsForRoles(roles: readonly string[]): Permission[] {
    const known = roles.map(normalizeRole).filter((r) => r in ROLE_PERMISSIONS);

    // No role in the token maps to anything we know about — most likely roles
    // simply aren't configured in Keycloak yet. Hiding every app would leave a
    // blank launcher, so navigation stays open and the backend does the real
    // gating. As soon as one known role appears, we honour it strictly.
    if (known.length === 0) return [...ALL_PERMISSIONS];

    const granted = new Set<Permission>();
    for (const role of known) {
        for (const permission of ROLE_PERMISSIONS[role]) granted.add(permission);
    }

    return [...granted];
}

export function can(
    permissions: readonly Permission[],
    required?: Permission,
) {
    return required === undefined || permissions.includes(required);
}
