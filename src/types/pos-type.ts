export type OrderChannel = "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";
export type DiscountType = "PERCENTAGE" | "FIXED" | "COUPON";

export type ProductStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "ISOLATED";
 
export type Product = {
  id: string;
  business_owner_id: string;
  name: string;
  image_url: string | null; 
  price: string ; 
  is_available: ProductStatus;
};



export type AppliedDiscount = {
  discount_id: string;
  type: DiscountType;
  value: string; 
};


export type OrderItem = {
  id: string;
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
  total: string;
  currency: string;
  note: string | null;
  items: OrderItem[];
};

export type OrderSummary = {
  subtotal: number;
  discount: number;
  total: number;
};