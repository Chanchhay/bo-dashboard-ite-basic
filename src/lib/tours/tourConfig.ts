import type { DriverHook, DriveStep } from "driver.js";

function waitForElement(selector: string, timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

/**
 * For a step that highlights a "New X" button: keep the button on screen,
 * untouched, until the visitor actually clicks Next — then open the modal
 * and only advance once its first field has mounted, so the following step
 * never races the dialog's render.
 */
function openModalOnNext(buttonSelector: string, firstFieldSelector: string): DriverHook {
  return (_element, _step, opts) => {
    (document.querySelector(buttonSelector) as HTMLButtonElement | null)?.click();
    void waitForElement(firstFieldSelector).then(() => opts.driver.moveNext());
  };
}

function clickScopeAndRefresh(chipSelector: string): DriverHook {
  return (_element, _step, opts) => {
    const chip = document.querySelector(chipSelector) as HTMLButtonElement | null;
    if (chip) {
      const isActive =
        chip.classList.contains("bg-primary/10") ||
        chip.classList.contains("bg-primary") ||
        chip.getAttribute("aria-selected") === "true";

      if (!isActive) {
        chip.click();
        setTimeout(() => {
          opts.driver.refresh();
        }, 80);
      } else {
        opts.driver.refresh();
      }
    }
  };
}

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

  "/sales": [
    {
      element: '[data-tour="sidebar-link-orders"]',
      popover: {
        title: "1. Connection: Inventory Catalog → Live Sales Orders",
        description: "Welcome to Sale Management! Every order here is built from products in your Inventory Catalog, and stock is deducted the moment a sale is confirmed. Track customer purchases across all sales channels — POS, Web Store, Telegram, and Messenger.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-digital-menu"]',
      popover: {
        title: "2. Digital Menu & Online Storefront",
        description: "Toggle customer web menu visibility ON/OFF, generate storefront QR codes for tables/countertops, and launch your live digital store link.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-totals"]',
      popover: {
        title: "3. Real-Time Sales & Revenue Metrics",
        description: "Monitor live metrics for Total Orders, Gross Sales Revenue, Paid Transactions, and Pending Orders awaiting cashier confirmation or payment.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-filters"]',
      popover: {
        title: "4. Search & Multi-Channel Filter Bar",
        description: "Instantly search orders by invoice #, customer name, phone, or item. Filter by Date Range (Today, 7 days, 30 days), Payment Status, or Sales Channel (POS, Web, Telegram, Messenger).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-list"]',
      popover: {
        title: "5. Master Orders List & Receipt Audit",
        description: "View invoice totals, order item details, tax calculations, and status badges. Click any order row to review customer receipts, approve pay-later orders, print tickets, or cancel orders.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-pay-later"]',
      popover: {
        title: "6. Next: Pay Later Invoices",
        description: "Click 'Pay Later' in the left sidebar anytime to review and collect unpaid credit customer invoices!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/orders": [
    {
      element: '[data-tour="sidebar-link-orders"]',
      popover: {
        title: "1. Connection: Inventory Catalog → Live Sales Orders",
        description: "Welcome to Sale Management! Every order here is built from products in your Inventory Catalog, and stock is deducted the moment a sale is confirmed. Track customer purchases across all sales channels — POS, Web Store, Telegram, and Messenger.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-digital-menu"]',
      popover: {
        title: "2. Digital Menu & Online Storefront",
        description: "Toggle customer web menu visibility ON/OFF, generate storefront QR codes for tables/countertops, and launch your live digital store link.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-totals"]',
      popover: {
        title: "3. Real-Time Sales & Revenue Metrics",
        description: "Monitor live metrics for Total Orders, Gross Sales Revenue, Paid Transactions, and Pending Orders awaiting cashier confirmation or payment.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-filters"]',
      popover: {
        title: "4. Search & Multi-Channel Filter Bar",
        description: "Instantly search orders by invoice #, customer name, phone, or item. Filter by Date Range (Today, 7 days, 30 days), Payment Status, or Sales Channel (POS, Web, Telegram, Messenger).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="orders-list"]',
      popover: {
        title: "5. Master Orders List & Receipt Audit",
        description: "View invoice totals, order item details, tax calculations, and status badges. Click any order row to review customer receipts, approve pay-later orders, print tickets, or cancel orders.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-pay-later"]',
      popover: {
        title: "6. Next: Pay Later Invoices",
        description: "Click 'Pay Later' in the left sidebar anytime to review and collect unpaid credit customer invoices!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/pay-later": [
    {
      element: '[data-tour="sidebar-link-pay-later"]',
      popover: {
        title: "1. Connection: Orders → Pay Later Collections",
        description: "Any order checked out as 'Pay Later' in the Orders list lands here automatically. Track credit sales, unpaid invoices, and customer phone contacts — settling a balance updates that order's status back on the Orders screen and logs the cash in Register Sessions.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pay-later-totals"]',
      popover: {
        title: "2. Credit Metrics & Overdue Audit",
        description: "Monitor live summaries for Total Outstanding sales count, Overdue invoices exceeding the 7-day threshold, and Total Dollar Amount Owed across all store customers.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pay-later-filters"]',
      popover: {
        title: "3. Customer Search & Filter Controls",
        description: "Search unpaid sales by invoice number, customer name, or phone. Filter by Sales Channel (POS, Online Store, Telegram, Messenger), sort by Oldest/Newest/Highest Owed, or toggle visible table columns.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pay-later-list"]',
      popover: {
        title: "4. Outstanding Invoices Audit Table",
        description: "Review invoice numbers, customer phone links, channel origin, sale timestamps, overdue aging badges (e.g. Overdue 11d), and exact dollar amounts owed per transaction.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pay-later-collect-btn"]',
      popover: {
        title: "5. Collect Payment & Issue Settled Receipt",
        description: "Click 'Collect' on any row to launch the cash collection drawer, accept customer cash payment, automatically record the settlement, and print an updated receipt ticket.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-pricing"]',
      popover: {
        title: "6. Next: Item & Pricing Matrix",
        description: "Click 'Item & Pricing' in the left sidebar anytime to manage product retail prices and sales channel price overrides!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/pricing": [
    {
      element: '[data-tour="sidebar-link-pricing"]',
      popover: {
        title: "1. Connection: Inventory Catalog → Channel Pricing",
        description: "Every product created in Inventory Management appears here for price configuration. Set base prices, markup margins, and channel-specific rates — this is exactly what customers see at checkout in POS, Web Store, Telegram, and Messenger.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pricing-scope-selector"]',
      popover: {
        title: "2. Scope Selector: One Catalogue, Five Price Contexts",
        description: "This chip row is the switchboard for the whole page — Base price plus every live sales channel below it. Whichever chip is active decides which price the rest of the screen shows and edits. Let's step through each one.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-BASE"]'),
    },
    {
      element: '[data-tour="pricing-filter-bar"]',
      popover: {
        title: "3. Catalog Search, Barcode & Channel Tools",
        description: "Search items by name, SKU, or barcode. Use 'Manage channels' to bulk publish products or 'Split stock' for shelf allocation.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "4. Base Price — What the Business Charges",
        description: "This is the price floor before any channel gets involved. Calculate it automatically from stock cost with a margin rule, or set it manually. Every channel markup below is a percentage or fixed amount added on top of this number.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-BASE"]'),
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "5. Connection: Point of Sale Markup → Profit by Channel",
        description: "Set what your in-store register charges — Same as base, % markup, or a fixed markup over the base price. This exact rate is what feeds the 'Point of Sale' row on the Profit Analytics 'By channel' report.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-POS"]'),
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "6. Connection: Online Store Markup → Profit by Channel",
        description: "Set the price your web storefront charges customers browsing your digital menu. This rate drives the 'Online Store' row on the Profit Analytics 'By channel' report — raise it here to widen that channel's margin.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-WEB"]'),
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "7. Connection: Telegram Markup → Profit by Channel",
        description: "Set what your Telegram ordering bot charges. Same base price, its own markup rule — tracked separately on the 'Telegram' row of the Profit Analytics 'By channel' report so you can see if this channel is worth the bot's running cost.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-TELEGRAM"]'),
    },
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "8. Connection: Messenger Markup → Profit by Channel",
        description: "Set what your Facebook Messenger bot charges. This is the last of the four channel rates, and it lands on the 'Messenger' row of the Profit Analytics 'By channel' report right alongside the other three.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-MESSENGER"]'),
    },
    {
      element: '[data-tour="pricing-channel-schedule"]',
      popover: {
        title: "9. Channel Opening Hours & Operating Schedule",
        description: "Every channel scope (not Base) gets its own hours here. Set 24/7 Always Open, or narrow windows for a channel that should stop taking orders overnight — a closed channel shows as closed on its chip up top.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-POS"]'),
    },
    {
      element: '[data-tour="pricing-table"]',
      popover: {
        title: "10. Master Product Pricing Catalogue",
        description: "Review all inventory items, product categories, price ranges, channel publishing status, and live channel badges — for whichever scope is currently active above. Still on POS from the last step, so this is the Point of Sale catalogue.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-POS"]'),
    },
    {
      element: '[data-tour="pricing-sell-here-toggle"]',
      popover: {
        title: "11. Channel Availability Toggle ('Sell Here')",
        description: "Toggle whether a product is active and available for customer checkout on this specific sales channel. Switch it off and the item disappears from that channel's menu without touching its price or the other channels.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pricing-channel-chip-POS"]'),
    },
    {
      element: '[data-tour="pricing-set-prices-btn"]',
      popover: {
        title: "12. Set Prices & Option Overrides",
        description: "Click 'Set prices' on any product to configure base prices, unit/pack prices, compare-at rates, or channel price overrides.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-customers"]',
      popover: {
        title: "13. Next: Customer CRM Directory",
        description: "Click 'Customers' in the left sidebar anytime to manage buyer profiles, contact details, and purchase history!",
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
        title: "1. Connection: Checkout Sales → Customer Directory",
        description: "Every purchase attached to a customer at checkout — in Orders, Pay Later, or POS — rolls up into this directory as lifetime spend and order counts. Manage contact details here and assign a Member Type to unlock loyalty discounts.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-customer-btn"]',
      popover: {
        title: "2. Create Customer Profile",
        description: "Click 'Add Customer' to open the customer creation modal and record new buyer details.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="customers-search-bar"]',
      popover: {
        title: "3. Customer Search & Filtering",
        description: "Quickly search customer records by phone number or name, and filter by sales channel, date range, or active status.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="customers-table-container"]',
      popover: {
        title: "4. Customer Directory Table",
        description: "Track total lifetime sales spending per customer, total orders placed, assigned membership tier (e.g. VIP, Gold), and phone contact info.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-discounts"]',
      popover: {
        title: "5. Next: Discounts & Coupons Hub",
        description: "Click 'Discounts & Coupons' in the left sidebar to create storewide promotional sales and promo codes!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/discounts": [
    {
      element: '[data-tour="sidebar-link-discounts"]',
      popover: {
        title: "1. Connection: Customers → Discounts & Promo System",
        description: "Welcome to Discounts & Coupons! Every promotional rule created here automatically recalculates prices during checkout across all customer sales channels — Web Storefront, Telegram Bot, Messenger Bot, and POS Terminal.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-discounts"]'),
    },
    {
      element: '[data-tour="discounts-tab-discounts"]',
      popover: {
        title: "2. Discounts Tab: Automatic Promotional Rules",
        description: "This tab displays your store's automatic discounts (e.g. 20% OFF summer season, 90% Discount, Buy 2 free 1, Mid year 10%). Automatic rules trigger instantly at checkout without needing a promo code.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-discounts"]'),
    },
    {
      element: '[data-tour="discounts-search-bar"]',
      popover: {
        title: "3. Discounts Search & Multi-Filter Bar",
        description: "Search discount rules by name or description. Filter by All Status (Active/Inactive), All Channels (POS, WEB, Telegram, Messenger), and toggle visible table columns.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-discounts"]'),
    },
    {
      element: '[data-tour="discounts-table-container"]',
      popover: {
        title: "4. Discounts Rule Directory & Controls",
        description: "Audit rule details including discount type & value (20%, 90%, Buy 2 Get 1), target scope (All Items, Specific Items), rule conditions, active channels, status badges, and action buttons to edit or delete rules.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-discounts"]'),
    },
    {
      element: '[data-tour="create-discount-btn"]',
      popover: {
        title: "5. Create Discount Action",
        description: "Click '+ Create Discount' to configure brand new automatic percentage or fixed dollar discounts with custom date ranges, minimum order amounts, and channel limits.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-discounts"]'),
    },
    {
      element: '[data-tour="discounts-tab-coupons"]',
      popover: {
        title: "6. Coupons Tab: Customer Promo Codes",
        description: "Switch to the Coupons tab to manage voucher promo codes (e.g. SAVE990, WELCOME10) that customers or cashiers type at checkout to claim savings.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-coupons"]'),
    },
    {
      element: '[data-tour="discounts-search-bar"]',
      popover: {
        title: "7. Coupons Search & Filter Bar",
        description: "Search promo codes by voucher code string (e.g. SAVE990) and filter by coupon status (Active, Inactive, Expired, or Used Up).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-coupons"]'),
    },
    {
      element: '[data-tour="discounts-table-container"]',
      popover: {
        title: "8. Coupons Directory & Usage Audit",
        description: "Review active promo code vouchers, their linked discount rule (e.g. Mid year 10% OFF), usage count limits (e.g. 1 used / 100 max), minimum purchase thresholds, validity date ranges, and status badges.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-coupons"]'),
    },
    {
      element: '[data-tour="create-discount-btn"]',
      popover: {
        title: "9. Create Coupon Action",
        description: "When the Coupons tab is active, this button transforms into '+ Create Coupon'. Click it to generate new customer voucher codes linked to existing discount rules.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-coupons"]'),
    },
    {
      element: '[data-tour="discounts-tab-channels"]',
      popover: {
        title: "10. Channel Discounts Tab: Multi-Channel Sales Matrix",
        description: "Switch to Channel Discounts to inspect active promotional coverage across all 4 sales channels: Web Storefront, Telegram Bot, Messenger Bot, and POS Terminal.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-channels"]'),
    },
    {
      element: '[data-tour="discounts-search-bar"]',
      popover: {
        title: "11. Channel Rules Search Bar",
        description: "Search channel discount rules by channel name or promo rule title.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-channels"]'),
    },
    {
      element: '[data-tour="discounts-table-container"]',
      popover: {
        title: "12. Sales Channel Status & Active Promotions",
        description: "View which promotions are live on each specific sales channel (e.g. Web Storefront showing '1 Promotion Active: Buy 2 free 1', while POS Terminal or Bots run on Standard Price).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-channels"]'),
    },
    {
      element: '[data-tour="discounts-tab-items"]',
      popover: {
        title: "13. Discounted Items Tab: Live Catalog Price Audit",
        description: "Switch to Discounted Items to review product-level pricing changes and active discount rules across catalog items.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-items"]'),
    },
    {
      element: '[data-tour="discounts-search-bar"]',
      popover: {
        title: "14. Item Search, Category & Channel Filters",
        description: "Search products by item name, SKU, or barcode. Filter items by Category (e.g. Juice & Smoothies, Soft Drink, Seeds, Rice) and Sales Channel.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-items"]'),
    },
    {
      element: '[data-tour="discounts-table-container"]',
      popover: {
        title: "15. Discounted Products Directory",
        description: "Compare Original Prices against Discounted Prices (e.g. Coca-Cola Original discounted rates), active promotion badges, discount rates, and target sales channels.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="discounts-tab-items"]'),
    },
    {
      element: '[data-tour="sidebar-link-membership-types"]',
      popover: {
        title: "16. Next: Member Types & Customer Loyalty Tiers",
        description: "Click 'Member Types' in the left sidebar to connect these discount rules to customer membership tiers (VIP, Gold, Silver)!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/membership-types": [
    {
      element: '[data-tour="sidebar-link-membership-types"]',
      popover: {
        title: "1. Connection: Discounts → Membership Tier Perks",
        description: "Membership tiers you define here attach the discount rules from the previous Discounts & Coupons screen, then apply automatically once a customer's profile is tagged with a tier. Define tiers (e.g. VIP, Gold, Silver) to grant special privileges to loyal shoppers.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-member-type-btn"]',
      popover: {
        title: "2. Add Membership Tier",
        description: "Click Add Member Type to create a new membership tier and attach automatic discount rules to it.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="member-types-search-bar"]',
      popover: {
        title: "3. Search & Column Controls",
        description: "Filter membership tiers by name or notes, and customize visible table columns.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="member-types-table-container"]',
      popover: {
        title: "4. Membership Tiers Directory",
        description: "Review all defined customer tiers, assigned discount rules, notes, and active status.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-taxes"]',
      popover: {
        title: "5. Next: Store Tax Settings",
        description: "Click 'Tax Settings' in the left sidebar to configure store tax rates (VAT, GST) across sales channels!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/taxes": [
    {
      element: '[data-tour="sidebar-link-taxes"]',
      popover: {
        title: "1. Connection: Member Tiers → Store Tax Configuration",
        description: "Welcome to Tax Settings! The tax calculation rules configured here apply automatically across all customer sales channels — POS Terminal, Web Storefront, Telegram Bot, and Messenger Bot.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-status-toggle"]',
      popover: {
        title: "2. Tax Status Toggle",
        description: "Turn ON or OFF automatic tax calculations across all checkout registers and digital storefront channels with a single switch.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-name-input"]',
      popover: {
        title: "3. Official Tax Label & Title",
        description: "Specify your country or store tax label (e.g. VAT, GST, Sales Tax, Service Tax). This label prints on customer invoices and receipts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-rate-input"]',
      popover: {
        title: "4. Tax Rate Percentage (%)",
        description: "Enter the tax rate percentage (e.g. 10.00%). The system automatically calculates tax amounts on order subtotals during checkout.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-mode-selection"]',
      popover: {
        title: "5. Tax Pricing Mode Selection",
        description: "Choose how tax is calculated: 'Add Tax On Top' (Exclusive - adds tax above subtotal) or 'Included in Prices' (Inclusive - catalog prices already include tax).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-receipt-preview"]',
      popover: {
        title: "6. Live Customer Receipt Preview",
        description: "Preview how your tax label, percentage rate, and calculation mode render on actual printed 80mm customer receipts before saving.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="tax-save-btn"]',
      popover: {
        title: "7. Save Tax Configuration",
        description: "Click Save Tax Settings to store and broadcast updated tax rules to all POS terminals and online storefront checkouts.",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-sessions"]',
      popover: {
        title: "8. Next: Register Sessions & Audit Logs",
        description: "Click 'Register Sessions' in the left sidebar to audit cashier float cash, shift till balancing, and session logs!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/sessions": [
    {
      element: '[data-tour="sidebar-link-sessions"]',
      popover: {
        title: "1. Connection: POS Cash Drawer → Session Audit Log",
        description: "Every register opened at the POS terminal, plus every cash payment collected via Pay Later, is recorded here as a session. Audit cashier shifts, starting cash, and drawer balancing to catch variances early.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sessions-header-stats"]',
      popover: {
        title: "2. Cash Register Sessions Audit",
        description: "View total active till registers, open session count, starting drawer cash balances, and total cash collected.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sessions-search-bar"]',
      popover: {
        title: "3. Search & Filter Sessions",
        description: "Search register sessions by staff cashier name or filter by session status (Open/Closed) and date range.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sessions-table-container"]',
      popover: {
        title: "4. Till Register Audit Log",
        description: "Review opening cash, closing cash, expected cash vs physical drawer count, and cash variance audit logs.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-launch"]',
      popover: {
        title: "5. Next: Point of Sale Terminal",
        description: "Click 'Open Point of Sale' at the bottom of the sidebar anytime to open your POS cashier drawer!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/cash-register": [
    {
      element: '[data-tour="pos-open-register"]',
      popover: {
        title: "1. Open Cash Register Floating Drawer & Next: POS Terminal",
        description: "Enter your starting opening cash balance (e.g. $100.00) using the keypad to open a fresh POS register session. Click 'Next Page' to jump into the POS Terminal!",
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
 title: "1. Connection: Sales to Master Inventory Catalog",
 description: "Welcome to Inventory Management! Every product sold in POS or Sales Orders connects directly to this master catalog. Click Create Item to add new products with SKU, barcode, retail price, and stock levels.",
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
 element: '[data-tour="item-actions"]',
 popover: {
 title: "8. Product Actions",
 description: "Preview customer storefront view, edit product pricing and stock, or remove items.",
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
 description: "Click 'Batches' on any item to view each supplier delivery lot, what it cost, when it expires, and which one the next sale comes out of. Anything already past its date is flagged for write-off.",
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
 description: "Optional. Record the supplier's Lot / Batch #, Manufactured Date and Expiration Date. Stock with an expiry date is sold before stock without one, soonest first — so a short-dated delivery leaves ahead of older stock that keeps.",
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
 element: '[data-tour="stock-summary-panel"]',
 popover: {
 title: "6. Live Movement Summary",
 description: "Preview resulting stock levels before confirming. Warns automatically if deduction exceeds available stock. The batches this comes out of are chosen for you — soonest to expire first — and their cost is what the write-off is valued at.",
 side: "left",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="stock-submit-btn"]',
 popover: {
 title: "7. Confirm Stock Out",
 description: "Click to confirm and log this stock deduction into your audit ledger.",
 side: "left",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="sidebar-link-adjust-stock"]',
 popover: {
 title: "8. Next: Adjust Stock Audit",
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
 description: "Correct a lot number or expiry date read off the carton during physical stocktaking. Tick the field you want to change; anything unticked is left alone.",
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
 element: '[data-tour="units-info-banner"]',
 popover: {
 title: "2. Vocabulary vs Arithmetic Rule",
 description: "Units define measurement names & symbols (e.g. Sack, Box, Kg). Conversion ratios (e.g. how many grams per sack) are configured per item because a sack of rice and flour weigh differently.",
 side: "bottom",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="units-category-list"]',
 popover: {
 title: "3. Grouped Units Directory",
 description: "View active units categorized by measurement type (Count, Weight, Volume, Dimension). Built-in system units are protected against deletion.",
 side: "right",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="unit-form-name"]',
 popover: {
 title: "4. Unit Name Input",
 description: "Enter the full title of your custom measurement unit (e.g. Sack, Tray, Can, Roll, Carton).",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="unit-form-symbol"]',
 popover: {
 title: "5. Short Symbol",
 description: "Enter a short symbol (e.g. sck, try, cn, ctn) displayed next to quantities on POS receipts and stock tables.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="unit-form-base-toggle"]',
 popover: {
 title: "6. Measurement Category",
 description: "Select what the unit measures (Count, Weight, Volume, Dimension) to enforce accurate measurement types.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="unit-form-submit"]',
 popover: {
 title: "7. Save Unit Entry",
 description: "Click to save your custom measurement unit into the system.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="sidebar-link-categories"]',
 popover: {
 title: "8. Next: Categories & Groups",
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
 element: '[data-tour="category-structure-list"]',
 popover: {
 title: "2. Category Hierarchy Tree",
 description: "View configured categories and nested subcategories tree structure used on POS touchscreens and sales reports.",
 side: "right",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="category-form-mode"]',
 popover: {
 title: "3. Category vs Subcategory Toggle",
 description: "Switch mode to create a top-level Category (e.g. Beverages) or a nested Subcategory (e.g. Matcha under Beverages).",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="category-form-name"]',
 popover: {
 title: "4. Category Title Input",
 description: "Enter category title displayed on POS touchscreen grid buttons and sales summary reports.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="category-form-note"]',
 popover: {
 title: "5. Description Note",
 description: "Add optional descriptive notes explaining what items belong in this category.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="category-form-submit"]',
 popover: {
 title: "6. Save Category Structure",
 description: "Click to save and publish your category structure.",
 side: "top",
 align: "start",
 popoverClass: "fluxibiz-tour-popover",
 },
 },
 {
 element: '[data-tour="sidebar-link-add-ons"]',
 popover: {
 title: "7. Next: Product Add-ons",
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
        title: "1. Add-ons Module Link",
        description: "You are on the Add-ons management screen under Item config. Define extra toppings, modifications, and side choices once to share them across multiple menu items.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="config-tab-add-ons"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="new-addon-btn"]',
      popover: {
        title: "2. Create New Single Add-on",
        description: "Click 'New add-on' to open the add-on creation modal form.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
        onNextClick: openModalOnNext('[data-tour="new-addon-btn"]', '[data-tour="addon-form-name"]'),
      },
    },
    {
      element: '[data-tour="addon-form-name"]',
      popover: {
        title: "3. Add-on Title / Name",
        description: "Enter the name of the extra item or topping (e.g. Pearls, Extra Cheese, Espresso Shot, Oat Milk).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-form-unit"]',
      popover: {
        title: "4. Base Unit of Measure",
        description: "Select the base unit in which stock for this add-on is counted (e.g. Bag, Gram, Milliliter, Piece).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-form-conversions"]',
      popover: {
        title: "5. Packaging & UOM Conversions",
        description: "Optional: Define supplier delivery packaging conversion rates (e.g. 1 Bag holds 3000g).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-form-usage"]',
      popover: {
        title: "6. One Order Usage Rate",
        description: "Specify how much quantity is deducted when a customer selects this add-on (e.g. 1 scoop, 30g, or 50ml).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-form-pricing"]',
      popover: {
        title: "7. Channel Pricing Note",
        description: "Add-on selling prices are configured per sales channel in Sale Management pricing matrix.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-form-submit"]',
      popover: {
        title: "8. Save Add-on Item",
        description: "Click 'Create add-on' to save this extra item into your master add-on library.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-addon-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="addon-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addons-list-section"]',
      popover: {
        title: "9. Add-on Library & Usage Tracking",
        description: "This section lists all individual add-on items, their base unit, per-order consumption rate, and how many store products currently offer them.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const closeBtn = (document.querySelector('[data-slot="dialog-close"]') || document.querySelector('button[aria-label="Close"]')) as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      },
    },
    {
      element: '[data-tour="new-set-btn"]',
      popover: {
        title: "10. Create Add-on Group Set",
        description: "Click 'New set' to group related add-ons together (e.g. 'Toppings' or 'Syrup Selection') into an ordered choice menu for customers.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
        onNextClick: openModalOnNext('[data-tour="new-set-btn"]', '[data-tour="set-form-name"]'),
      },
    },
    {
      element: '[data-tour="set-form-name"]',
      popover: {
        title: "11. Set Group Name",
        description: "Enter a group title for these add-ons (e.g., 'Toppings', 'Sauces', or 'Choice of Sides').",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-set-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="set-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="set-form-rule"]',
      popover: {
        title: "12. Selection Rule ('How many')",
        description: "Choose whether customers can select 'Any number' of add-ons or limit choices (e.g. 'Up to 3').",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-set-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="set-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="set-form-required"]',
      popover: {
        title: "13. Required vs Optional Switch",
        description: "Toggle on if customers MUST pick at least one add-on before adding the item to cart, or leave off for optional toppings.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-set-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="set-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="set-form-addons"]',
      popover: {
        title: "14. Select Included Add-on Items",
        description: "Check off which existing add-ons from your shared library belong to this set (e.g. Croissant, Extra Shrimp, Fried Egg).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-set-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="set-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="set-form-submit"]',
      popover: {
        title: "15. Save Add-on Set",
        description: "Click 'Create set' to save this set group into your store catalog.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="new-set-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="set-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="addon-sets-section"]',
      popover: {
        title: "16. Add-on Sets Directory & Selection Rules",
        description: "Review all defined add-on sets, their selection rules ('Up to N choices' or 'Any number', Required vs Optional), and included add-on items.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const closeBtn = (document.querySelector('[data-slot="dialog-close"]') || document.querySelector('button[aria-label="Close"]')) as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      },
    },
    {
      element: '[data-tour="sidebar-link-option-presets"]',
      popover: {
        title: "17. Next: Option Presets",
        description: "Click 'Option presets' in the left sidebar to set up reusable item choices like Size, Color, or Sugar Level!",
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
        description: "You are on the Option Presets screen under Item config. Predefine reusable choice lists (e.g. Small / Medium / Large, Ice Level 0% / 50% / 100%) so choices don't need to be retyped on every item.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="config-tab-presets"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="preset-info-banner"]',
      popover: {
        title: "2. Template Master Copy Rule",
        description: "Important: Applying a preset copies choice values onto a product as a starting point. Modifying a preset later will NEVER rewrite products already using it, keeping your catalog safe from accidental bulk changes.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="config-tab-presets"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="add-preset-btn"]',
      popover: {
        title: "3. Create New Option Preset",
        description: "Click 'Add preset' to open the preset builder modal form.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
        onNextClick: openModalOnNext('[data-tour="add-preset-btn"]', '[data-tour="preset-form-name"]'),
      },
    },
    {
      element: '[data-tour="preset-form-name"]',
      popover: {
        title: "4. Preset Name Input",
        description: "Enter what the choice list is called (e.g. Size, Color, Temperature, Sugar Level).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="add-preset-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="preset-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="preset-form-type"]',
      popover: {
        title: "5. Display Mode (Shown as)",
        description: "Select how choices display to customers & cashiers: 'Pick from a list' (text buttons) or 'Colour swatches' (visual color circles).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="add-preset-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="preset-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="preset-form-choices"]',
      popover: {
        title: "6. Custom Choice List & Photos",
        description: "Add at least 2 choices (e.g. Small, Medium, Large). Click '+ Add choice' to add rows, attach optional photo thumbnails, or pick color swatches.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="add-preset-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="preset-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="preset-form-required"]',
      popover: {
        title: "7. Required Selection Rule",
        description: "Toggle Required ON if a customer or cashier MUST select one of these choices before adding the product to cart.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="add-preset-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="preset-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="preset-form-submit"]',
      popover: {
        title: "8. Save Option Preset",
        description: "Click '+ Add preset' to save this choice template into your master preset library.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const btn = document.querySelector('[data-tour="add-preset-btn"]') as HTMLButtonElement;
        if (btn && !document.querySelector('[data-tour="preset-form-name"]')) btn.click();
      },
    },
    {
      element: '[data-tour="presets-list-container"]',
      popover: {
        title: "9. Master Presets Directory",
        description: "View all configured option presets, display mode tags, required badges, and choice preview chips showing assigned values.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const closeBtn = (document.querySelector('[data-slot="dialog-close"]') || document.querySelector('button[aria-label="Close"]')) as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      },
    },
  ],

  "/inventory/import": [
    {
      element: '[data-tour="sidebar-link-new-import"]',
      popover: {
        title: "1. Import Data → New Import",
        description: "This page lives under 'Import data' in the sidebar. Use it to bring your items, categories, or opening stock in from a spreadsheet in one pass instead of typing them in by hand. Nothing changes in your catalog until the very last stage.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-stepper"]',
      popover: {
        title: "2. Six Stages — Nothing Saved Early",
        description: "Choose → Upload → Match columns → Check data → Review → Import. A finished stage turns green and stays clickable, so you can jump back to fix something — but you cannot skip ahead. Only the final 'Import' stage actually writes anything into FluxiBiz.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-choose-type"]',
      popover: {
        title: "3. What Are You Importing?",
        description: "Pick Items, Categories, or Opening stock. — [Required] — This decides which spreadsheet columns the next steps expect, and it cannot be changed once a file is uploaded, so get it right before continuing.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-panel"]',
      popover: {
        title: "4. Upload: CSV or Excel",
        description: "Drag your file here or use 'Choose file'. Accepts .csv and .xlsx, up to 10 MB, and the first row must be your column headings. Not sure of the layout? Download one of the sample templates shown here — a file built from it arrives already matched in the next step.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-panel"]',
      popover: {
        title: "5. Match Your Columns",
        description: "Line up each column from your file with a FluxiBiz field. Columns matched automatically are marked with a sparkle icon. Anything required and still unmatched blocks 'Check my data' until fixed. This is also where you choose what happens to rows that already exist (Skip it, or Update it with the file) and set a fallback unit for rows that don't name one.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-panel"]',
      popover: {
        title: "6. Check, Review, Import",
        description: "'Check my data' sorts every row into Ready to import, Already exist, or Have errors — click a count to filter the table. Nothing is written yet. Continue to Review and FluxiBiz spells out exactly what will be created, updated, or skipped; tick the confirmation box and press 'Import now' only once you're sure — this last step cannot be undone.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-history-link"]',
      popover: {
        title: "7. Past Imports",
        description: "Click 'History' anytime — mid-wizard or after — to see every file you have brought in: its status, how many rows made it in versus failed, who ran it, and when. Open any one for its full row-by-row report.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/import/history": [
    {
      element: '[data-tour="sidebar-link-history"]',
      popover: {
        title: "1. Import Data → History",
        description: "You are on 'Import data → History' in the sidebar. Every file ever brought into FluxiBiz is listed here, newest first — whether it fully succeeded, partly failed, or was later undone.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-history-list"]',
      popover: {
        title: "2. Reading a Row",
        description: "File name and the data type it carried (Items, Categories, Opening stock); a status pill (Committed, Failed, Reverted…); the 'Rows' column showing how many made it in versus how many did not; who ran it; and when it was uploaded. Click a file name to open its full row-by-row report.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="import-new-link"]',
      popover: {
        title: "3. Start Another Import",
        description: "Click 'New import' (top-right here, or 'Import data → New import' in the sidebar) to run the six-stage wizard again for another spreadsheet.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/new": [
    {
      element: '[data-tour="item-form-name"]',
      popover: {
        title: "1. Item Name",
        description: "The name shown on the POS and on receipts. — [Required] — e.g. Coca Cola 330ml",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-sku"]',
      popover: {
        title: "2. SKU / Code",
        description: "Your own reference code for this item, typed or auto-generated. — [Optional] — e.g. COC-330",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-barcode"]',
      popover: {
        title: "3. Barcode",
        description: "Scanned at the POS to ring the item up. Use the dice button to generate a unique one. — [Optional] — e.g. 8850123456789",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-category"]',
      popover: {
        title: "4. Category",
        description: "Groups the item for the POS menu and reports. Create categories under Item config first. — [Required] — e.g. Beverages / Drinks",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-status"]',
      popover: {
        title: "5. Status",
        description: "Whether this item can be sold right now. Inactive keeps the record but hides it from the POS. — [Required] — e.g. Active",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-options"]',
      popover: {
        title: "6. Options & Colours",
        description: "Variations of this item, such as sizes and colours. Add option opens a dialog where each one gets its own SKU, barcode and photo, and is counted separately. — [Optional] — e.g. Small, Medium, Large",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-unit"]',
      popover: {
        title: "7. Base Unit of Measure",
        description: "The smallest quantity you sell. Conversions let you buy in larger units without a second stock figure. — [Required] — e.g. Can, Bottle, Pcs",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-low-stock"]',
      popover: {
        title: "8. Low Stock Alert",
        description: "You are warned once stock falls below this figure. Leave it at 0 to be told only when the item runs out. — [Optional] — e.g. 5",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-images"]',
      popover: {
        title: "9. Item Images",
        description: "The first image is the thumbnail and the rest fill the store gallery. Up to 10, 10 MB each, uploaded when you save. — [Optional]",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-attributes"]',
      popover: {
        title: "10. Attributes",
        description: "Facts about the item shown on the store page — a highlight, a perk, a specification. What a shopper picks between is an Option, not an attribute. — [Optional]",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-addons"]',
      popover: {
        title: "11. Add-ons",
        description: "Extras a customer can choose alongside this item. Each is defined once under Item config and attached here. — [Optional]",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-store-page"]',
      popover: {
        title: "12. Store Page",
        description: "Lays out the lower half of the store page: paragraphs, headings, bullets, images, a spec grid, or two columns. Each block opens its own form. — [Optional]",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-save"]',
      popover: {
        title: "13. Save",
        description: "Saves the item. Order of work: create the Unit and Category first, fill in the details, then Save. Prices are set per sales channel in Sale Management, not here.",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],


  "/prediction": [
    {
      element: '[data-tour="prediction-controls"]',
      popover: {
        title: "1. Sales-Based Forecasting",
        description: "This page turns your recent sales history into forward-looking numbers — nothing here is typed in manually. Everything below recalculates the moment you change the product filter or the period.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-search"]',
      popover: {
        title: "2. Filter by Product",
        description: "Type a product name to narrow every table below to just that item — useful when you only want to check on one product instead of scrolling the full list.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-period-toggle"]',
      popover: {
        title: "3. This Week vs This Month",
        description: "Switch the window the forecast is calculated over. A shorter window reacts faster to a recent spike; a longer one smooths out day-to-day noise — pick whichever matches how often you actually reorder.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-summary"]',
      popover: {
        title: "4. Headline Numbers",
        description: "Four totals at a glance: how many products are trending up, how many risk running out, how many are going slow-moving, and a revenue range forecast for the period. The tables below spell out exactly which products sit behind each count.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-group-rising"]',
      popover: {
        title: "5. Predicted to Sell More",
        description: "Products showing increased demand versus the previous period. Click the row to expand it and see expected demand in units alongside the trend for each product.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-group-stockout"]',
      popover: {
        title: "6. Stock Alert — May Run Out",
        description: "Products whose current stock won't cover expected demand at the recent rate of sale. Expand it to see current stock and an estimated number of days until each one runs out, so you know what to reorder first.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="prediction-group-restock"]',
      popover: {
        title: "7. Restock Recommendation",
        description: "The recommended reorder quantity for each product — already worked out for you from the forecast, nothing to calculate yourself. Click 'Restock' on any row to jump straight into Stock In with that item preselected.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/settings": [
    {
      element: '[data-tour="settings-profile-form"]',
      popover: {
        title: "1. Settings Overview",
        description: "Welcome to your User Settings! Manage your profile photo, account information, device notification preferences, and personal details in one place.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="settings-avatar-section"]',
      popover: {
        title: "2. Profile Picture & Avatar",
        description: "Upload a personalized profile photo or remove your existing picture. Your avatar identifies you across transaction receipts, stock movement logs, and audit trails.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="settings-account-info"]',
      popover: {
        title: "3. Account Credentials & Security Role",
        description: "Review your system-assigned Username, registered Email address, and Access Role. Account roles and security levels are managed by your store administrator.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="settings-notifications-card"]',
      popover: {
        title: "4. Device Push Notifications",
        description: "Enable or disable web push alerts on this device to receive instant notifications for completed sales, low-stock warnings, and incoming orders.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="settings-personal-form"]',
      popover: {
        title: "5. Personal Details Form",
        description: "Update your First Name, Last Name, Phone Number, Gender preference, and Physical Address to keep your business contact records accurate.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="settings-form-actions"]',
      popover: {
        title: "6. Save or Revert Changes",
        description: "Click 'Save changes' to commit your profile updates live to the database, or 'Cancel' to reset form fields back to their original state.",
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
        title: "1. Connection: Discount Rules → POS Terminal",
        description: "Welcome to Point of Sale! Open your cash register float (e.g. $50.00) to start your daily cashier shift. All catalog prices, tier discounts, and promo codes sync live to this terminal.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-tab-point-of-sale"]',
      popover: {
        title: "2. Point of Sale Tab: Main Checkout Workspace",
        description: "Main cashier workspace. Touch item cards, scan physical barcodes, attach customer profiles, and process rapid checkout.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-search-grid"]',
      popover: {
        title: "3. Product Search & Barcode Scanner",
        description: "Tap product cards directly or scan physical barcodes using a USB/Bluetooth scanner to add items to cart instantly.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-category-select"]',
      popover: {
        title: "4. Quick Category Filter Bar",
        description: "Filter touchscreen catalog items by category (e.g. Beverages, Bakery, Merch) for quick cashier access during peak sales.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-cart-qty"]',
      popover: {
        title: "5. Live Cart Line Items & Quantity Controls",
        description: "Increase, decrease, or remove cart items. Tap any item row to check base pricing and unit breakdown.",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-tab-customer"]',
      popover: {
        title: "6. Customer Loyalty & Tier Link",
        description: "Click Customer to attach a registered shopper — earning loyalty points, applying membership tier discounts, and logging order history.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-tab-custom-discount"]',
      popover: {
        title: "7. Manual In-Cart Custom Discount",
        description: "Click Custom Discount to apply an instant percentage or fixed dollar price reduction directly to the current order cart.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-tab-coupon"]',
      popover: {
        title: "8. Coupon Promo Code Redemption",
        description: "Click Coupon to type or scan customer voucher codes (e.g. SAVE990, WELCOME10) to claim promotional savings at checkout.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-checkout"]',
      popover: {
        title: "9. Express Checkout & Settlement Methods",
        description: "Click Pay to settle order total using Cash (USD/KHR), Bakong KHQR digital payment, or Credit Card.",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
    {
      element: '[data-tour="pos-tab-order"]',
      popover: {
        title: "10. Order Tab: Held & Draft Carts",
        description: "Switch to the Order tab to view all held orders, pending table tabs, and saved customer draft carts.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-order"]'),
    },
    {
      element: '[data-tour="orders-open-count"]',
      popover: {
        title: "11. Open Orders Counter & Cart Actions",
        description: "Audit active held orders waiting for payment. Tap the edit icon to resume checkout or trash icon to void cart.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-order"]'),
    },
    {
      element: '[data-tour="pos-tab-receipts"]',
      popover: {
        title: "12. Receipts Tab: Sales & Revenue History",
        description: "Switch to the Receipts tab to view completed shift sales, cash/KHQR revenue totals, and print 80mm receipts.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-receipts"]'),
    },
    {
      element: '[data-tour="receipts-kpi-summary"]',
      popover: {
        title: "13. Till Revenue & Payment Breakdown Summary",
        description: "Real-time counters showing total shift revenue, cash collected, and digital KHQR payment breakdowns.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-receipts"]'),
    },
    {
      element: '[data-tour="receipts-filter-bar"]',
      popover: {
        title: "14. Receipts Date & Staff Filter Bar",
        description: "Filter past transaction history by date range (Today, Yesterday, This Month) or by cashier staff member.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-receipts"]'),
    },
    {
      element: '[data-tour="pos-open-register"]',
      popover: {
        title: "15. Close Shift & Cash Drawer Reconciliation",
        description: "End your shift by counting cash drawer total, auditing counted vs expected cash, and submitting register shift reports.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: clickScopeAndRefresh('[data-tour="pos-tab-point-of-sale"]'),
    },
  ],

  "/employees": [
    {
      element: '[data-tour="employees-tabs"]',
      popover: {
        title: "1. Staff & User Security Management",
        description: "Welcome to User Management! This header bar lets you navigate between 3 core sections: Users (staff accounts), Roles & permissions (access control), and Activity (audit logs).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-users"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="add-user"]',
      popover: {
        title: "2. Create New Staff Account",
        description: "Click 'Add user' to register a new employee account. Configure their full name, email address, phone number, login credentials, and assign their starting security role.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-users"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="staff-filters"]',
      popover: {
        title: "3. Search & Filter Staff Directory",
        description: "Quickly locate team members by searching full names, emails, or usernames. Use dropdown filters to isolate staff by assigned security role or account status (Active vs Disabled).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-users"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="user-list"]',
      popover: {
        title: "4. Staff Directory & Account Actions",
        description: "This table displays all registered staff accounts. Click the action buttons on any row to edit user profiles, change assigned roles, toggle access active state, or reset passwords.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-users"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="tab-roles"]',
      popover: {
        title: "5. Transition to Security Roles & Permissions",
        description: "Next, let's explore Security Roles! Clicking 'Roles & permissions' switches to the security template configuration view.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-roles"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="add-role"]',
      popover: {
        title: "6. Create Custom Security Role",
        description: "Click 'Create role' to define a new job role (e.g. Cashier, Store Manager, Shift Supervisor, Inventory Clerk). Set custom role names and granular module permissions.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-roles"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="roles-search"]',
      popover: {
        title: "7. Search Security Roles",
        description: "Search configured security roles by role title or permission keywords to quickly locate and inspect role definitions.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-roles"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="roles-list"]',
      popover: {
        title: "8. Roles Directory & Granular Permission Matrix",
        description: "View all defined security roles, total active users assigned to each role, and total granted permissions. Click edit to customize specific action rights (e.g., POS sales, inventory edits, discount overrides).",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-roles"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="tab-audits"]',
      popover: {
        title: "9. Transition to Activity Audit Trail",
        description: "Finally, let's look at Security Audit Activity! Clicking 'Activity' switches to real-time administrative event tracking across your business.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-audits"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="audit-filters"]',
      popover: {
        title: "10. Filter Activity & Audit Trails",
        description: "Filter recorded activity logs by search keywords, action categories (Login, Role Edit, Price Change, Stock Adjustment), or custom date ranges.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-audits"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="audit-logs"]',
      popover: {
        title: "11. Detailed Security Audit Log",
        description: "Complete immutable audit trail showing exact timestamps, acting staff member, IP address, action performed, and detailed before-and-after data changes.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="tab-audits"]') as HTMLButtonElement)?.click();
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
 title: "4. Store Description",
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
        title: "1. Overview Dashboard Module Link",
        description: "You are on the Overview Dashboard screen. Monitor live business performance, real-time catalog figures, channel revenue, and multi-format report exports.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-reports-export"]',
      popover: {
        title: "2. Executive Multi-Format Report Export",
        description: "Export full store reports in 3 formats: High-resolution visual PDF, formatted Excel (.xls) with embedded data tables, or Word document (.docx) executive summaries.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-stats"]',
      popover: {
        title: "3. Key Financial & Catalog KPI Counters",
        description: "Real-time stat cards monitoring Total Revenue collected across sales, Total Items in catalog, and Total Product Categories.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-channel-cards"]',
      popover: {
        title: "4. Sales Channel Donut Chart",
        description: "Percentage and revenue distribution donut chart comparing physical POS, Web Store, Telegram, and Messenger storefronts.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-cumulative-profit"]',
      popover: {
        title: "5. Cumulative Profit & Revenue Trend Chart",
        description: "Interactive trend chart graphing cumulative profit growth over time. Use the top dropdown to toggle Day, Week, or Month groupings.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-item-vector"]',
      popover: {
        title: "6. Top Item Type Demand Bar Chart",
        description: "Vertical bar chart visualizing sales volume and revenue across item categories and product types.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-stock-on-hand"]',
      popover: {
        title: "7. Stock Inventory & Balance Leaderboard",
        description: "Horizontal distribution bars displaying stock levels and inventory counts per item. Hover over any bar to inspect total revenue vs quantity on hand.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-recent-orders"]',
      popover: {
        title: "8. Live Recent Orders Stream & Search",
        description: "Real-time transaction log displaying Order Reference, Customer Avatar & Name, Product, Amount, and Order Status. Filter by keyword or click Export to download CSV.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="dashboard-best-selling"]',
      popover: {
        title: "9. Best Selling Products Ranking",
        description: "Leaderboard ranking your top products by revenue generated and total units sold. Includes instant search filter and CSV export.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="sidebar-link-profit"]',
      popover: {
        title: "10. Next: Profit & Prediction Analytics",
        description: "Click 'Next' (or 'Profit' in sidebar) to continue the tour onto the Profit Statement and Demand Prediction screens!",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/analytics": [
    {
      element: '[data-tour="profit-view-tabs"]',
      popover: {
        title: "1. Profit Analytics Overview",
        description: "Welcome to Profit Analytics! This top tab bar lets you navigate between 3 core analytical views: Statement (P&L table by period), By channel (POS, Storefront, Messenger, Telegram), and Sale profit calculator (predictive margin modeling).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-periods"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-range-select"]',
      popover: {
        title: "2. Date Period & Granularity Filter",
        description: "Filter P&L figures by date range (Today, Last 30 Days, Month, Year, All Time) and view breakdowns daily, weekly, or monthly. All calculations update dynamically from real sales history.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-periods"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-statement-table"]',
      popover: {
        title: "3. Detailed P&L Statement Table",
        description: "Full financial breakdown per period: Sales count, Items sold, Gross sales, Discounts, Tax collected, Net Revenue, Cost of Goods (FIFO purchase batch cost), Gross Profit, and Net Margin %.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-periods"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-item-breakdown"]',
      popover: {
        title: "4. Item Profit Breakdown",
        description: "Inspect revenue, unit stock cost, profit, and margin generated per individual menu product.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-periods"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-tab-channels"]',
      popover: {
        title: "5. Transition to Channel Profit Breakdown",
        description: "Next, let's explore Channel Analytics! Clicking 'By channel' displays revenue, COGS stock cost, net profit, and margin performance split out across all sales channels.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-channels"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-kpi-grid"]',
      popover: {
        title: "6. Channel Profitability KPI Cards",
        description: "Summary stat cards displaying Total Revenue, Cost of Goods, Net Profit, and Profit Margin % across your active sales channels.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-channels"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-channel-breakdown"]',
      popover: {
        title: "7. Where It Came From (Sales Channel Table)",
        description: "Revenue, Cost, Profit, and Margin figures split out per channel — Point of Sale, Online Store, Messenger, and Telegram storefronts.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-channels"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="profit-tab-calculator"]',
      popover: {
        title: "8. Transition to Sale Profit Calculator",
        description: "Finally, let's explore the Profit Calculator! Clicking 'Sale profit calculator' opens predictive price and margin forecasting tools.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        (document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement)?.click();
      },
    },
    {
      element: '[data-tour="calculator-mode-per-item"]',
      popover: {
        title: "9. Method 1: Margin Per Item Modeling",
        description: "First, let's explore Method 1! 'Margin per item' allows you to experiment with individual product margin percentages and predict optimal selling prices.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-per-item"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-kpi-grid"]',
      popover: {
        title: "10. Per-Item Predictive KPI Projections",
        description: "Real-time summary cards displaying Total Revenue, Cost of Goods, Gross Profit, and Gross Margin % calculated from your custom item margins.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-per-item"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-item-table"]',
      popover: {
        title: "11. Item Pricing & Custom Margin Matrix",
        description: "Search items, adjust individual product margin percentages, bulk-apply profit margins to all items, and view predicted selling prices & gross profits. Includes CSV export.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-per-item"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-mode-business-target"]',
      popover: {
        title: "12. Method 2: Transition to Business Target Scaling",
        description: "Next, let's explore Method 2! 'Business target' automatically recalculates target selling prices across your entire inventory to hit a target gross margin percentage.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-business-target"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-target-input"]',
      popover: {
        title: "13. Target Gross Margin Controller",
        description: "Enter your business target gross margin percentage (e.g. 50%). The system automatically scales target prices for every catalog item to achieve this goal.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-business-target"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-kpi-grid"]',
      popover: {
        title: "14. Target Revenue & Profit Projections",
        description: "Updated KPI cards showing Target Revenue, Cost of Goods, Target Gross Profit, and Target Gross Margin % at your desired business scale.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-business-target"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-item-table"]',
      popover: {
        title: "15. Business Target Pricing Predictions Table",
        description: "View current price vs target price recommendations and target margins for every inventory item to hit your target profit. Includes CSV export.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
        const modeBtn = document.querySelector('[data-tour="calculator-mode-business-target"]') as HTMLButtonElement;
        if (modeBtn) modeBtn.click();
      },
    },
    {
      element: '[data-tour="calculator-operating-expenses"]',
      popover: {
        title: "16. Operating Expenses & Estimated Net Profit",
        description: "Deduct monthly overhead (rent, payroll, utilities) from gross profit to calculate your real estimated Net Profit and Net Margin percentage.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
      onHighlightStarted: () => {
        const tabBtn = document.querySelector('[data-tour="profit-tab-calculator"]') as HTMLButtonElement;
        if (tabBtn) tabBtn.click();
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
};
