export type OrderChannel = "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";
export type DiscountType = "PERCENTAGE" | "FIXED" | "COUPON";
export type PaymentMethodType = "CASH" | "DIGITAL";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "ISOLATED";

export type Product = {
  id: string;
  business_owner_id: string;
  name: string;
  image_url: string | null;
  price: string ; // schema doesn't mark this not-null — must allow null
  is_available: ProductStatus;
};

export type AppliedDiscount = {
  discount_id: string;
  type: DiscountType;
  value: string;
};

export type OrderItem = {
  id: string;
  business_owner_id: string; // present on every real order_items row
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  discount_amount: string;
  applied_discount: AppliedDiscount | null;
};

export type Order = {
  id: string;
  business_owner_id: string;
  invoice_number: string | null;
  customer_id: string | null;
  cashier_id: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal: string;
  discount_amount: string;
  applied_discounts: unknown | null; 
  total: string;
  currency: string;
  note: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  items: OrderItem[];
};


export type OrderListItem = {
  id: string;
  note: string | null; // used as the customer/table name on the card
  created_at: string;
  itemCount: number;
  total: string;
};

export type OrderSummary = {
  subtotal: number;
  discount: number;
  total: number;
};

export type PaymentInput = {
  method_type: PaymentMethodType;
  amount: number;
  received_amount?: number; // only meaningful for CASH — used to calculate change
};

// ---- Receipts tab ----

// Mirrors a row you'd get joining receipts + orders + payments + sales
export type ReceiptListItem = {
  id: string;
  ticket_number: string;
  sold_at: string;
  cashier_id: string;
  cashier_name: string;
  item_count: number;
  method_type: PaymentMethodType;
  amount: string;
  status: "PAID" | "REFUNDED" | "FAILED";
};

export type ReceiptsSummary = {
  total: string;
  cash: string;
  card: string;
  receiptCount: number;
};

// Full detail view when a receipt is opened — mirrors receipts + orders +
// order_items + payments joined together for the printable ticket
export type ReceiptDetail = {
  id: string;
  ticket_number: string;
  sold_at: string;
  cashier_name: string;
  business_name: string;
  method_type: PaymentMethodType;
  received_amount: number | null; // only set for CASH
  change_amount: number | null;
  items: {
    product_name: string;
    quantity: number;
    unit_price: string;
    discount_amount: string;
  }[];
  subtotal: string;
  discount_amount: string;
  total: string;
  status: "PAID" | "REFUNDED" | "FAILED";
};

/**
 * Fields needed for the printable tax-invoice receipt that aren't in
 * the schema yet: Khmer business name, VAT registration number, VAT
 * rate, and a KHR exchange rate/display currency. `businesses` has
 * most contact fields already (address, phoneNumber) — this type
 * covers what's still missing. `business_currencies.exchange_rate`
 * already covers the riel conversion once wired to a real query.
 */
export type BusinessReceiptInfo = {
  name_en: string;
  name_km: string; // Khmer business name — no column for this yet
  address: string;
  phone: string;
  vat_number: string; // "VATTIN" — no column for this yet
  vat_rate: number; // e.g. 0.10 for 10% — no rate column on products/orders yet
  exchange_rate: number; // KHR per 1 unit of currency, from business_currencies
};