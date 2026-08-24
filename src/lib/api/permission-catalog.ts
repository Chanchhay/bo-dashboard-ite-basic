/**
 * The permission vocabulary, mirrored from the Keycloak client-role export in
 * `api-docs/keycloak-client-role.json` (client `fluxipos-backend`). Keycloak
 * remains the source of truth; this file gives the same names human labels, a
 * stable grouping, and — through the `Permission` union below — compile-time
 * checking wherever the app names one.
 *
 * There is only one permission vocabulary in this app. A business role is a
 * composite of these names, the access token carries the ones a user was
 * granted, and the navigation gates on them directly. Nothing translates
 * between two sets of names, so a permission added in Keycloak reaches the UI
 * by being added to this list and nowhere else.
 *
 * `scope: "platform"` covers the `admin-*` roles, which belong to platform
 * administration (`/api/v1/platform/roles`) rather than to a business role, so
 * the business role editor leaves them out.
 */
export type PermissionOption = {
    readonly value: string;
    readonly label: string;
    /**
     * Mirrors `businessStaffAssignable` / `platformStaffAssignable` on the
     * backend's `PermissionCode` enum. `KeycloakRoleAdapter` rejects anything
     * a role editor is not allowed to grant with a 403, and rolls the whole
     * role back, so offering one of these in the picker produces a role that
     * cannot be saved. Some permissions are assignable to neither: they reach
     * a user through a built-in realm role instead — `profile:*` through
     * `USER`, `business:create` / `business:delete` through `BUSINESS`.
     */
    readonly businessAssignable: boolean;
    readonly platformAssignable: boolean;
};

export type PermissionGroup = {
    readonly id: string;
    readonly label: string;
    /** Which editor the group belongs in; assignability is per permission. */
    readonly scope: "business" | "platform";
    readonly permissions: readonly PermissionOption[];
};

/**
 * `as const satisfies` is load-bearing: it keeps every `value` a string
 * literal so `Permission` below is a union of the real names, which is what
 * turns a typo in a navigation gate into a build error.
 */
export const PERMISSION_GROUPS = [
    {
        id: "admin-audit",
        label: "Audit log",
        scope: "platform",
        permissions: [{
                value: "admin-audit:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: true,
            }],
    },
    {
        id: "admin-business",
        label: "Businesses",
        scope: "platform",
        permissions: [
            {
                value: "admin-business:delete",
                label: "Delete",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-business:manage",
                label: "Manage",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-business:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "admin-category",
        label: "Business categories",
        scope: "platform",
        permissions: [
            {
                value: "admin-category:create",
                label: "Create",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:delete",
                label: "Delete",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:update",
                label: "Edit",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "admin-dashboard",
        label: "Platform dashboard",
        scope: "platform",
        permissions: [{
                value: "admin-dashboard:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: true,
            }],
    },
    {
        id: "admin-unit",
        label: "Units",
        scope: "platform",
        permissions: [
            {
                value: "admin-unit:create",
                label: "Create",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:delete",
                label: "Delete",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:update",
                label: "Edit",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "bakong-setting",
        label: "Bakong payments",
        scope: "business",
        permissions: [
            {
                value: "bakong-setting:preview",
                label: "Preview",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "bakong-setting:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "bakong-setting:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "business",
        label: "Business",
        scope: "business",
        permissions: [
            {
                value: "business:create",
                label: "Create",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "business:delete",
                label: "Delete",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "business:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "business:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "currency",
        label: "Currencies",
        scope: "business",
        permissions: [
            {
                value: "currency:create",
                label: "Create",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:delete",
                label: "Delete",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:set-base",
                label: "Set base",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:set-display",
                label: "Set display",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "item",
        label: "Items",
        scope: "business",
        permissions: [
            {
                value: "item:create",
                label: "Create",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:delete",
                label: "Delete",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "item-group",
        label: "Item groups",
        scope: "business",
        permissions: [
            {
                value: "item-group:create",
                label: "Create",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:delete",
                label: "Delete",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "member",
        label: "Members",
        scope: "business",
        permissions: [
            {
                value: "member:manage",
                label: "Manage",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "member:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "order",
        label: "Orders",
        scope: "business",
        permissions: [
            {
                value: "order:cancel",
                label: "Cancel",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:create",
                label: "Create",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:generate-khqr",
                label: "Generate KHQR",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:pay",
                label: "Take payment",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "profile",
        label: "Profile",
        scope: "business",
        permissions: [
            {
                value: "profile:read",
                label: "View",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "profile:update",
                label: "Edit",
                businessAssignable: false,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "role",
        label: "Roles",
        scope: "business",
        permissions: [
            {
                value: "role:assign",
                label: "Assign",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:create",
                label: "Create",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:delete",
                label: "Delete",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "stock",
        label: "Stock",
        scope: "business",
        permissions: [
            {
                value: "stock:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "stock:write",
                label: "Write",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "storefront",
        label: "Storefront",
        scope: "business",
        permissions: [
            {
                value: "storefront:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "storefront:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "telegram-setting",
        label: "Telegram",
        scope: "business",
        permissions: [
            {
                value: "telegram-setting:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "telegram-setting:update",
                label: "Edit",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "unit",
        label: "Units",
        scope: "business",
        permissions: [{
                value: "unit:read",
                label: "View",
                businessAssignable: true,
                platformAssignable: false,
            }],
    },
] as const satisfies readonly PermissionGroup[];

/**
 * Every permission Keycloak can grant, as a union. Anything that names a
 * permission — a navigation gate, a page guard — should use this type rather
 * than `string`, so a rename in Keycloak surfaces here as a type error instead
 * of as a menu that silently stops appearing.
 */
export type Permission =
    (typeof PERMISSION_GROUPS)[number]["permissions"][number]["value"];

/**
 * What the business role editor may offer: business-scoped groups, minus the
 * individual permissions the backend refuses to assign to business staff.
 * Filtering per permission rather than per group matters — `business:read` is
 * assignable while `business:create` in the same group is not.
 */
export const BUSINESS_PERMISSION_GROUPS: readonly PermissionGroup[] =
    PERMISSION_GROUPS.filter((group) => group.scope === "business")
        .map((group) => ({
            ...group,
            permissions: group.permissions.filter(
                (permission) => permission.businessAssignable,
            ),
        }))
        .filter((group) => group.permissions.length > 0);


const PERMISSION_LABELS = new Map<string, string>(
    PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map(
            (permission) =>
                [
                    permission.value,
                    `${group.label} · ${permission.label}`,
                ] as const,
        ),
    ),
);

/** Falls back to the raw value so a permission added in Keycloak still renders. */
export function describePermission(value: string) {
    return PERMISSION_LABELS.get(value) ?? value;
}
