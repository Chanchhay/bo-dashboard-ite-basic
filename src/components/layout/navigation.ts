import {
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

export type NavLeaf = {
    label: string;
    href: string;
    /** Match the pathname exactly instead of by prefix. */
    exact?: boolean;
    /** Extra routes that should keep this entry highlighted. */
    alsoActiveOn?: RegExp[];
    /** Optional count pill. Only ever set from real data. */
    badge?: number;
    /** Omit to make the page available to everyone who can see the section. */
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
                label: "Overview",
                href: "/inventory",
                exact: true,
                permission: PERMISSIONS.INVENTORY_ITEMS,
                alsoActiveOn: [
                    /^\/inventory\/new$/,
                    /^\/inventory\/[^/]+\/edit$/,
                ],
            },
            {
                label: "Categories",
                href: "/inventory/categories",
                permission: PERMISSIONS.INVENTORY_CATEGORIES,
            },
            {
                label: "Stock",
                href: "/inventory/stock",
                permission: PERMISSIONS.INVENTORY_STOCK,
            },
        ],
    },
    {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
        app: {
            label: "Overview Dashboard",
            // hint: "Live figures & analytics",
            fill: "linear-gradient(-42.73deg, #008000 14.44%, #36f928 91.63%)",
            ink: "#ffffff",
        },
        children: [
            { label: "Overview", href: "/dashboard", exact: true },
            {
                label: "Analytics",
                href: "/analytics",
                permission: PERMISSIONS.ANALYTICS_VIEW,
            },
        ],
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
                label: "Point of sale",
                href: "/sales/pos",
                permission: PERMISSIONS.SALES_POS,
            },
        ],
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
            section.children
                ? {
                      ...section,
                      children: section.children.filter((leaf) =>
                          can(permissions, leaf.permission),
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
    return section.href ?? section.children?.[0]?.href ?? "/dashboard";
}

export function isLeafActive(leaf: NavLeaf, pathname: string) {
    if (leaf.alsoActiveOn?.some((pattern) => pattern.test(pathname))) {
        return true;
    }

    return leaf.exact
        ? pathname === leaf.href
        : pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
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

/**
 * Page title for the top bar. The first word renders semibold and the rest
 * regular, so the heading has hierarchy without a second type size.
 */
export function getPageTitle(pathname: string) {
    for (const section of NAVIGATION) {
        if (section.children) {
            const leaf = section.children.find((child) =>
                isLeafActive(child, pathname),
            );
            if (leaf) return `${section.label} ${leaf.label.toLowerCase()}`;
        } else if (isSectionActive(section, pathname)) {
            return section.label;
        }
    }

    if (pathname.startsWith("/profile")) return "Your profile";

    return "Dashboard";
}
