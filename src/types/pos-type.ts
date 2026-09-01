export type OrderChannel = "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PAID" | "FAILED" | "CANCELLED";
export type DiscountType = "PERCENTAGE" | "FIXED" | "COUPON";
export type PaymentMethodType = "CASH" | "DIGITAL";
export type ItemStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "ISOLATED";

export type Item = {
  id: string;
  business_owner_id: string;
  name: string;
  image_url: string | null;
  price: string ; // schema doesn't mark this not-null — must allow null
  is_available: ItemStatus;
  /**
   * Why it cannot be sold, when it cannot.
   *
   * "Unavailable" and "Out of stock" are different problems with different
   * fixes — one is a switch in Inventory, the other is a delivery — and a
   * cashier who only sees a dimmed card has to go and find out which.
   */
  unavailableReason?: string;
  /**
   * How many are left to sell, set only once that number is low enough to
   * change what the cashier does.
   *
   * A card reading "127 left" is noise on every tap of the day; one reading
   * "2 left" is the difference between promising a customer an item and
   * having to take it back. Absent on anything nobody counts — a haircut has
   * no shelf behind it.
   */
  lowStockLeft?: number;
  discountBadge?: string;
  discountedPrice?: string;
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
  /**
   * The unit sold and what one of them holds.
   *
   * Optional because most of this shape predates items being sold by the pack;
   * a line without them is sold by the base unit, one at a time.
   */
  unit_name?: string | null;
  unit_factor?: number | null;
  add_ons?: { name: string }[];
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
  tax_rate?: number | null;
  tax_amount?: number | null;
  tax_inclusion_type?: "INCLUSIVE" | "EXCLUSIVE" | null;
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
