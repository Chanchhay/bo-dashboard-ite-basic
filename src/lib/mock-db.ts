import { Order, Product, ReceiptListItem, ReceiptDetail } from "@/types/pos-type";
import productsSeed from "@/mock/products.json";
import ordersSeed from "@/mock/orders.json";
import receiptsSeed from "@/mock/receipts.json";
import receiptDetailsSeed from "@/mock/receipt-details.json";
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
  products: Product[];
  orders: Record<string, Order>;
  currentOrderId: string;
  receipts: ReceiptListItem[];
  receiptDetails: Record<string, ReceiptDetail>;
  registerSession: RegisterSession;
};

// structuredClone so we never mutate the imported JSON module directly
const db: DB = {
  products: structuredClone(productsSeed) as Product[],
  orders: structuredClone(ordersSeed.orders) as Record<string, Order>,
  currentOrderId: ordersSeed.currentOrderId,
  receipts: structuredClone(receiptsSeed) as ReceiptListItem[],
  receiptDetails: structuredClone(receiptDetailsSeed) as Record<string, ReceiptDetail>,
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

let ticketCounter = Object.keys(db.receiptDetails).length; // continue numbering after seed data

export function createReceiptFromOrder(
  order: Order,
  method: "CASH" | "DIGITAL",
  receivedAmount?: number
): { listItem: ReceiptListItem; detail: ReceiptDetail } {
  ticketCounter += 1;
  const id = crypto.randomUUID();
  const ticket_number = `#${ticketCounter}`;
  const sold_at = new Date().toISOString();
  const total = toNumber(order.total);
  const change = method === "CASH" && receivedAmount !== undefined
    ? Math.max(receivedAmount - total, 0)
    : null;

  const listItem: ReceiptListItem = {
    id,
    ticket_number,
    sold_at,
    cashier_id: order.cashier_id ?? "1",
    cashier_name: "Sok Sok", // TODO: pull real cashier name once auth/staff table exists
    item_count: order.items.length,
    method_type: method,
    amount: order.total,
    status: "PAID",
  };

  const detail: ReceiptDetail = {
    id,
    ticket_number,
    sold_at,
    cashier_name: listItem.cashier_name,
    business_name: "FluxiBiz", // TODO: pull from businesses table
    method_type: method,
    received_amount: method === "CASH" ? receivedAmount ?? total : null,
    change_amount: change,
    items: order.items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_amount: i.discount_amount,
    })),
    subtotal: order.subtotal,
    discount_amount: order.discount_amount,
    total: order.total,
    status: "PAID",
  };

  db.receipts = [listItem, ...db.receipts];
  db.receiptDetails[id] = detail;

  return { listItem, detail };
}