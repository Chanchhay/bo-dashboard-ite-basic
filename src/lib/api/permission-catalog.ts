/**
 * The permission vocabulary, mirrored from the Keycloak client-role export in
 * `api-docs/keycloak-client-role.json` (client `fluxipos-backend`) and from
 * `PermissionCode` in the API, which is where the two assignability flags come
 * from. Keycloak remains the source of truth; this file gives the same names
 * human labels, a grouping, and — through the `Permission` union below —
 * compile-time checking wherever the app names one.
 *
 * There is only one permission vocabulary in this app. A business role is a
 * composite of these names, the access token carries the ones a user was
 * granted, and the navigation gates on them directly. Nothing translates
 * between two sets of names, so a permission added in Keycloak reaches the UI
 * by being added to this list and nowhere else.
 *
 * **Groups are for the reader, not the API.** They follow the job someone is
 * hired to do, the way the admin console groups platform permissions — not the
 * resource prefix of the underlying role. Grouping by prefix produced twelve
 * boxes, several holding a single checkbox, and labels like "View" that meant
 * nothing away from their heading. A label here reads on its own.
 */
export type PermissionOption = {
    readonly value: string;
    readonly label: string;
    /** One line, in the reader's terms, on what ticking this lets someone do. */
    readonly hint: string;
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
        id: "shop",
        label: "Shop settings",
        scope: "business",
        permissions: [
            {
                value: "business:read",
                label: "View shop details",
                hint: "The shop's name, address, logo and contact details",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "business:update",
                label: "Edit shop details",
                hint: "Change any of the above",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "business:create",
                label: "Create a shop",
                hint: "Register a new shop on the platform",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "business:delete",
                label: "Delete the shop",
                hint: "Close this shop permanently",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "storefront:read",
                label: "View the online storefront",
                hint: "The public page customers order from",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "storefront:update",
                label: "Edit the online storefront",
                hint: "Change its address, or take it online and offline",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "telegram-setting:read",
                label: "View the Telegram bot",
                hint: "How orders reach your Telegram channel",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "telegram-setting:update",
                label: "Edit the Telegram bot",
                hint: "Connect a bot, or stop it sending",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "money",
        label: "Money",
        scope: "business",
        permissions: [
            {
                value: "currency:read",
                label: "View currencies",
                hint: "The currencies this shop accepts",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:create",
                label: "Add a currency",
                hint: "Start accepting another currency",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:update",
                label: "Edit a currency",
                hint: "Change a currency's rate or details",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:delete",
                label: "Remove a currency",
                hint: "Stop accepting a currency",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:set-base",
                label: "Set the base currency",
                hint: "Every price is stored in it, so changing it restates them all",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "currency:set-display",
                label: "Set the display currency",
                hint: "What customers see prices in",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "bakong-setting:read",
                label: "View Bakong payments",
                hint: "The KHQR account payments arrive in",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "bakong-setting:update",
                label: "Edit Bakong payments",
                hint: "Connect or change the receiving account",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "bakong-setting:preview",
                label: "Preview a Bakong QR",
                hint: "Check a code renders before going live",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "catalogue",
        label: "Catalogue",
        scope: "business",
        permissions: [
            {
                value: "item:read",
                label: "View items",
                hint: "Everything the shop sells, and its prices",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:create",
                label: "Add items",
                hint: "Put something new on sale",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:update",
                label: "Edit items",
                hint: "Change an item's name, price, photos or options",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item:delete",
                label: "Remove items",
                hint: "Take an item off the catalogue",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:read",
                label: "View categories",
                hint: "How items are filed",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:create",
                label: "Add categories",
                hint: "Create a new category",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:update",
                label: "Edit categories",
                hint: "Rename or re-file a category",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "item-group:delete",
                label: "Remove categories",
                hint: "Delete a category",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "unit:read",
                label: "View units",
                hint: "Shared measures such as kilogram and box",
                businessAssignable: true,
                platformAssignable: false,
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
                label: "View stock levels",
                hint: "What is on hand, and what is running low",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "stock:write",
                label: "Record stock movements",
                hint: "Stock in, stock out, and adjustments",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "selling",
        label: "Selling",
        scope: "business",
        permissions: [
            {
                value: "order:read",
                label: "View orders",
                hint: "Past and open orders, and their totals",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:create",
                label: "Take an order",
                hint: "Ring up a sale at the till",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:pay",
                label: "Take payment",
                hint: "Settle an order and close it",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:generate-khqr",
                label: "Generate a KHQR code",
                hint: "Show a customer a code to scan",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "order:cancel",
                label: "Cancel an order",
                hint: "Void an order that should not stand",
                businessAssignable: true,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "people",
        label: "People and roles",
        scope: "business",
        permissions: [
            {
                value: "member:read",
                label: "View staff",
                hint: "Who works here, and what they were given",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "member:manage",
                label: "Add and edit staff",
                hint: "Invite people, change their details, suspend them",
                businessAssignable: true,
                platformAssignable: false,
            },
            {
                value: "role:read",
                label: "View roles",
                hint: "The roles that exist and what each allows",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:create",
                label: "Create roles",
                hint: "Define a new job",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:update",
                label: "Edit roles",
                hint: "Change what a role allows",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:delete",
                label: "Delete roles",
                hint: "Remove a role entirely",
                businessAssignable: true,
                platformAssignable: true,
            },
            {
                value: "role:assign",
                label: "Assign roles to staff",
                hint: "Decide which job someone does",
                businessAssignable: true,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "account",
        label: "Your own account",
        scope: "business",
        permissions: [
            {
                value: "profile:read",
                label: "View your profile",
                hint: "Granted to everyone who signs in",
                businessAssignable: false,
                platformAssignable: false,
            },
            {
                value: "profile:update",
                label: "Edit your profile",
                hint: "Granted to everyone who signs in",
                businessAssignable: false,
                platformAssignable: false,
            },
        ],
    },
    {
        id: "platform-businesses",
        label: "Businesses",
        scope: "platform",
        permissions: [
            {
                value: "admin-business:read",
                label: "View businesses",
                hint: "See the shop list and each shop's details",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-business:manage",
                label: "Manage businesses",
                hint: "Suspend, close, reopen or otherwise change a shop",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-business:delete",
                label: "Delete businesses",
                hint: "Mark a shop as deleted",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "platform-catalog",
        label: "Shared catalogue",
        scope: "platform",
        permissions: [
            {
                value: "admin-category:read",
                label: "View business categories",
                hint: "The list shop owners choose from",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:create",
                label: "Create business categories",
                hint: "Add a new category",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:update",
                label: "Edit business categories",
                hint: "Rename or change a category",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-category:delete",
                label: "Delete business categories",
                hint: "Remove a category",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:read",
                label: "View units",
                hint: "Shared measures such as kilogram and box",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:create",
                label: "Create units",
                hint: "Add a new unit",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:update",
                label: "Edit units",
                hint: "Rename or change a unit",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-unit:delete",
                label: "Delete units",
                hint: "Remove a unit",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "platform-config",
        label: "Platform configuration",
        scope: "platform",
        permissions: [
            {
                value: "admin-channel:read",
                label: "View sales channels",
                hint: "The channels shops can sell through",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-channel:manage",
                label: "Manage sales channels",
                hint: "Add a channel, or switch one off",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-platform-feature:read",
                label: "View platform features",
                hint: "Which features are switched on platform-wide",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-platform-feature:update",
                label: "Edit platform features",
                hint: "Turn a feature on or off for everyone",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
    },
    {
        id: "platform-reporting",
        label: "Reporting",
        scope: "platform",
        permissions: [
            {
                value: "admin-dashboard:read",
                label: "View the platform dashboard",
                hint: "Platform totals and growth",
                businessAssignable: false,
                platformAssignable: true,
            },
            {
                value: "admin-audit:read",
                label: "View the audit log",
                hint: "Who changed what, and when",
                businessAssignable: false,
                platformAssignable: true,
            },
        ],
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
 * assignable while `business:create` in the same group is not, and the whole
 * "Your own account" group falls away because everyone already has it.
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
            (permission) => [permission.value, permission.label] as const,
        ),
    ),
);

/**
 * The reader-facing name for a permission. Labels read on their own, so this
 * is "Take payment" rather than "Orders · Take payment". Falls back to the raw
 * value so a permission added in Keycloak still renders, and still matches a
 * search for its code.
 */
export function permissionLabel(value: string) {
    return PERMISSION_LABELS.get(value) ?? value;
}
