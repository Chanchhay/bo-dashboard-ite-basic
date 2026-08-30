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

import {
  can,
  type GrantedPermissions,
  type PermissionRule,
} from "@/lib/permissions";
import { POS_ROUTES } from "@/lib/pos-routes";

type NavItemBase = {
  label: string;
  permission?: PermissionRule;
};

export type NavLink = NavItemBase & {
  href: string;
  icon?: LucideIcon;

  exact?: boolean;
 
  alsoActiveOn?: RegExp[];

  badge?: number;
};

export type NavGroup = NavItemBase & {
  children: NavLink[];
};

export type NavLeaf = NavLink | NavGroup;

export type NavLaunch = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionRule;
};

export type NavSection = {
  id: string;
  label: string;
  icon: LucideIcon;

  href?: string;
  exact?: boolean;
  children?: NavLeaf[];
  permission?: PermissionRule;

  launch?: NavLaunch;

  app?: {
    label: string;
   
    fill: string;
    ink: string;
  };
};


export const NAVIGATION: NavSection[] = [
  {
    id: "business",
    label: "Business",
    icon: Building2,
    permission: [
      "business:read",
      "currency:read",
      "bakong-setting:read",
      "telegram-setting:read",
    ],
    app: {
      label: "Business Management",
      fill: "linear-gradient(155deg, #46ca22 0%, #0e8a1e 71.64%)",
      ink: "#ffffff",
    },
    children: [
      {
        label: "Profile",
        href: "/business/profile",
        permission: "business:read",
      },
      {
        label: "Currency",
        href: "/business/currency",
        permission: "currency:read",
      },
      {
        label: "Payments",
        href: "/business/payments",
        permission: "bakong-setting:read",
      },
      {
        label: "Telegram Bot",
        href: "/business/telegram",
        permission: "telegram-setting:read",
      },
      {
        label: "Facebook Page",
        href: "/business/facebook",
        permission: "business:read",
      },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    href: "/employees",
    permission: ["member:read", "role:read"],
    app: {
      label: "User Management",
      fill: "linear-gradient(-40.5deg, #08832b 20.11%, #48d321 82.16%)",
      ink: "#ffffff",
    },
  },
  {
    id: "items",
    label: "Items",
    icon: Package,
    permission: [
      "item:read",
      "item-group:read",
      "stock:read",
      "stock:write",
      "unit:read",
    ],
    app: {
      label: "Inventory Management",
      fill: "linear-gradient(-42.95deg, #0e7e2e 5.06%, #42d00e 80.71%)",
      ink: "#ffffff",
    },
    children: [
      {
        label: "Items",
        href: "/inventory",
        exact: true,
        permission: "item:read",
        alsoActiveOn: [/^\/inventory\/new$/, /^\/inventory\/[^/]+\/edit$/],
      },
      {
        label: "Stock",
        permission: ["stock:read", "stock:write"],
        children: [
          {
            label: "Overview",
            href: "/inventory/stock",
            exact: true,
            permission: "stock:read",
            alsoActiveOn: [/^\/inventory\/stock\/overview$/],
          },
          {
            label: "Movements",
            href: "/inventory/stock/movements",
            permission: "stock:read",
          },
          {
            label: "Stock in",
            href: "/inventory/stock/in",
            permission: "stock:write",
          },
          {
            label: "Stock out",
            href: "/inventory/stock/out",
            permission: "stock:write",
          },
          {
            label: "Adjust stock",
            href: "/inventory/stock/adjust",
            permission: "stock:write",
          },
        ],
      },
      {
        label: "Import data",
        permission: ["item:read", "item:create"],
        children: [
          {
            label: "New import",
            href: "/inventory/import",
            exact: true,
            permission: "item:create",
          },
          {
            label: "History",
            href: "/inventory/import/history",
            permission: "item:read",
            alsoActiveOn: [/^\/inventory\/import\/[^/]+$/],
          },
        ],
      },
      {
        label: "Item config",
        permission: ["unit:read", "item-group:read", "item:read"],
        children: [
          {
            label: "Units",
            href: "/inventory/config/units",
            permission: "unit:read",
            alsoActiveOn: [/^\/inventory\/config$/],
          },
          {
            label: "Categories",
            href: "/inventory/config/groups",
            permission: "item-group:read",
            alsoActiveOn: [/^\/inventory\/categories$/],
          },
          {
            label: "Add-ons",
            href: "/inventory/config/add-ons",
            permission: "item:read",
          },
          {
            label: "Option presets",
            href: "/inventory/config/presets",
            permission: "item:read",
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
        label: "Profit",
        href: "/analytics",
      },
      {
        label: "Prediction",
        href: "/prediction",
      },
    ],
    app: {
      label: "Overview Dashboard",
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
      label: "Notification Management",
      fill: "linear-gradient(155deg, #0e8a1e 0%, #46ca22 100%)",
      ink: "#ffffff",
    },
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingCart,
    permission: ["order:read", "order:create", "item:read"],
    app: {
      label: "Sale Management",
    
      fill: "#e8e8e8",
      ink: "#00932a",
    },
    children: [
      {
        label: "Orders",
        href: "/sales/orders",
      },
      {
        label: "Pay Later",
        href: "/sales/pay-later",
        permission: "order:read",
      },
      {

        label: "Item & Pricing",
        href: "/sales/pricing",
        permission: "item:read",
      },
      {
        label: "Customers",
        href: "/sales/customers",
    
        permission: "order:read",
      },
      {
        label: "Discounts & Coupons",
        href: "/sales/discounts",
        permission: "order:read",
      },
      {
        label: "Member Types",
        href: "/sales/membership-types",
        permission: "order:read",
      },
      {
        label: "Tax Settings",
        href: "/sales/taxes",
        permission: "order:read",
      },
      {
       
        label: "Register Sessions",
        href: "/sales/sessions",
        permission: "order:create",
      },
             
    ],
    
    launch: {
      label: "Open Point of Sale",
      href: POS_ROUTES.openRegister,
      icon: ScanLine,
      permission: "order:create",
    },
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
    app: {
      label: "Settings",
      fill: "#e8e8e8",
      ink: "#00932a",
    },
  },
];

export const LEAF_ICONS = {
  categories: FolderTree,
  stock: Warehouse,
  pos: ScanLine,
  currency: Coins,
};


export function visibleSections(permissions: GrantedPermissions) {
  return NAVIGATION.filter((section) => can(permissions, section.permission))
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
              .filter((leaf) => can(permissions, leaf.permission))
              .map((leaf) =>
                isNavGroup(leaf)
                  ? {
                      ...leaf,
                      children: leaf.children.filter((child) =>
                        can(permissions, child.permission),
                      ),
                    }
                  : leaf,
              )
              .filter((leaf) => !isNavGroup(leaf) || leaf.children.length > 0),
          }
        : section,
    )
    .filter((section) => !section.children || section.children.length > 0);
}

export function launcherApps(permissions: GrantedPermissions) {
  return visibleSections(permissions).filter((section) => section.app);
}

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

export function findSectionByPath(pathname: string) {
  return NAVIGATION.find((section) => isSectionActive(section, pathname));
}

export type PageTitle = {
  app: string;
  page?: string;
};


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
          page: child ? `${leaf.label} — ${child.label}` : leaf.label,
        };
      }

      return sectionEntryHref(section) === leaf.href
        ? { app }
        : { app, page: leaf.label };
    }

    if (isSectionActive(section, pathname)) return { app };
  }

  if (pathname.startsWith("/profile")) return { app: "Your profile" };

  return { app: "Dashboard" };
}
