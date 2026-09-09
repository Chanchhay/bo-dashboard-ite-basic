

import { toMoneyString, toNumber } from "@/lib/money";
import {
  Order,
  OrderItem,
  Item,
  PaymentInput,
  OrderListItem,
} from "@/types/pos-type";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProducts: Item[] = [
  {
    id: "101",
    business_owner_id: "1",
    name: "Beef Steak",
    price: "50.00",
    image_url:
      "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg",
    is_available: "ACTIVE",
  },
  {
    id: "102",
    business_owner_id: "1",
    name: "Shoulder Bag",
    price: "70.00",
    image_url:
      "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg",
    is_available: "ACTIVE",
  },
  {
    id: "103",
    business_owner_id: "1",
    name: "Cold Drink",
    price: "3.00",
    image_url:
      "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg",
    is_available: "ACTIVE",
  },
];

const mockOrders: Record<string, Order> = {
  "9001": {
    id: "9001",
    business_owner_id: "1",
    invoice_number: null,
    customer_id: null,
    cashier_id: "1",
    channel: "POS",
    status: "PENDING",
    subtotal: "123.00",
    discount_amount: "10.00",
    applied_discounts: null,
    total: "113.00",
    currency: "USD",
    note: "Nita Sok",
    comment: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    items: [
      {
        id: "1",
        business_owner_id: "1",
        order_id: "9001",
        product_id: "101",
        variant_id: null,
        product_name: "Beef Steak",
        variant_name: null,
        quantity: 1,
        unit_price: "50.00",
        unit_cost: "30.00",
        discount_amount: "10.00",
        applied_discount: { discount_id: "5", type: "PERCENTAGE", value: "20" },
      },
      {
        id: "2",
        business_owner_id: "1",
        order_id: "9001",
        product_id: "101",
        variant_id: null,
        product_name: "Beef Steak",
        variant_name: null,
        quantity: 1,
        unit_price: "50.00",
        unit_cost: "30.00",
        discount_amount: "0.00",
        applied_discount: null,
      },
      {
        id: "3",
        business_owner_id: "1",
        order_id: "9001",
        product_id: "101",
        variant_id: null,
        product_name: "Beef Steak",
        variant_name: null,
        quantity: 1,
        unit_price: "50.00",
        unit_cost: "30.00",
        discount_amount: "0.00",
        applied_discount: null,
      },
    ],
  },
  "9002": {
    id: "9002",
    business_owner_id: "1",
    invoice_number: null,
    customer_id: null,
    cashier_id: "1",
    channel: "POS",
    status: "PENDING",
    subtotal: "50.00",
    discount_amount: "0.00",
    applied_discounts: null,
    total: "50.00",
    currency: "USD",
    note: "Table 1",
    comment: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    items: [
      {
        id: "4",
        business_owner_id: "1",
        order_id: "9002",
        product_id: "102",
        variant_id: null,
        product_name: "Shoulder Bag",
        variant_name: null,
        quantity: 1,
        unit_price: "50.00",
        unit_cost: "30.00",
        discount_amount: "0.00",
        applied_discount: null,
      },
    ],
  },
  "9003": {
    id: "9003",
    business_owner_id: "1",
    invoice_number: null,
    customer_id: null,
    cashier_id: "1",
    channel: "POS",
    status: "PENDING",
    subtotal: "50.00",
    discount_amount: "0.00",
    applied_discounts: null,
    total: "50.00",
    currency: "USD",
    note: "Table 2",
    comment: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    items: [
      {
        id: "5",
        business_owner_id: "1",
        order_id: "9003",
        product_id: "103",
        variant_id: null,
        product_name: "Cold Drink",
        variant_name: null,
        quantity: 1,
        unit_price: "50.00",
        unit_cost: "1.00",
        discount_amount: "0.00",
        applied_discount: null,
      },
    ],
  },
};

let currentOrderId = "9001";

function recalcOrderTotals(order: Order): Order {
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

export async function getCurrentOrder(): Promise<Order> {
  await delay();
  return structuredClone(mockOrders[currentOrderId]);
}

export async function getOpenOrders(): Promise<OrderListItem[]> {
  await delay();
  return Object.values(mockOrders)
    .filter((o) => o.status === "PENDING")
    .map((o) => ({
      id: o.id,
      note: o.note,
      created_at: o.created_at,
      itemCount: o.items.length,
      total: o.total,
    }));

}

export async function loadOrderForEdit(orderId: string): Promise<Order> {
  await delay();
  if (!mockOrders[orderId]) throw new Error("Order not found");
  currentOrderId = orderId;
  return structuredClone(mockOrders[orderId]);

}

export async function updateOrderItemQty(
  itemId: string,
  delta: number
): Promise<Order> {
  await delay();
  const order = mockOrders[currentOrderId];
  mockOrders[currentOrderId] = recalcOrderTotals({
    ...order,
    items: order.items.map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ),
  });
  return structuredClone(mockOrders[currentOrderId]);
}

export async function removeOrderItem(itemId: string): Promise<Order> {
  await delay();
  const order = mockOrders[currentOrderId];
  mockOrders[currentOrderId] = recalcOrderTotals({
    ...order,
    items: order.items.filter((item) => item.id !== itemId),
  });
  return structuredClone(mockOrders[currentOrderId]);
}

export async function addProductToOrder(productId: string): Promise<Order> {
  await delay();
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) throw new Error("Item not found");
  if (product.price === null) throw new Error("Item has no price set");

  const order = mockOrders[currentOrderId];
  const existing = order.items.find((i) => i.product_id === productId);
  const items = existing
    ? order.items.map((i) =>
        i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i
      )
    : [
        ...order.items,
        {
          id: crypto.randomUUID(),
          business_owner_id: order.business_owner_id,
          order_id: order.id,
          product_id: product.id,
          variant_id: null,
          product_name: product.name,
          variant_name: null,
          quantity: 1,
          unit_price: product.price,
          unit_cost: "0.00",
          discount_amount: "0.00",
          applied_discount: null,
        } satisfies OrderItem,
      ];

  mockOrders[currentOrderId] = recalcOrderTotals({ ...order, items });
  return structuredClone(mockOrders[currentOrderId]);
}

export async function renameOrder(note: string): Promise<Order> {
  await delay();
  mockOrders[currentOrderId] = {
    ...mockOrders[currentOrderId],
    note,
    updated_at: new Date().toISOString(),
  };
  return structuredClone(mockOrders[currentOrderId]);

  
}

export async function payOrder(input: PaymentInput): Promise<Order> {
  await delay();

  if (input.method_type === "CASH") {
    const received = input.received_amount ?? 0;
    if (received < input.amount) {
      throw new Error("Received amount is less than the total due");
    }
  }

  mockOrders[currentOrderId] = {
    ...mockOrders[currentOrderId],
    status: "PAID",
    updated_at: new Date().toISOString(),
  };
  return structuredClone(mockOrders[currentOrderId]);
}

export async function getProducts(): Promise<Item[]> {
  await delay();
  return structuredClone(mockProducts);
}
function createBlankOrder(): Order {
  const id = crypto.randomUUID();
  return {
    id,
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

export async function clearCurrentOrder(): Promise<Order> {
  await delay();
  const blank = createBlankOrder();
  mockOrders[blank.id] = blank;
  currentOrderId = blank.id;
  return structuredClone(blank);
}
