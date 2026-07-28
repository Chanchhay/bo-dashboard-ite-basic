import {
    Building2,
    Coins,
    CreditCard,
    FolderTree,
    LayoutGrid,
    LineChart,
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
        hint: string;
        /** Badge fill; `ink` is the icon drawn on it. */
        fill: string;
        ink: string;
    };
};

export const NAVIGATION: NavSection[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
        href: "/dashboard",
        exact: true,
    },
    {
        id: "items",
        label: "Items",
        icon: Package,
        permission: PERMISSIONS.INVENTORY_MANAGE,
        app: {
            label: "Item Management",
            hint: "Catalog, categories & stock",
            fill: "#feb90d",
            ink: "#3d2c00",
        },
        children: [
            {
                label: "Overview",
                href: "/inventory",
                exact: true,
                alsoActiveOn: [/^\/inventory\/new$/, /^\/inventory\/[^/]+\/edit$/],
            },
            { label: "Categories", href: "/inventory/categories" },
            { label: "Stock", href: "/inventory/stock" },
        ],
    },
    {
        id: "sales",
        label: "Sales",
        icon: ShoppingCart,
        permission: PERMISSIONS.SALES_MANAGE,
        app: {
            label: "Sale Management",
            hint: "Orders & point of sale",
            fill: "#d14341",
            ink: "#ffffff",
        },
        children: [
            { label: "Orders", href: "/sales", exact: true },
            { label: "Point of sale", href: "/sales/pos" },
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
            hint: "Staff & roles",
            fill: "#006b26",
            ink: "#ffffff",
        },
    },
    {
        id: "business",
        label: "Business",
        icon: Building2,
        permission: PERMISSIONS.BUSINESS_MANAGE,
        app: {
            label: "Business Management",
            hint: "Profile & currency",
            fill: "#00932a",
            ink: "#ffffff",
        },
        children: [
            { label: "Profile", href: "/business/profile" },
            { label: "Currency", href: "/business/currency" },
        ],
    },
    {
        id: "analytics",
        label: "Analytics",
        icon: LineChart,
        href: "/analytics",
        permission: PERMISSIONS.ANALYTICS_VIEW,
        app: {
            label: "Overview Dashboard",
            hint: "Live analytics",
            fill: "#0f7a3a",
            ink: "#ffffff",
        },
    },
    {
        id: "subscription",
        label: "Subscription",
        icon: CreditCard,
        href: "/subscription",
        permission: PERMISSIONS.BILLING_MANAGE,
    },
    {
        id: "settings",
        label: "Settings",
        icon: Settings,
        href: "/settings",
        app: {
            label: "Account",
            hint: "Your preferences",
            fill: "#5c6660",
            ink: "#ffffff",
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

export function visibleSections(permissions: readonly Permission[]) {
    return NAVIGATION.filter((section) => can(permissions, section.permission));
}

/** The apps shown in the launcher, in navigation order. */
export function launcherApps(permissions: readonly Permission[]) {
    return visibleSections(permissions).filter((section) => section.app);
}

/** Where an app tile takes you — its first child, or its own route. */
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
