import type { DriveStep } from "driver.js";

/**
 * Route-based step configuration for the FluxiBiz Multi-Page Tour System.
 * Keys match exact pathnames or prefix routes.
 */
export const routeTourConfig: Record<string, DriveStep[]> = {
  "/apps": [
    {
      element: '[data-tour="apps-welcome"]',
      popover: {
        title: "Welcome to FluxiBiz OS!",
        description: "This is your central Business Control Center.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-business"]',
      popover: {
        title: "Business Management",
        description: "Configure store profile, currencies, payments, and Telegram bot.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-items"]',
      popover: {
        title: "Inventory & Catalog",
        description: "Manage products, barcodes, stock movements, and item configs.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-sales"]',
      popover: {
        title: "Sales & CRM",
        description: "Track receipts, channel pricing, loyalty tiers, and discounts.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-dashboard"]',
      popover: {
        title: "Overview Analytics",
        description: "Monitor live store metrics, revenue, and profit margins.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-employees"]',
      popover: {
        title: "User & Role Security",
        description: "Manage staff credentials, permissions, and security audit logs.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory": [
    {
      element: '[data-tour="add-item"]',
      popover: {
        title: "1. Create New Product",
        description: "Click Create Item to add a new product. Fill in item name, SKU, barcode, retail price, unit, category, and initial stock.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="export-header-excel"]',
      popover: {
        title: "2. Export Catalog Dataset",
        description: "Click Export Excel to download your full inventory dataset into an Excel spreadsheet.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-list"]',
      popover: {
        title: "3. Inventory Product Catalog",
        description: "Master list of all store items, retail selling prices, barcodes, SKUs, and stock availability.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-search"]',
      popover: {
        title: "4. Quick Product Search",
        description: "Type product name, SKU code (e.g. LAT-001), or barcode to filter catalog items instantly.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="status-filter"]',
      popover: {
        title: "5. Status Filter",
        description: "Filter catalog items by Active (published for sale) or Inactive status.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="advanced-filters"]',
      popover: {
        title: "6. Advanced Filters",
        description: "Open filter panel to narrow products by Category, Unit of Measurement, Price Range, or Item Type.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="scan-barcode"]',
      popover: {
        title: "7. Scan Barcode Scanner",
        description: "Use your device camera or USB barcode scanner to quickly find products by scanning physical tags.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="export-excel"]',
      popover: {
        title: "8. Control Bar Export Excel",
        description: "Download your inventory catalog into a structured Excel (.csv) report for stock audits.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-actions"]',
      popover: {
        title: "9. Product Actions",
        description: "Preview customer storefront view (👁️), edit product pricing & stock (✏️), or remove items (🗑️).",
        side: "left",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock": [
    {
      element: '[data-tour="sidebar-link-overview"]',
      popover: {
        title: "1. Stock Overview",
        description: "You are on the Stock Overview screen. This screen monitors live item balances, total cost valuation, low stock warnings, and out-of-stock items.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-metrics"]',
      popover: {
        title: "2. Key Stock Metrics & Valuation",
        description: "View total active items, total monetary value of current stock at purchase cost, low stock warnings, and out-of-stock count.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-search"]',
      popover: {
        title: "3. Fast Product Search",
        description: "Search products instantly by Item Name, SKU Code (e.g. LAT-001), or Barcode number to filter table rows.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-batches-action"]',
      popover: {
        title: "4. Batch & Expiry Control",
        description: "Click 'Batches' on any item to view individual supplier delivery lots, purchase costs, manufacture dates, and expiration dates.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-in-action"]',
      popover: {
        title: "5. Quick Stock In (Receiving)",
        description: "Click 'In' to quickly add incoming stock received from a supplier or restock with purchase cost.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-out-action"]',
      popover: {
        title: "6. Quick Stock Out (Write-Off)",
        description: "Click 'Out' to deduct damaged, expired, internal store usage, or sample items.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-movements"]',
      popover: {
        title: "7. Next: Movements Ledger",
        description: "Click 'Movements' in the left sidebar anytime to inspect the complete audit trail of every stock change!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/movements": [
    {
      element: '[data-tour="sidebar-link-movements"]',
      popover: {
        title: "1. Movements Ledger",
        description: "You are on the Stock Movements Ledger. This page logs every stock entry, POS sale deduction, write-off, and physical count adjustment.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="movements-filter-chips"]',
      popover: {
        title: "2. Movement Type Filters",
        description: "Filter history by All Movements, Stock In (purchases), Stock Out (sales/disposals), or Adjustments (count corrections).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="movements-search"]',
      popover: {
        title: "3. Search Movement Records",
        description: "Search transactions by product title, reference invoice/PO number, write-off reason, or staff member name.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="movements-date-filter"]',
      popover: {
        title: "4. Date Range & Presets",
        description: "Filter records by quick presets (Today, Last 7 Days, Last 30 Days) or select custom 'From' and 'To' dates for audit reporting.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="movements-row-adjust"]',
      popover: {
        title: "5. Adjust Past Movement",
        description: "Click the 'Adjust' button on any row to launch a pre-filled stock count reconciliation form.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-stock-in"]',
      popover: {
        title: "6. Next: Stock In Intake",
        description: "Click 'Stock in' in the left sidebar to register new incoming supplier shipments with purchase order details!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/in": [
    {
      element: '[data-tour="sidebar-link-stock-in"]',
      popover: {
        title: "1. Stock In Intake Screen",
        description: "You are on the Stock In receiving page. Use this form to record new supplier deliveries, purchases, and restocks.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-item-select"]',
      popover: {
        title: "2. Select Product Item",
        description: "Search and select the item or variant being received. You can also click the barcode scanner button to select items instantly.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-quantity-input"]',
      popover: {
        title: "3. Quantity Received",
        description: "Enter the number of units received. Choose the unit of measurement if your product uses multiple packaging units.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-price-input"]',
      popover: {
        title: "4. Purchase Unit Cost",
        description: "Enter the cost price paid per unit. System inventory valuation and FIFO margin tracking are calculated from this cost.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-reason-input"]',
      popover: {
        title: "5. Invoice / Reference Reason",
        description: "Specify the delivery reference number or reason (e.g. Supplier PO-2026-001, Weekly Restock, Customer Return).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-batch-card"]',
      popover: {
        title: "6. Lot & Expiry Date Details",
        description: "Optional. Input Supplier Batch / Lot #, Manufactured Date, and Expiration Date for perishable inventory tracking.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-summary-panel"]',
      popover: {
        title: "7. Live Movement Summary",
        description: "Real-time summary preview showing Current Stock ➔ New Projected Balance and total dollar value added.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-submit-btn"]',
      popover: {
        title: "8. Confirm Stock In",
        description: "Click to save and record this inventory intake directly into your ledger.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-stock-out"]',
      popover: {
        title: "9. Next: Stock Out Write-Off",
        description: "Click 'Stock out' in the left sidebar to record stock disposals, damaged goods, or store usage!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/out": [
    {
      element: '[data-tour="sidebar-link-stock-out"]',
      popover: {
        title: "1. Stock Out Write-Off Screen",
        description: "You are on the Stock Out page. Use this form to record stock write-offs, damaged goods, expired items, or internal store consumption.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-item-select"]',
      popover: {
        title: "2. Select Product Item",
        description: "Search and select the item or variant to deduct. Use the barcode scanner button for quick picking.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-quantity-input"]',
      popover: {
        title: "3. Quantity Removed",
        description: "Enter the number of units to deduct from on-hand inventory.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-price-input"]',
      popover: {
        title: "4. Selling Price (Optional)",
        description: "Enter selling price per unit if sold away from POS, or leave empty for waste/damage (cost is calculated from original batches).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-reason-input"]',
      popover: {
        title: "5. Write-Off Reason",
        description: "Enter a required reason code (e.g. Expired batch, Damaged in store, Staff sample, Broken package).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-batch-card"]',
      popover: {
        title: "6. Lot & Expiry Deduction",
        description: "Specify which supplier Lot / Batch # is being deducted to maintain FIFO inventory accuracy.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-summary-panel"]',
      popover: {
        title: "7. Live Movement Summary",
        description: "Preview resulting stock levels before confirming. Warns automatically if deduction exceeds available stock.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="stock-submit-btn"]',
      popover: {
        title: "8. Confirm Stock Out",
        description: "Click to confirm and log this stock deduction into your audit ledger.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-adjust-stock"]',
      popover: {
        title: "9. Next: Adjust Stock Audit",
        description: "Click 'Adjust stock' in the left sidebar to perform physical inventory stocktakes!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/adjust": [
    {
      element: '[data-tour="sidebar-link-adjust-stock"]',
      popover: {
        title: "1. Adjust Stock Audit Screen",
        description: "You are on the Physical Stock Reconciliation page used during periodic stocktakes to reconcile system records with actual shelf counts.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-item-select"]',
      popover: {
        title: "2. Select Product Item",
        description: "Search item by title, SKU, or click the barcode scanner button.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-action-select"]',
      popover: {
        title: "3. Adjustment Action Mode",
        description: "Choose Overstated (deducts stock when system is higher than shelf), Understated (adds stock when shelf is higher), or Manual mode.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-record-link"]',
      popover: {
        title: "4. Link to Past Entry",
        description: "Optional. Link this correction to a past delivery or sale entry in the ledger for full audit tracking.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-quantity-input"]',
      popover: {
        title: "5. Discrepancy Quantity",
        description: "Enter physical count variance (+/- difference between physical count and system balance).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-reason-input"]',
      popover: {
        title: "6. Audit Reason Note",
        description: "State why the adjustment is made (e.g. Monthly stocktake variance, Theft, Miscount, Spoilage).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-batch-card"]',
      popover: {
        title: "7. Batch & Expiry Adjustment",
        description: "Update batch numbers or expiration dates during physical stocktaking.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-summary-panel"]',
      popover: {
        title: "8. Live Movement Summary",
        description: "Real-time calculation preview: Current Stock ➔ New Reconciled Balance.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="adjust-submit-btn"]',
      popover: {
        title: "9. Save Stock Adjustment",
        description: "Click to save physical stock reconciliation into your database.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-item-config"]',
      popover: {
        title: "10. Next: Item Configuration",
        description: "Click 'Item config' in the left sidebar to manage measurement units, category groups, add-ons, and option presets!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config": [
    {
      element: '[data-tour="inventory-config-tabs"]',
      popover: {
        title: "1. Item Configuration Center",
        description: "Central configuration hub for measurement units, item category groups, product add-ons, and option presets.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="config-tab-units"]',
      popover: {
        title: "2. Units of Measurement",
        description: "Configure product base units (Kilogram, Piece, Box, Liter) and conversion factors.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="config-tab-groups"]',
      popover: {
        title: "3. Item Groups & Categories",
        description: "Organize products into hierarchical category groups for POS touchscreens and sales reports.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="config-tab-add-ons"]',
      popover: {
        title: "4. Add-ons & Modifiers",
        description: "Manage product add-ons, extra toppings, and custom order options.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="config-tab-presets"]',
      popover: {
        title: "5. Option Presets & Attributes",
        description: "Predefine reusable variant attributes (e.g. Size: Small, Medium, Large) for product creation.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/units": [
    {
      element: '[data-tour="sidebar-link-units"]',
      popover: {
        title: "1. Units Module Link",
        description: "You are on the Units setup screen under Item config. Define your business measurement vocabulary (e.g. Sack, Box, Kilogram, Piece, Liter) for stock tracking.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="inventory-config-tabs"]',
      popover: {
        title: "2. Config Building Blocks Bar",
        description: "Switch seamlessly between Units, Categories, Add-ons, and Option presets without losing page context.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="units-info-banner"]',
      popover: {
        title: "3. Vocabulary vs Arithmetic Rule",
        description: "Units define measurement names & symbols (e.g. Sack, Box, Kg). Conversion ratios (e.g. how many grams per sack) are configured per item because a sack of rice and flour weigh differently.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="units-category-list"]',
      popover: {
        title: "4. Grouped Units Directory",
        description: "View active units categorized by measurement type (Count, Weight, Volume, Dimension). Built-in system units are protected against deletion.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-name"]',
      popover: {
        title: "5. Unit Name Input",
        description: "Enter the full title of your custom measurement unit (e.g. Sack, Tray, Can, Roll, Carton).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-symbol"]',
      popover: {
        title: "6. Short Symbol",
        description: "Enter a short symbol (e.g. sck, try, cn, ctn) displayed next to quantities on POS receipts and stock tables.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-base-toggle"]',
      popover: {
        title: "7. Measurement Category",
        description: "Select what the unit measures (Count, Weight, Volume, Dimension) to enforce accurate measurement types.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-submit"]',
      popover: {
        title: "8. Save Unit Entry",
        description: "Click to save your custom measurement unit into the system.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-categories"]',
      popover: {
        title: "9. Next: Categories & Groups",
        description: "Click 'Categories' in the left sidebar to organize items into menu groups!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/groups": [
    {
      element: '[data-tour="sidebar-link-categories"]',
      popover: {
        title: "1. Categories Module Link",
        description: "You are on the Categories & Item Groups screen under Item config. Organize products into POS menu groups and catalog categories.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="inventory-config-tabs"]',
      popover: {
        title: "2. Config Building Blocks Bar",
        description: "Quickly switch between Item Config building blocks anytime.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="category-structure-list"]',
      popover: {
        title: "3. Category Hierarchy Tree",
        description: "View configured categories and nested subcategories tree structure used on POS touchscreens and sales reports.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="category-form-mode"]',
      popover: {
        title: "4. Category vs Subcategory Toggle",
        description: "Switch mode to create a top-level Category (e.g. Beverages) or a nested Subcategory (e.g. Matcha under Beverages).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="category-form-name"]',
      popover: {
        title: "5. Category Title Input",
        description: "Enter category title displayed on POS touchscreen grid buttons and sales summary reports.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="category-form-note"]',
      popover: {
        title: "6. Description Note",
        description: "Add optional descriptive notes explaining what items belong in this category.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="category-form-submit"]',
      popover: {
        title: "7. Save Category Structure",
        description: "Click to save and publish your category structure.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-add-ons"]',
      popover: {
        title: "8. Next: Product Add-ons",
        description: "Click 'Add-ons' in the left sidebar to set up extra toppings and modifications!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/add-ons": [
    {
      element: '[data-tour="sidebar-link-add-ons"]',
      popover: {
        title: "1. Product Add-ons Module Link",
        description: "You are on the Add-ons management screen. Define extra toppings, modifications, and side choices once to share them across multiple menu items.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="inventory-config-tabs"]',
      popover: {
        title: "2. Config Building Blocks Bar",
        description: "Tab navigation header across item building blocks.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="new-addon-btn"]',
      popover: {
        title: "3. Create Individual Add-On",
        description: "Click 'New add-on' to define individual extras (e.g. Extra Cheese, Espresso Shot, Boba Pearls) with unit inventory deduction rates.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="new-set-btn"]',
      popover: {
        title: "4. Create Add-On Group Set",
        description: "Click 'New set' to group multiple add-ons together (e.g. Choice of Toppings, Syrup Selection) with min/max selection rules.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-option-presets"]',
      popover: {
        title: "5. Next: Option Presets",
        description: "Click 'Option presets' in the left sidebar to set up reusable item option choices!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/presets": [
    {
      element: '[data-tour="sidebar-link-option-presets"]',
      popover: {
        title: "1. Option Presets Module Link",
        description: "You are on the Option Presets screen. Predefine reusable choice lists (e.g. Small / Medium / Large, Ice Level 0% / 50% / 100%) so choices don't need to be retyped on every item.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="inventory-config-tabs"]',
      popover: {
        title: "2. Config Building Blocks Bar",
        description: "Final building block in item configuration.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="preset-info-banner"]',
      popover: {
        title: "3. Template Master Copy Rule",
        description: "Applying a preset copies choice values onto an item — editing a preset afterwards does not rewrite existing items, preventing accidental mass changes.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="presets-list-container"]',
      popover: {
        title: "4. Master Presets Directory",
        description: "View saved choice lists (e.g. Size: Small, Medium, Large) and whether picking a choice is mandatory at checkout.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="preset-form-name"]',
      popover: {
        title: "5. Preset Name Input",
        description: "Enter preset title (e.g. Cup Size, Temperature, Sweetness Level).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="preset-form-submit"]',
      popover: {
        title: "6. Save Option Preset",
        description: "Click to save your option preset template into your system.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/new": [
    {
      element: '[data-tour="item-form-name"]',
      popover: {
        title: "1. ឈ្មោះទំនិញ (Item Name)",
        description: "ឈ្មោះទំនិញសម្រាប់បង្ហាញលើ POS និងវិក្កយបត្រ — [ចាំបាច់] — ឧទាហរណ៍៖ Coca Cola 330ml",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-sku"]',
      popover: {
        title: "2. កូដទំនិញ (SKU/Code)",
        description: "លេខសម្គាល់ទំនិញស្វ័យប្រវត្តិ ឬវាយបញ្ចូលដោយដៃ — [ចាំបាច់] — ឧទាហរណ៍៖ COC-330",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-barcode"]',
      popover: {
        title: "3. លេខបារកូដ (Barcode)",
        description: "លេខកូដបារកូដសម្រាប់ស្កេនលក់នៅ POS — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 8850123456789",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-category"]',
      popover: {
        title: "4. ប្រភេទទំនិញ (Category)",
        description: "ក្រុមទំនិញសម្រាប់តម្រៀបក្នុង POS និងរបាយការណ៍ — [ចាំបាច់] — ឧទាហរណ៍៖ Beverages / Drinks",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-unit"]',
      popover: {
        title: "5. ខ្នាតរង្វាស់ (Unit)",
        description: "ខ្នាតលក់ដើមដូចជាកំប៉ុង ឬដប (ត្រូវបង្កើត Unit មុនបើមិនទាន់មាន) — [ចាំបាច់] — ឧទាហរណ៍៖ Can, Bottle, Pcs",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-low-stock"]',
      popover: {
        title: "9. កម្រិតជូនដំណឹងស្តុកជិតអស់ (Low Stock Alert)",
        description: "ចំនួនស្តុកអប្បបរមាដែលត្រូវប្រព័ន្ធរ៉កជូនដំណឹង — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 5 Cans",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-status"]',
      popover: {
        title: "12. ស្ថានភាពទំនិញ (Status)",
        description: "បើក ឬបិទការលក់ទំនិញនេះក្នុងប្រព័ន្ធ — [ចាំបាច់] — ឧទាហរណ៍៖ Active (បើកលក់)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-save"]',
      popover: {
        title: "13. ប៊ូតុងរក្សាទុក (Save Button)",
        description: "រក្សាទុកទំនិញ។ លំដាប់អនុវត្ត៖ បង្កើត Unit → បង្កើត Category → បំពេញព័ត៌មាន → កំណត់តម្លៃ → បញ្ចូលស្តុក → ចុច Save!",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],



  "/pos": [
    {
      element: '[data-tour="pos-open-register"]',
      popover: {
        title: "1. បើកវេនលក់ (Open Register/Shift)",
        description: "បញ្ចូលចំនួនសាច់ប្រាក់ដើមវេនក្នុងថតលុយ — [ចាំបាច់] — ឧទាហរណ៍៖ $50.00 (Opening Float)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-search-grid"]',
      popover: {
        title: "2. ផ្ទាំងទំនិញ និងស្កេនបារកូដ (Item Grid / Scanner)",
        description: "ចុចលើរូបទំនិញ ឬស្កេនបារកូដដើម្បីបញ្ចូលទៅកន្ត្រក — [ចាំបាច់] — ឧទាហរណ៍៖ ស្កេន 8850123456789",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-cart-qty"]',
      popover: {
        title: "3. កែប្រែចំនួនទំនិញ (Quantity Adjuster)",
        description: "ចុចប៊ូតុង + ឬ - ដើម្បីកើន/បន្ថយចំនួនទំនិញក្នុងកន្ត្រក — [ចាំបាច់] — ឧទាហរណ៍៖ ២ កំប៉ុង",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-select-customer"]',
      popover: {
        title: "5. ជ្រើសរើសអតិថិជន (Select Customer)",
        description: "ភ្ជាប់ព័ត៌មានអតិថិជនដើម្បីសន្សំពិន្ទុ ឬទទួលបានសិទ្ធិភាគរយសមាជិក — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ សុខ ចាន់",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-cart-discount"]',
      popover: {
        title: "4. បញ្ចុះតម្លៃ (Apply Discount)",
        description: "បញ្ចូលភាគរយ % ឬចំនួនទឹកប្រាក់បញ្ចុះតម្លៃ — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 10% Off ឬ -$1.00",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-checkout"]',
      popover: {
        title: "8. បញ្ចប់ការលក់ និងបោះពុម្ពវិក្កយបត្រ (Confirm & Print)",
        description: "ចុច Pay ដើម្បីបញ្ចប់ការលក់ បោះពុម្ពវិក្កយបត្រ ឬផ្ញើតាម Telegram — [ចាំបាច់] — ឧទាហរណ៍៖ បោះពុម្ព 80mm Receipt",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-close-register"]',
      popover: {
        title: "9. បិទវេនលក់ (Close Register/Shift)",
        description: "រាប់សាច់ប្រាក់ចុងវេនដើម្បីផ្ទៀងផ្ទាត់ប្រាក់ក្នុងថត និងរកឃើញភាពខុសគ្នា — [ចាំបាច់] — ឧទាហរណ៍៖ Counted $350.00 (Variance $0.00)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/employees": [
    {
      element: '[data-tour="sidebar-section-employees"]',
      popover: {
        title: "1. Employees & Staff Section",
        description: "You are in the Staff & User Management module. Manage staff accounts, assign security role permissions, and view platform audit logs.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="employees-tabs"]',
      popover: {
        title: "2. Management Tabs",
        description: "Switch between Users (staff accounts), Roles & permissions (security roles), and Audits (admin activity logs).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-user"]',
      popover: {
        title: "3. Add User Account",
        description: "Create a new staff login account with name, email, phone number, gender, and security role.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="staff-search"]',
      popover: {
        title: "4. Search Staff Directory",
        description: "Search team members by full name, email address, username, or phone number.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="user-list"]',
      popover: {
        title: "5. Staff Directory Table",
        description: "View active and deactivated staff members, assigned security roles, and edit/delete account details.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tab-roles"]',
      popover: {
        title: "6. Roles & Permissions Tab",
        description: "Click here to switch to the security roles management view.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-role"]',
      popover: {
        title: "7. Create Custom Security Role",
        description: "Create custom roles (e.g. Cashier, Store Manager, Accountant) and configure granular module permissions.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="roles-list"]',
      popover: {
        title: "8. Roles & Permission Groups",
        description: "View configured security roles, total granted permissions, assigned staff count, and edit role checkboxes.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tab-audits"]',
      popover: {
        title: "9. Audit Logs Tab",
        description: "Switch to 'Audits' tab to inspect system administrative activity logs across your business.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/profile": [
    {
      element: '[data-tour="profile-logo"]',
      popover: {
        title: "1. Store Logo & Branding",
        description: "Upload your store logo. It appears on thermal receipts and online storefronts.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-name"]',
      popover: {
        title: "2. Store Legal Name",
        description: "Enter your official registered store/business name.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-category"]',
      popover: {
        title: "3. Business Category",
        description: "Select your business industry (Retail, Supermarket, Restaurant, Cafe, etc.).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-about"]',
      popover: {
        title: "4. Store Description ℹ",
        description: "Write a short summary about your business for customers.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-email"]',
      popover: {
        title: "5. Official Email",
        description: "Enter your store contact email address for customer billing.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-phone"]',
      popover: {
        title: "6. Phone Number",
        description: "Provide the main customer service phone number.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-address"]',
      popover: {
        title: "7. Store Address",
        description: "Input your physical store address printed on receipts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-save"]',
      popover: {
        title: "8. Save Business Profile",
        description: "Click Save to update and persist your business settings.",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/currency": [
    {
      element: '[data-tour="currency-base"]',
      popover: {
        title: "1. Base Currency",
        description: "Select your primary store base currency (e.g. USD or KHR). All accounting balances and stock values reference this base currency.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="currency-decimals"]',
      popover: {
        title: "2. Decimal Places",
        description: "Choose currency precision (0 decimals for KHR, 2 decimals standard for USD/EUR).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="currency-display"]',
      popover: {
        title: "3. Display Currency",
        description: "Select secondary dual-currency display for customer receipts and POS till screens.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="currency-list"]',
      popover: {
        title: "4. Active Trading Currencies",
        description: "Add and manage foreign currencies accepted by your store for multi-currency transactions.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="currency-calculator"]',
      popover: {
        title: "5. Exchange Rate & Calculator",
        description: "Interactively test live currency conversions and swap base exchange rates.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="currency-live-rates"]',
      popover: {
        title: "6. Dynamic World Exchange Rates",
        description: "Connect to real-time global market rates with 30-second live polling updates.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/payments": [
    {
      element: '[data-tour="payments-toggle"]',
      popover: {
        title: "1. Bakong KHQR Till Toggle",
        description: "Turn KHQR digital payments ON/OFF for customer checkout at the POS register.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="payments-account"]',
      popover: {
        title: "2. Bakong Account Credentials",
        description: "Enter your Bakong account ID (e.g. your_name@bank), merchant name, city, acquiring bank, and store label.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="payments-token"]',
      popover: {
        title: "3. Bakong API Token",
        description: "Input your Bakong Open API Token to automatically verify payment arrival in real time.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="payments-save"]',
      popover: {
        title: "4. Save Payment Configuration",
        description: "Click Save to store your Bakong KHQR merchant settings.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/telegram": [
    {
      element: '[data-tour="telegram-toggle"]',
      popover: {
        title: "1. Enable Telegram Bot Integration",
        description: "Toggle Telegram bot connectivity ON/OFF for automated customer messaging and storefront access.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="telegram-token"]',
      popover: {
        title: "2. Bot Token",
        description: "Enter your unique Telegram Bot Token generated from @BotFather.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="telegram-chat-id"]',
      popover: {
        title: "3. Notification Chat ID",
        description: "Specify the Telegram group or channel chat ID to receive instant store sales and payment notifications.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="telegram-welcome"]',
      popover: {
        title: "4. Customer Welcome Message",
        description: "Write a custom welcome greeting for shoppers opening your bot storefront.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="telegram-save"]',
      popover: {
        title: "5. Save Telegram Settings",
        description: "Click Save to activate your Telegram store bot integration.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/facebook": [
    {
      element: '[data-tour="facebook-connect-panel"]',
      popover: {
        title: "1. Facebook Messenger & Auto-Reply",
        description: "Manage your Facebook Page connection, automated messaging, and shop catalog setup.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="facebook-connect-btn"]',
      popover: {
        title: "2. 1-Click Facebook OAuth Connect",
        description: "Click here to securely connect your Facebook Page using official Facebook OAuth authorization.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/dashboard": [
    {
      element: '[data-tour="sidebar-section-dashboard"]',
      popover: {
        title: "1. Dashboard Section",
        description: "You are on the Overview Dashboard screen. Monitor live store metrics, real-time catalog figures, channel revenue, and profit margins.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-overview"]',
      popover: {
        title: "2. Live Inventory Figures",
        description: "Central overview card displaying total product catalog counts, active items, total units in stock, and low stock alerts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-stats"]',
      popover: {
        title: "3. Key KPI Counters",
        description: "Real-time stat cards monitoring Total Items in catalog, Active Items published for sale, Total Units in warehouse, and Low Stock Threshold alerts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-sales-chart"]',
      popover: {
        title: "4. Sales Channel Performance Chart",
        description: "Interactive revenue chart comparing sales across physical POS, Online Store, Mobile App, and Marketplace channels.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-channel-cards"]',
      popover: {
        title: "5. Channel Revenue KPIs",
        description: "View total revenue per channel. Click any channel card (POS, Online, Mobile, Marketplace) to toggle line curves and compare sales trends.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-stock-on-hand"]',
      popover: {
        title: "6. Stock On Hand Leaderboard",
        description: "Displays your top six best-stocked inventory items with visual quantity balance bars.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-profit"]',
      popover: {
        title: "7. Next: Profit Analytics",
        description: "Click 'Profit' in the left sidebar to view net profit margins and channel cost breakdowns!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/analytics": [
    {
      element: '[data-tour="sidebar-link-profit"]',
      popover: {
        title: "1. Profit Module Link",
        description: "You are on the Profit & Analytics screen under Dashboard. Monitor real-time net profit margins, cost of goods sold (COGS), and sales channel breakdowns.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profit-range-select"]',
      popover: {
        title: "2. Date Period Filter",
        description: "Filter profit calculations by Today, This Week, This Month, This Year, or All Time.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profit-kpi-grid"]',
      popover: {
        title: "3. Net Profit KPI Tiles",
        description: "Real-time summary tiles displaying Gross Revenue, Cost of Goods Sold (actual batch cost recorded at each sale), Net Profit kept, and Margin %.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profit-channel-breakdown"]',
      popover: {
        title: "4. Channel Profit Breakdown Table",
        description: "Comprehensive breakdown table showing Sales count, Gross Revenue, COGS, Net Profit, and Margin % across POS, Online Store, Telegram, and Messenger.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/notifications": [
    {
      element: '[data-tour="sidebar-section-notifications"]',
      popover: {
        title: "1. Notifications Module Link",
        description: "You are on the Notifications & System Alerts screen. Monitor real-time system events, POS sales receipts, low stock warnings, and payment alerts.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="notifications-stats"]',
      popover: {
        title: "2. Real-Time Alert Counters",
        description: "Stat cards displaying Total Notifications, Unread Alerts, Order Updates, and Stock Warnings.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="notifications-search"]',
      popover: {
        title: "3. Search Alert Logs",
        description: "Search notifications by keyword, order invoice number, or staff member name.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="notifications-tabs"]',
      popover: {
        title: "4. Category Filter Chips",
        description: "Filter notification logs by category: All, Unread, Orders, Inventory, Payments, or System alerts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="notifications-list"]',
      popover: {
        title: "5. Live Notification Stream",
        description: "Click any notification item to mark it as read and jump directly to its related sales order or stock item.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales": [
    {
      element: '[data-tour="sidebar-section-sales"]',
      popover: {
        title: "1. Sale Management Section",
        description: "You are in the Sale Management app. Track sales orders, digital menu storefronts, item channel pricing, customer CRM, discounts, and member types.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sales-digital-menu"]',
      popover: {
        title: "2. Digital QR Code Menu",
        description: "Toggle online storefront visibility so customers can scan QR codes to browse your live menu.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sales-order-stats"]',
      popover: {
        title: "3. Orders Summary KPIs",
        description: "Overview counters displaying Total Orders count, Gross Revenue, Paid orders, and Pending orders.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sales-orders-filters"]',
      popover: {
        title: "4. Search & Filter Bar",
        description: "Filter orders by Date range (Today, 7 days, 30 days, All time), Status (ALL, PENDING, PAID, CANCELLED, FAILED), or Channel (POS, TELEGRAM, MESSENGER, WEB).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sales-orders-table"]',
      popover: {
        title: "5. Sales Orders History",
        description: "View order invoice numbers, timestamps, sales channels, item counts, total amounts, and payment status.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-item-&-pricing"]',
      popover: {
        title: "6. Next: Item & Pricing",
        description: "Click 'Item & Pricing' in the left sidebar to manage base prices and sales channel pricing!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/pricing": [
    {
      element: '[data-tour="sidebar-link-item-&-pricing"]',
      popover: {
        title: "1. Item & Pricing Link",
        description: "You are on the Item & Pricing page under Sale Management.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pricing-scope-selector"]',
      popover: {
        title: "2. Base Price vs Channel Selector",
        description: "Switch between setting master Base Prices for your business or custom Channel Overrides for POS, Web, Telegram, and Messenger.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pricing-filter-bar"]',
      popover: {
        title: "3. Item Search & Barcode Scanner",
        description: "Search products by name, SKU, or scan barcodes to set prices directly.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "4. Channel Pricing & Schedule Matrix",
        description: "Configure custom channel markups, percentage rules, and channel operating hours.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-customers"]',
      popover: {
        title: "5. Next: Customers",
        description: "Click 'Customers' in the left sidebar to manage customer profiles and CRM histories!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/customers": [
    {
      element: '[data-tour="sidebar-link-customers"]',
      popover: {
        title: "1. Customers Link",
        description: "You are on the Customer Directory & CRM page.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-customer-btn"]',
      popover: {
        title: "2. Add Customer",
        description: "Create new customer profiles with name, email, phone number, address, and membership tier.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="customers-search-bar"]',
      popover: {
        title: "3. Customer Search & Columns",
        description: "Search customers by name, phone, or email, and customize visible table columns.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="customers-table-container"]',
      popover: {
        title: "4. Customer Directory Table",
        description: "View customer contact info, assigned membership type, sales channel, address, lifetime spend, and active status.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-discounts-&-coupons"]',
      popover: {
        title: "5. Next: Discounts & Coupons",
        description: "Click 'Discounts & Coupons' in the left sidebar to set up promo codes and discount rules!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/discounts": [
    {
      element: '[data-tour="sidebar-link-discounts-&-coupons"]',
      popover: {
        title: "1. Discounts & Coupons Link",
        description: "You are on the Discounts & Coupons page.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="create-discount-btn"]',
      popover: {
        title: "2. Create Discount / Coupon",
        description: "Build percentage or fixed dollar discounts, minimum order requirements, buy-X-get-Y rules, or promo coupons.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="discounts-tabs"]',
      popover: {
        title: "3. Discounts vs Coupons Tab",
        description: "Toggle between automatic discount rules and customer-redeemable coupon codes.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="discounts-search-bar"]',
      popover: {
        title: "4. Search & Column Controls",
        description: "Search discount rules or coupon codes by keyword.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="discounts-table-container"]',
      popover: {
        title: "5. Discounts & Coupons Table",
        description: "View active promotional rules, linked coupons, usage limits, and channel applicability.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-member-types"]',
      popover: {
        title: "6. Next: Member Types",
        description: "Click 'Member Types' in the left sidebar to manage loyalty tiers!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/membership-types": [
    {
      element: '[data-tour="sidebar-link-member-types"]',
      popover: {
        title: "1. Member Types Link",
        description: "You are on the Member Types & Loyalty Tiers page.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-member-type-btn"]',
      popover: {
        title: "2. Add Member Type",
        description: "Define custom membership tiers (e.g. VIP, Gold, Silver) and link automatic discount rules.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="member-types-search-bar"]',
      popover: {
        title: "3. Search & Column Controls",
        description: "Filter membership tiers by name or notes.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="member-types-table-container"]',
      popover: {
        title: "4. Member Types Directory",
        description: "View active tier names, assigned discount rules, remarks, and status.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/cash-register": [
    {
      element: '[data-tour="cash-register-shift"]',
      popover: {
        title: "Cash Register Shift & Float Management",
        description: "Open your shift float balance, count drawer cash, and close register with end-of-day X/Z reports.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],
};
