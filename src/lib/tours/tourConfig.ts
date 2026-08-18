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
        title: "Welcome to FluxiBiz OS! 🚀",
        description: "This is your central Business Control Center.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-business"]',
      popover: {
        title: "Business Management 🏬",
        description: "Configure store profile, currencies, payments, and Telegram bot.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-items"]',
      popover: {
        title: "Inventory & Catalog 📦",
        description: "Manage products, barcodes, stock movements, and item configs.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-sales"]',
      popover: {
        title: "Sales & CRM 🛒",
        description: "Track receipts, channel pricing, loyalty tiers, and discounts.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-dashboard"]',
      popover: {
        title: "Overview Analytics 📊",
        description: "Monitor live store metrics, revenue, and profit margins.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="app-tile-employees"]',
      popover: {
        title: "User & Role Security 👥",
        description: "Manage staff credentials, permissions, and security audit logs.",
        side: "bottom",
        align: "center",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory": [
    {
      element: '[data-tour="item-list"]',
      popover: {
        title: "📦 Items Catalog (What it is)",
        description: "Your master list of all products, retail selling prices, barcodes, SKUs, and stock on hand.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-item"]',
      popover: {
        title: "➕ Create Item (What to input)",
        description: "Click to add a product. Inputs required: Item Name, SKU, Barcode, Retail Price, Cost Price, Category, and Base Selling Unit.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock": [
    {
      element: '[data-tour="inventory-stock-overview"]',
      popover: {
        title: "📊 Stock Overview (What it is & Why needed)",
        description: "Live inventory balance dashboard. Monitors stock levels across locations to prevent stockouts and low inventory.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/movements": [
    {
      element: '[data-tour="stock-movements-ledger"]',
      popover: {
        title: "📜 Stock Movements Ledger (What it is)",
        description: "Historical transaction log tracking every single item increment and decrement (Stock In, Sales, Write-offs, Adjustments).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/in": [
    {
      element: '[data-tour="stock-in-form"]',
      popover: {
        title: "📥 Stock In (What it is & What to input)",
        description: "Receiving inventory from suppliers. Required inputs: Supplier Name, Product Item, Batch Number, Expiry Date, Quantity Received, and Purchase Unit Cost.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/out": [
    {
      element: '[data-tour="stock-out-form"]',
      popover: {
        title: "📤 Stock Out Write-Off (What it is & What to input)",
        description: "Removing unusable or expired inventory. Required inputs: Product Item, Quantity Removed, Reason (Damaged, Expired, Store Sample), and Notes.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/stock/adjust": [
    {
      element: '[data-tour="stock-adjust-form"]',
      popover: {
        title: "⚖️ Adjust Stock Reconciliation (What it is & What to input)",
        description: "Physical stocktake adjustment. Required inputs: Product Item, Physical Shelf Count, Count Date, and Discrepancy Reconciliation Reason.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/units": [
    {
      element: '[data-tour="unit-form-name"]',
      popover: {
        title: "1. ឈ្មោះខ្នាតពេញ (Unit Name) 📏",
        description: "ឈ្មោះខ្នាតទំនិញពេញលេញ — [ចាំបាច់] — ឧទាហរណ៍៖ Kilogram, Piece, Box",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-symbol"]',
      popover: {
        title: "2. អក្សរកាត់ខ្នាត (Unit Symbol) 🔤",
        description: "អក្សរកាត់ខ្នាតសម្រាប់បង្ហាញលើវិក្កយបត្រ — [ចាំបាច់] — ឧទាហរណ៍៖ kg, pcs, box",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="unit-form-base-toggle"]',
      popover: {
        title: "3. ប្រភេទខ្នាតគោល (Base Unit / Category) ⚖️",
        description: "បែងចែកប្រភេទខ្នាតរាប់ ឬខ្នាតទម្ងន់ — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ Count (ចំនួនរាប់), Weight (ទម្ងន់)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/groups": [
    {
      element: '[data-tour="add-category"]',
      popover: {
        title: "📁 Categories & Item Groups (What it is & What to input)",
        description: "Organizes products into catalog groups for reports and POS grids. Required inputs: Category Title, Parent Group, and Color Tag.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/add-ons": [
    {
      element: '[data-tour="add-addon"]',
      popover: {
        title: "🍧 Add-ons & Modifiers (What it is & What to input)",
        description: "Configures extra options and toppings. Required inputs: Add-on Group Title, Extra Price ($), and Min/Max Selection Limits.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/config/presets": [
    {
      element: '[data-tour="add-preset"]',
      popover: {
        title: "🎨 Option Presets & Attributes (What it is & What to input)",
        description: "Predefines variant options for products (e.g. Size, Color). Required inputs: Attribute Name (Size) and Option Values (Small, Medium, Large).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/inventory/new": [
    {
      element: '[data-tour="item-form-name"]',
      popover: {
        title: "1. ឈ្មោះទំនិញ (Item Name) 🏷️",
        description: "ឈ្មោះទំនិញសម្រាប់បង្ហាញលើ POS និងវិក្កយបត្រ — [ចាំបាច់] — ឧទាហរណ៍៖ Coca Cola 330ml",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-sku"]',
      popover: {
        title: "2. កូដទំនិញ (SKU/Code) 🔢",
        description: "លេខសម្គាល់ទំនិញស្វ័យប្រវត្តិ ឬវាយបញ្ចូលដោយដៃ — [ចាំបាច់] — ឧទាហរណ៍៖ COC-330",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-barcode"]',
      popover: {
        title: "3. លេខបារកូដ (Barcode) 📊",
        description: "លេខកូដបារកូដសម្រាប់ស្កេនលក់នៅ POS — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 8850123456789",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-category"]',
      popover: {
        title: "4. ប្រភេទទំនិញ (Category) 📂",
        description: "ក្រុមទំនិញសម្រាប់តម្រៀបក្នុង POS និងរបាយការណ៍ — [ចាំបាច់] — ឧទាហរណ៍៖ Beverages / Drinks",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-unit"]',
      popover: {
        title: "5. ខ្នាតរង្វាស់ (Unit) 📏",
        description: "ខ្នាតលក់ដើមដូចជាកំប៉ុង ឬដប (ត្រូវបង្កើត Unit មុនបើមិនទាន់មាន) — [ចាំបាច់] — ឧទាហរណ៍៖ Can, Bottle, Pcs",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-low-stock"]',
      popover: {
        title: "9. កម្រិតជូនដំណឹងស្តុកជិតអស់ (Low Stock Alert) ⚠️",
        description: "ចំនួនស្តុកអប្បបរមាដែលត្រូវប្រព័ន្ធរ៉កជូនដំណឹង — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 5 Cans",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-status"]',
      popover: {
        title: "12. ស្ថានភាពទំនិញ (Status) 🟢",
        description: "បើក ឬបិទការលក់ទំនិញនេះក្នុងប្រព័ន្ធ — [ចាំបាច់] — ឧទាហរណ៍៖ Active (បើកលក់)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="item-form-save"]',
      popover: {
        title: "13. ប៊ូតុងរក្សាទុក (Save Button) 💾",
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
        title: "1. បើកវេនលក់ (Open Register/Shift) 🚀",
        description: "បញ្ចូលចំនួនសាច់ប្រាក់ដើមវេនក្នុងថតលុយ — [ចាំបាច់] — ឧទាហរណ៍៖ $50.00 (Opening Float)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-search-grid"]',
      popover: {
        title: "2. ផ្ទាំងទំនិញ និងស្កេនបារកូដ (Item Grid / Scanner) 🔍",
        description: "ចុចលើរូបទំនិញ ឬស្កេនបារកូដដើម្បីបញ្ចូលទៅកន្ត្រក — [ចាំបាច់] — ឧទាហរណ៍៖ ស្កេន 8850123456789",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-cart-qty"]',
      popover: {
        title: "3. កែប្រែចំនួនទំនិញ (Quantity Adjuster) ➕➖",
        description: "ចុចប៊ូតុង + ឬ - ដើម្បីកើន/បន្ថយចំនួនទំនិញក្នុងកន្ត្រក — [ចាំបាច់] — ឧទាហរណ៍៖ ២ កំប៉ុង",
        side: "left",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-select-customer"]',
      popover: {
        title: "5. ជ្រើសរើសអតិថិជន (Select Customer) 👤",
        description: "ភ្ជាប់ព័ត៌មានអតិថិជនដើម្បីសន្សំពិន្ទុ ឬទទួលបានសិទ្ធិភាគរយសមាជិក — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ សុខ ចាន់",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-cart-discount"]',
      popover: {
        title: "4. បញ្ចុះតម្លៃ (Apply Discount) 🏷️",
        description: "បញ្ចូលភាគរយ % ឬចំនួនទឹកប្រាក់បញ្ចុះតម្លៃ — [ស្រេចចិត្ត] — ឧទាហរណ៍៖ 10% Off ឬ -$1.00",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-checkout"]',
      popover: {
        title: "8. បញ្ចប់ការលក់ និងបោះពុម្ពវិក្កយបត្រ (Confirm & Print) 🧾",
        description: "ចុច Pay ដើម្បីបញ្ចប់ការលក់ បោះពុម្ពវិក្កយបត្រ ឬផ្ញើតាម Telegram — [ចាំបាច់] — ឧទាហរណ៍៖ បោះពុម្ព 80mm Receipt",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="pos-close-register"]',
      popover: {
        title: "9. បិទវេនលក់ (Close Register/Shift) 🔒",
        description: "រាប់សាច់ប្រាក់ចុងវេនដើម្បីផ្ទៀងផ្ទាត់ប្រាក់ក្នុងថត និងរកឃើញភាពខុសគ្នា — [ចាំបាច់] — ឧទាហរណ៍៖ Counted $350.00 (Variance $0.00)",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/employees": [
    {
      element: '[data-tour="user-list"]',
      popover: {
        title: "Staff & User Directory 👥",
        description: "View active cashiers, store managers, and system users.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="add-user"]',
      popover: {
        title: "Create Staff Account ➕",
        description: "Add a new staff member and assign custom role permissions.",
        side: "bottom",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/profile": [
    {
      element: '[data-tour="profile-logo"]',
      popover: {
        title: "1. Store Logo & Branding 🖼️",
        description: "Upload your store logo. It appears on thermal receipts and online storefronts.",
        side: "right",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-name"]',
      popover: {
        title: "2. Store Legal Name 📝",
        description: "Enter your official registered store/business name.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-category"]',
      popover: {
        title: "3. Business Category 🏬",
        description: "Select your business industry (Retail, Supermarket, Restaurant, Cafe, etc.).",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-about"]',
      popover: {
        title: "4. Store Description ℹ️",
        description: "Write a short summary about your business for customers.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-email"]',
      popover: {
        title: "5. Official Email 📧",
        description: "Enter your store contact email address for customer billing.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-phone"]',
      popover: {
        title: "6. Phone Number 📞",
        description: "Provide the main customer service phone number.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-address"]',
      popover: {
        title: "7. Store Address 📍",
        description: "Input your physical store address printed on receipts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
    {
      element: '[data-tour="profile-save"]',
      popover: {
        title: "8. Save Business Profile 💾",
        description: "Click Save to update and persist your business settings.",
        side: "top",
        align: "end",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/payments": [
    {
      element: '[data-tour="business-payments-form"]',
      popover: {
        title: "Bakong KHQR & Payment Methods 💳",
        description: "Configure Bakong Merchant ID, Bank Account, and accepted payment options.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/business/telegram": [
    {
      element: '[data-tour="business-telegram-form"]',
      popover: {
        title: "Telegram Bot Notifications 🤖",
        description: "Connect Telegram bot token and chat ID for instant store alerts.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales": [
    {
      element: '[data-tour="sales-orders-list"]',
      popover: {
        title: "Sales Orders & Receipts 🛒",
        description: "Track customer order receipts, reprint bills, or void transactions.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/dashboard": [
    {
      element: '[data-tour="dashboard-overview"]',
      popover: {
        title: "Overview Analytics & Sales Graphs 📊",
        description: "View live sales figures, profit margins, and store performance statistics.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/analytics": [
    {
      element: '[data-tour="analytics-overview"]',
      popover: {
        title: "📈 Revenue vs COGS Profit Analytics",
        description: "Analyze store net profit margins, cost of goods sold (COGS), and sales channel performance.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/customers": [
    {
      element: '[data-tour="customers-list"]',
      popover: {
        title: "👤 Customer Directory & CRM",
        description: "Manage customer profiles, contact numbers, lifetime spending, and loyalty visit records.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/discounts": [
    {
      element: '[data-tour="discounts-list"]',
      popover: {
        title: "🏷️ Discounts & Promo Coupons",
        description: "Create percentage or fixed dollar discounts, promo codes, and usage quotas.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/pricing": [
    {
      element: '[data-tour="pricing-channel-overrides"]',
      popover: {
        title: "🏷️ Multi-Channel Price Overrides",
        description: "Set different prices for In-Store POS, Online Storefront, and delivery apps.",
        side: "top",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],

  "/sales/membership-types": [
    {
      element: '[data-tour="membership-tiers-list"]',
      popover: {
        title: "⭐ Customer Membership Loyalty Tiers",
        description: "Configure Bronze, Silver, Gold, or VIP membership tiers with automatic discount perks.",
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
        title: "💵 Cash Register Shift & Float Management",
        description: "Open your shift float balance, count drawer cash, and close register with end-of-day X/Z reports.",
        side: "bottom",
        align: "start",
        popoverClass: "fluxibiz-tour-popover",
      },
    },
  ],
};
