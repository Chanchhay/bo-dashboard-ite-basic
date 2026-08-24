import type { DriveStep } from "driver.js";

export const dashboardTourSteps: DriveStep[] = [
  {
    element: '[data-tour="apps-welcome"]',
    popover: {
      title: "Welcome to FluxiBiz OS!",
      description:
        "This is your central Business Control Center. From here, you can launch all store operations, manage point of sale, catalog stock, employees, and sales analytics.",
      side: "bottom",
      align: "start",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="app-tile-business"]',
    popover: {
      title: "1. Business Management",
      description:
        "Set up store profiles, storefront branding, multi-currency rates (USD & KHR), payment methods (Bakong KHQR, Cash), and Telegram bot notifications.",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="app-tile-items"]',
    popover: {
      title: "2. Inventory & Stock Catalog",
      description:
        "Manage products, stock levels, barcodes, categories, option presets, add-on items, and track stock movements (In, Out, Adjustments).",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="app-tile-sales"]',
    popover: {
      title: "3. Sale & Customer Management",
      description:
        "Track sales orders, look up receipts, manage customer profiles, membership loyalty tiers, channel pricing, and active coupons.",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="app-tile-dashboard"]',
    popover: {
      title: "4. Overview & Profit Analytics",
      description:
        "View live business performance, daily sales figures, channel revenue breakdown, and profit margins vs stock costs.",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="app-tile-employees"]',
    popover: {
      title: "5. Staff & Role Management",
      description:
        "Create employee accounts, assign granular role permissions (Manager, Cashier, Stock Keeper), and monitor security audit logs.",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="apps-nav"]',
    popover: {
      title: "All Apps Quick Launcher",
      description:
        "Click 'All apps' anytime inside any module to return to this central app launcher.",
      side: "right",
      align: "start",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: "Module Submenus & Features",
      description:
        "Navigate through sub-pages, nested item configurations, stock ledgers, customer lists, and store settings for the active app.",
      side: "right",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="pos-launch"]',
    popover: {
      title: "Point of Sale Terminal",
      description:
        "Launch the dedicated, full-screen POS terminal for fast barcode scanning, cart building, customer attachment, and Bakong KHQR checkouts.",
      side: "top",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="inventory-config-tabs"]',
    popover: {
      title: "Item Configuration Building Blocks",
      description:
        "Manage Units of Measurement, Categories/Item Groups, Add-on Modifier sets, and Product Variant Option Presets.",
      side: "bottom",
      align: "center",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="notifications"]',
    popover: {
      title: "Real-Time System Alerts",
      description:
        "Receive real-time notifications for low stock warnings, cash register events, sales activity, and system updates.",
      side: "bottom",
      align: "end",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
  {
    element: '[data-tour="user-menu"]',
    popover: {
      title: "Account Profile & Re-run Tour",
      description:
        "Manage your account profile, switch between dark and light themes, or re-run this complete Guided Tour anytime from here.",
      side: "bottom",
      align: "end",
      popoverClass: "fluxibiz-tour-popover",
    },
  },
];
