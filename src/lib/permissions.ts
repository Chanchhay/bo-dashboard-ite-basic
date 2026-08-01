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
    BUSINESS_PROFILE: "business:profile",
    BUSINESS_CURRENCY: "business:currency",
    USERS_MANAGE: "users:manage",
    INVENTORY_MANAGE: "inventory:manage",
    INVENTORY_ITEMS: "inventory:items",
    INVENTORY_CATEGORIES: "inventory:categories",
    INVENTORY_STOCK: "inventory:stock",
    SALES_MANAGE: "sales:manage",
    SALES_ORDERS: "sales:orders",
    SALES_POS: "sales:pos",
    ANALYTICS_VIEW: "analytics:view",
    BILLING_MANAGE: "billing:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const BUSINESS_PERMISSIONS = [
    PERMISSIONS.BUSINESS_MANAGE,
    PERMISSIONS.BUSINESS_PROFILE,
    PERMISSIONS.BUSINESS_CURRENCY,
] as const;

const INVENTORY_PERMISSIONS = [
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.INVENTORY_ITEMS,
    PERMISSIONS.INVENTORY_CATEGORIES,
    PERMISSIONS.INVENTORY_STOCK,
] as const;

const SALES_PERMISSIONS = [
    PERMISSIONS.SALES_MANAGE,
    PERMISSIONS.SALES_ORDERS,
    PERMISSIONS.SALES_POS,
] as const;

/**
 * Keycloak role → permissions. Role names are matched case-insensitively and
 * with `-`/`_` treated the same, so `general-manager` and `GENERAL_MANAGER`
 * both land here. These named roles are retained for existing accounts; staff
 * created by a business are resolved from their concrete client permissions
 * below.
 */
export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
    OWNER: ALL_PERMISSIONS,
    BUSINESS_OWNER: ALL_PERMISSIONS,
    ADMIN: ALL_PERMISSIONS,
    GENERAL_MANAGER: [
        ...BUSINESS_PERMISSIONS,
        PERMISSIONS.USERS_MANAGE,
        ...INVENTORY_PERMISSIONS,
        ...SALES_PERMISSIONS,
        PERMISSIONS.ANALYTICS_VIEW,
    ],
    MANAGER: [
        ...INVENTORY_PERMISSIONS,
        ...SALES_PERMISSIONS,
        PERMISSIONS.ANALYTICS_VIEW,
    ],
    INVENTORY_STAFF: INVENTORY_PERMISSIONS,
    STOCK_KEEPER: [
        PERMISSIONS.INVENTORY_MANAGE,
        PERMISSIONS.INVENTORY_STOCK,
    ],
    CASHIER: [PERMISSIONS.SALES_MANAGE, PERMISSIONS.SALES_POS],
    STAFF: [],
    BUSINESS_STAFF: [],
    EMPLOYEE: [],
};

export function normalizeRole(role: string) {
    return role.trim().toUpperCase().replace(/-/g, "_");
}

export function permissionsForRoles(roles: readonly string[]): Permission[] {
    const granted = new Set<Permission>();

    for (const role of roles) {
        const namedRole = normalizeRole(role);
        for (const permission of ROLE_PERMISSIONS[namedRole] ?? []) {
            granted.add(permission);
        }

        const clientPermission = role.trim().toLowerCase();
        const [resource, action] = clientPermission.split(":");
        if (!resource || !action) continue;

        if (resource === "business") {
            granted.add(PERMISSIONS.BUSINESS_MANAGE);
            granted.add(PERMISSIONS.BUSINESS_PROFILE);
        } else if (resource === "currency") {
            granted.add(PERMISSIONS.BUSINESS_MANAGE);
            granted.add(PERMISSIONS.BUSINESS_CURRENCY);
        } else if (resource === "member" || resource === "role") {
            granted.add(PERMISSIONS.USERS_MANAGE);
        } else if (resource === "item") {
            granted.add(PERMISSIONS.INVENTORY_MANAGE);
            granted.add(PERMISSIONS.INVENTORY_ITEMS);
        } else if (resource === "item-group") {
            granted.add(PERMISSIONS.INVENTORY_MANAGE);
            granted.add(PERMISSIONS.INVENTORY_CATEGORIES);
        } else if (resource === "stock") {
            granted.add(PERMISSIONS.INVENTORY_MANAGE);
            granted.add(PERMISSIONS.INVENTORY_STOCK);
        } else if (resource === "unit") {
            granted.add(PERMISSIONS.INVENTORY_MANAGE);
        } else if (resource === "order") {
            granted.add(PERMISSIONS.SALES_MANAGE);

            if (action === "read" || action === "cancel") {
                granted.add(PERMISSIONS.SALES_ORDERS);
            }
            if (
                action === "create" ||
                action === "pay" ||
                action === "generate-khqr"
            ) {
                granted.add(PERMISSIONS.SALES_POS);
            }
        }
    }

    return [...granted];
}

export function can(
    permissions: readonly Permission[],
    required?: Permission,
) {
    return required === undefined || permissions.includes(required);
}
