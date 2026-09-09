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
  price: string ;
  is_available: ItemStatus;
  unavailableReason?: string;
  lowStockLeft?: number;
  stockUnit?: string;
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
  business_owner_id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
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
  currency: string | null;
  note: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  items: OrderItem[];
};

export type OrderListItem = {
  id: string;
  note: string | null;
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
  received_amount?: number;
};
