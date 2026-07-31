/**
 * The permission catalog, mirrored from the Keycloak client-role export in
 * `api-docs/keycloak-client-role.json` (client `fluxipos-backend`). Keycloak
 * remains the source of truth — this only gives the role editor human labels
 * and a stable grouping.
 *
 * `scope: "platform"` covers the `admin-*` roles, which belong to platform
 * administration (`/api/v1/platform/roles`) rather than to a business role, so
 * the business role editor leaves them out.
 */
export type PermissionOption = {
    value: string;
    label: string;
};

export type PermissionGroup = {
    id: string;
    label: string;
    scope: "business" | "platform";
    permissions: PermissionOption[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        id: "admin-audit",
        label: "Audit log",
        scope: "platform",
        permissions: [{ value: "admin-audit:read", label: "View" }],
    },
    {
        id: "admin-business",
        label: "Businesses",
        scope: "platform",
        permissions: [
            { value: "admin-business:delete", label: "Delete" },
            { value: "admin-business:manage", label: "Manage" },
            { value: "admin-business:read", label: "View" },
        ],
    },
    {
        id: "admin-category",
        label: "Business categories",
        scope: "platform",
        permissions: [
            { value: "admin-category:create", label: "Create" },
            { value: "admin-category:delete", label: "Delete" },
            { value: "admin-category:read", label: "View" },
            { value: "admin-category:update", label: "Edit" },
        ],
    },
    {
        id: "admin-dashboard",
        label: "Platform dashboard",
        scope: "platform",
        permissions: [{ value: "admin-dashboard:read", label: "View" }],
    },
    {
        id: "admin-unit",
        label: "Units",
        scope: "platform",
        permissions: [
            { value: "admin-unit:create", label: "Create" },
            { value: "admin-unit:delete", label: "Delete" },
            { value: "admin-unit:read", label: "View" },
            { value: "admin-unit:update", label: "Edit" },
        ],
    },
    {
        id: "bakong-setting",
        label: "Bakong payments",
        scope: "business",
        permissions: [
            { value: "bakong-setting:preview", label: "Preview" },
            { value: "bakong-setting:read", label: "View" },
            { value: "bakong-setting:update", label: "Edit" },
        ],
    },
    {
        id: "business",
        label: "Business",
        scope: "business",
        permissions: [
            { value: "business:create", label: "Create" },
            { value: "business:delete", label: "Delete" },
            { value: "business:read", label: "View" },
            { value: "business:update", label: "Edit" },
        ],
    },
    {
        id: "currency",
        label: "Currencies",
        scope: "business",
        permissions: [
            { value: "currency:create", label: "Create" },
            { value: "currency:delete", label: "Delete" },
            { value: "currency:read", label: "View" },
            { value: "currency:set-base", label: "Set base" },
            { value: "currency:set-display", label: "Set display" },
            { value: "currency:update", label: "Edit" },
        ],
    },
    {
        id: "item",
        label: "Items",
        scope: "business",
        permissions: [
            { value: "item:create", label: "Create" },
            { value: "item:delete", label: "Delete" },
            { value: "item:read", label: "View" },
            { value: "item:update", label: "Edit" },
        ],
    },
    {
        id: "item-group",
        label: "Item groups",
        scope: "business",
        permissions: [
            { value: "item-group:create", label: "Create" },
            { value: "item-group:delete", label: "Delete" },
            { value: "item-group:read", label: "View" },
            { value: "item-group:update", label: "Edit" },
        ],
    },
    {
        id: "member",
        label: "Members",
        scope: "business",
        permissions: [
            { value: "member:manage", label: "Manage" },
            { value: "member:read", label: "View" },
        ],
    },
    {
        id: "order",
        label: "Orders",
        scope: "business",
        permissions: [
            { value: "order:cancel", label: "Cancel" },
            { value: "order:create", label: "Create" },
            { value: "order:generate-khqr", label: "Generate KHQR" },
            { value: "order:pay", label: "Take payment" },
            { value: "order:read", label: "View" },
        ],
    },
    {
        id: "profile",
        label: "Profile",
        scope: "business",
        permissions: [
            { value: "profile:read", label: "View" },
            { value: "profile:update", label: "Edit" },
        ],
    },
    {
        id: "role",
        label: "Roles",
        scope: "business",
        permissions: [
            { value: "role:assign", label: "Assign" },
            { value: "role:create", label: "Create" },
            { value: "role:delete", label: "Delete" },
            { value: "role:read", label: "View" },
            { value: "role:update", label: "Edit" },
        ],
    },
    {
        id: "stock",
        label: "Stock",
        scope: "business",
        permissions: [
            { value: "stock:read", label: "View" },
            { value: "stock:write", label: "Write" },
        ],
    },
    {
        id: "storefront",
        label: "Storefront",
        scope: "business",
        permissions: [
            { value: "storefront:read", label: "View" },
            { value: "storefront:update", label: "Edit" },
        ],
    },
    {
        id: "telegram-setting",
        label: "Telegram",
        scope: "business",
        permissions: [
            { value: "telegram-setting:read", label: "View" },
            { value: "telegram-setting:update", label: "Edit" },
        ],
    },
    {
        id: "unit",
        label: "Units",
        scope: "business",
        permissions: [{ value: "unit:read", label: "View" }],
    },
];

export const BUSINESS_PERMISSION_GROUPS = PERMISSION_GROUPS.filter(
    (group) => group.scope === "business",
);

const PERMISSION_LABELS = new Map(
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
