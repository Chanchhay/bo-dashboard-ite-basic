import {
    Bell,
    Building2,
    Coins,
    FolderTree,
    LayoutGrid,
    Package,
    ScanLine,
    Settings,
    ShoppingCart,
    Users,
    Warehouse,
    type LucideIcon,
} from "lucide-react";

import { PERMISSIONS, can, type Permission } from "@/lib/permissions";
import { POS_ROUTES } from "@/lib/pos-routes";

type NavItemBase = {
    label: string;
    /** Omit to make the page available to everyone who can see the section. */
    permission?: Permission;
};

export type NavLink = NavItemBase & {
    href: string;
    icon?: LucideIcon;
    /** Match the pathname exactly instead of by prefix. */
    exact?: boolean;
    /** Extra routes that should keep this entry highlighted. */
    alsoActiveOn?: RegExp[];
    /** Optional count pill. Only ever set from real data. */
    badge?: number;
};

export type NavGroup = NavItemBase & {
    children: NavLink[];
};

export type NavLeaf = NavLink | NavGroup;

/**
 * A separate app this section can hand off to, pinned to the foot of the
 * sidebar. Not a nav row: it leaves the dashboard shell entirely, so it reads
 * as launching something rather than moving between pages.
 */
export type NavLaunch = {
    label: string;
    href: string;
    icon: LucideIcon;
    permission?: Permission;
};

export type NavSection = {
    id: string;
    label: string;
    icon: LucideIcon;
    /** A section either links somewhere itself, or expands to children. */
    href?: string;
    exact?: boolean;
    children?: NavLeaf[];
    /** Omit to make the section available to everyone. */
    permission?: Permission;
    /** A separate app launched from this section's sidebar. */
    launch?: NavLaunch;
    /** Launcher presentation. Sections without this never appear as an app. */
    app?: {
        label: string;
        // hint: string;
        /** Badge fill; `ink` is the icon drawn on it. */
        fill: string;
        ink: string;
    };
};

export const NAVIGATION: NavSection[] = [
    {
        id: "business",
        label: "Business",
        icon: Building2,
        permission: PERMISSIONS.BUSINESS_MANAGE,
        app: {
            label: "Business Management",
            // hint: "Profile & currency",
            fill: "linear-gradient(155deg, #46ca22 0%, #0e8a1e 71.64%)",
            ink: "#ffffff",
        },
        children: [
            {
                label: "Profile",
                href: "/business/profile",
                permission: PERMISSIONS.BUSINESS_PROFILE,
            },
            {
                label: "Currency",
                href: "/business/currency",
                permission: PERMISSIONS.BUSINESS_CURRENCY,
            },
            {
                label: "Payments",
                href: "/business/payments",
                permission: PERMISSIONS.BUSINESS_PAYMENTS,
            },
            {
                label: "Telegram Bot",
                href: "/business/telegram",
                permission: PERMISSIONS.BUSINESS_MANAGE,
            },
        ],
    },
    {
        id: "employees",
        label: "Employees",
        icon: Users,
        href: "/employees",
        permission: PERMISSIONS.USERS_MANAGE,
        app: {
            label: "User Management",
            // hint: "Staff & roles",
            fill: "linear-gradient(-40.5deg, #08832b 20.11%, #48d321 82.16%)",
            ink: "#ffffff",
        },
    },
    {
        id: "items",
        label: "Items",
        icon: Package,
        permission: PERMISSIONS.INVENTORY_MANAGE,
        app: {
            label: "Inventory Management",
            // hint: "Catalog, categories & stock",
            fill: "linear-gradient(-42.95deg, #0e7e2e 5.06%, #42d00e 80.71%)",
            ink: "#ffffff",
        },
        children: [
            {
                label: "Items",
                href: "/inventory",
                exact: true,
                permission: PERMISSIONS.INVENTORY_ITEMS,
                alsoActiveOn: [
                    /^\/inventory\/new$/,
                    /^\/inventory\/[^/]+\/edit$/,
                ],
            },
            {
                label: "Stock",
                permission: PERMISSIONS.INVENTORY_STOCK,
                children: [
                    {
                        label: "Overview",
                        href: "/inventory/stock",
                        exact: true,
                        permission: PERMISSIONS.INVENTORY_STOCK,
                        alsoActiveOn: [/^\/inventory\/stock\/overview$/],
                    },
                    {
                        // Add-ons are stocked from the overview, under the item
                        // that offers them. The ledger is its own page: it
                        // answers what happened, not what is left.
                        label: "Movements",
                        href: "/inventory/stock/movements",
                        permission: PERMISSIONS.INVENTORY_STOCK,
                    },
                    {
                        label: "Stock in",
                        href: "/inventory/stock/in",
                        permission: PERMISSIONS.INVENTORY_STOCK,
                    },
                    {
                        label: "Stock out",
                        href: "/inventory/stock/out",
                        permission: PERMISSIONS.INVENTORY_STOCK,
                    },
                    {
                        label: "Adjust stock",
                        href: "/inventory/stock/adjust",
                        permission: PERMISSIONS.INVENTORY_STOCK,
                    },
                ],
            },
            {
                // Units, conversions, item groups, add-ons and option presets —
                // the building blocks items are assembled from. Categories used
                // to live at `/inventory/categories`, which now redirects to groups.
                label: "Item config",
                permission: PERMISSIONS.INVENTORY_CATEGORIES,
                children: [
                    {
                        label: "Units",
                        href: "/inventory/config/units",
                        permission: PERMISSIONS.INVENTORY_CATEGORIES,
                        alsoActiveOn: [/^\/inventory\/config$/],
                    },
                    {
                        label: "Categories",
                        href: "/inventory/config/groups",
                        permission: PERMISSIONS.INVENTORY_CATEGORIES,
                        alsoActiveOn: [/^\/inventory\/categories$/],
                    },
                    {
                        label: "Add-ons",
                        href: "/inventory/config/add-ons",
                        permission: PERMISSIONS.INVENTORY_CATEGORIES,
                    },
                    {
                        label: "Option presets",
                        href: "/inventory/config/presets",
                        permission: PERMISSIONS.INVENTORY_CATEGORIES,
                    },
                ],
            },
        ],
    },
    {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
        href: "/dashboard",
        exact: true,
        children: [
            {
                label: "Overview",
                href: "/dashboard",
                exact: true,
            },
            {
                // Revenue against what the stock cost, per channel. The one
                // question the stat cards elsewhere cannot answer.
                label: "Profit",
                href: "/analytics",
            },
        ],
        app: {
            label: "Overview Dashboard",
            // hint: "Live figures & analytics",
            fill: "linear-gradient(-42.73deg, #008000 14.44%, #36f928 91.63%)",
            ink: "#ffffff",
        },
    },
    {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        href: "/notifications",
        app: {
            label: "Notifications",
            fill: "linear-gradient(155deg, #0e8a1e 0%, #46ca22 100%)",
            ink: "#ffffff",
        },
    },
    {
        id: "sales",
        label: "Sales",
        icon: ShoppingCart,
        permission: PERMISSIONS.SALES_MANAGE,
        app: {
            label: "Sale Management",
            // hint: "Orders & point of sale",
            fill: "#e8e8e8",
            ink: "#00932a",
        },
        children: [
            {
                label: "Orders",
                href: "/sales",
                exact: true,
                permission: PERMISSIONS.SALES_ORDERS,
            },
            {
                // Base prices, what each channel charges instead, and where
                // each item sells — one screen, where it used to be three.
                // Sits above Customers because it is the thing most owners
                // open Sale Management to do.
                label: "Item & Pricing",
                href: "/sales/pricing",
                permission: PERMISSIONS.SALES_MANAGE,
            },
            {
                label: "Customers",
                href: "/sales/customers",
                permission: PERMISSIONS.SALES_MANAGE,
            },
            {
                label: "Discounts & Coupons",
                href: "/sales/discounts",
                permission: PERMISSIONS.SALES_MANAGE,
            },
            {
                label: "Member Types",
                href: "/sales/membership-types",
                permission: PERMISSIONS.SALES_MANAGE,
            },
        ],
        // The terminal is its own fullscreen app, so it gets a launch button
        // rather than a nav row that pretends to stay inside the dashboard.
        launch: {
            label: "Open Point of Sale",
            href: POS_ROUTES.openRegister,
            icon: ScanLine,
            permission: PERMISSIONS.SALES_POS,
        },
    },
    {
        id: "settings",
        label: "Settings",
        icon: Settings,
        href: "/settings",
        app: {
            label: "Account",
            // hint: "Your preferences",
            fill: "#e8e8e8",
            ink: "#00932a",
        },
    },
];

/** Icons for leaf routes that need one outside the sidebar. */
export const LEAF_ICONS = {
    categories: FolderTree,
    stock: Warehouse,
    pos: ScanLine,
    currency: Coins,
};

/** Sections the user may reach, with unreachable child pages stripped out. */
export function visibleSections(permissions: readonly Permission[]) {
    return NAVIGATION.filter((section) =>
        can(permissions, section.permission),
    )
        .map((section) =>
            section.launch && !can(permissions, section.launch.permission)
                ? { ...section, launch: undefined }
                : section,
        )
        .map((section) =>
            section.children
                ? {
                    ...section,
                    children: section.children
                        .filter((leaf) =>
                            can(permissions, leaf.permission),
                        )
                        .map((leaf) =>
                            isNavGroup(leaf)
                                ? {
                                    ...leaf,
                                    children: leaf.children.filter(
                                        (child) =>
                                            can(
                                                permissions,
                                                child.permission,
                                            ),
                                    ),
                                }
                                : leaf,
                        )
                        .filter(
                            (leaf) =>
                                !isNavGroup(leaf) ||
                                leaf.children.length > 0,
                        ),
                }
                : section,
        )
        .filter(
            (section) => !section.children || section.children.length > 0,
        );
}

/** The apps shown in the launcher, in navigation order. */
export function launcherApps(permissions: readonly Permission[]) {
    return visibleSections(permissions).filter((section) => section.app);
}

/** Where an app tile takes you — its own route, or its first child page. */
export function sectionEntryHref(section: NavSection) {
    const firstChild = section.children?.[0];

    return (
        section.href ??
        (firstChild &&
            (isNavGroup(firstChild)
                ? firstChild.children[0]?.href
                : firstChild.href)) ??
        "/dashboard"
    );
}

export function isLeafActive(leaf: NavLeaf, pathname: string): boolean {
    if (isNavGroup(leaf)) {
        return leaf.children.some((child) => isLeafActive(child, pathname));
    }

    if (leaf.alsoActiveOn?.some((pattern) => pattern.test(pathname))) {
        return true;
    }

    return leaf.exact
        ? pathname === leaf.href
        : pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
}

export function isNavGroup(leaf: NavLeaf): leaf is NavGroup {
    return "children" in leaf;
}

export function isSectionActive(section: NavSection, pathname: string) {
    if (section.children) {
        return section.children.some((leaf) => isLeafActive(leaf, pathname));
    }

    if (!section.href) return false;

    return section.exact
        ? pathname === section.href
        : pathname === section.href || pathname.startsWith(`${section.href}/`);
}

/** The section that owns a route — what "app" you are currently inside. */
export function findSectionByPath(pathname: string) {
    return NAVIGATION.find((section) => isSectionActive(section, pathname));
}

/** What the top bar says: the app you are in, and the page inside it. */
export type PageTitle = {
    /** Renders semibold — the app you launched, named as it is in the launcher. */
    app: string;
    /** Renders regular after a separator. Absent on an app's entry page. */
    page?: string;
};

/**
 * Title for the top bar. The app name carries through every page of an app, so
 * the heading always answers "which app am I in" before "which page" — and it
 * matches the tile you clicked in the launcher.
 */
export function getPageTitle(pathname: string): PageTitle {
    for (const section of NAVIGATION) {
        const app = section.app?.label ?? section.label;

        if (section.children) {
            const leaf = section.children.find((child) =>
                isLeafActive(child, pathname),
            );
            if (!leaf) continue;

            if (isNavGroup(leaf)) {
                const child = leaf.children.find((item) =>
                    isLeafActive(item, pathname),
                );
                return {
                    app,
                    page: child
                        ? `${leaf.label} — ${child.label}`
                        : leaf.label,
                };
            }

            // An app's entry page is the app — no need to say it twice.
            return sectionEntryHref(section) === leaf.href
                ? { app }
                : { app, page: leaf.label };
        }

        if (isSectionActive(section, pathname)) return { app };
    }

    if (pathname.startsWith("/profile")) return { app: "Your profile" };

    return { app: "Dashboard" };
}
