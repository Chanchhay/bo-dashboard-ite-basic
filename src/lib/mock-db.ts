import { Order, Item } from "@/types/pos-type";
import productsSeed from "@/mock/products.json";
import ordersSeed from "@/mock/orders.json";
import registerSeed from "@/mock/register-session.json";

type RegisterSession = {
  registerSessionId: string;
  cashierName: string;
  openedAt: string;
  openingAmount: number;
  revenue: number;
  orderCount: number;
};

type DB = {
  products: Item[];
  orders: Record<string, Order>;
  currentOrderId: string;
  registerSession: RegisterSession;
};

// structuredClone so we never mutate the imported JSON module directly
const db: DB = {
  products: structuredClone(productsSeed) as Item[],
  orders: structuredClone(ordersSeed.orders) as Record<string, Order>,
  currentOrderId: ordersSeed.currentOrderId,
  registerSession: structuredClone(registerSeed) as RegisterSession,
};

export function getDb() {
  return db;
}

export function toMoneyString(n: number) {
  return n.toFixed(2);
}

export function toNumber(v: string | number | undefined | null) {
  return v == null ? 0 : typeof v === "number" ? v : parseFloat(v);
}

export function recalcOrderTotals(order: Order): Order {
  const subtotal = order.items.reduce(
    (sum, item) => sum + toNumber(item.unit_price) * item.quantity,
    0
  );
  const discount = order.items.reduce(
    (sum, item) => sum + toNumber(item.discount_amount),
    0
  );
  return {
    ...order,
    subtotal: toMoneyString(subtotal),
    discount_amount: toMoneyString(discount),
    total: toMoneyString(subtotal - discount),
    updated_at: new Date().toISOString(),
  };
}

export function createBlankOrder(): Order {
  return {
    id: crypto.randomUUID(),
    business_owner_id: "1",
    invoice_number: null,
    customer_id: null,
    cashier_id: "1",
    channel: "POS",
    status: "PENDING",
    subtotal: "0.00",
    discount_amount: "0.00",
    applied_discounts: null,
    total: "0.00",
    currency: "USD",
    note: null,
    comment: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    items: [],
  };
}
