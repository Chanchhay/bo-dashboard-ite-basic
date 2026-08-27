
export type PermissionOption = {
    readonly value: string;
    readonly label: string;
    
    readonly businessAssignable: boolean;
    readonly platformAssignable: boolean;
};

export type PermissionGroup = {
    readonly id: string;
    readonly label: string;
    
    readonly scope: "business" | "platform";
    readonly permissions: readonly PermissionOption[];
};


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


export type Permission =
    (typeof PERMISSION_GROUPS)[number]["permissions"][number]["value"];


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


export function describePermission(value: string) {
    return PERMISSION_LABELS.get(value) ?? value;
}
