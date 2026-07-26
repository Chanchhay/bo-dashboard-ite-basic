//  ORDER SERVICE
import { toMoneyString, toNumber } from "@/lib/money";
import { Order, OrderItem, Product } from "@/types/pos-type";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Product Menu
const mockProducts: Product[] = [
  { id: "101", business_owner_id: "1", name: "Beef Steak", price: "50.00",image_url: "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg", is_available:"ACTIVE"  },
  { id: "102", business_owner_id: "1", name: "Shoulder Bag", price: "70.00", image_url: "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg", is_available:"ACTIVE" },
  { id: "103", business_owner_id: "1", name: "Cold Drink", price: "3.00",image_url: "https://i.pinimg.com/1200x/3c/a9/9a/3ca99a55d718100b7dc154093d704410.jpg", is_available:"ACTIVE"  },
];

//Mock for Pending Order
let mockOrder: Order = {
  id: "9001",
  business_owner_id: "1",
  invoice_number: null,
  customer_id: null,
  cashier_id: "1",
  channel: "POS",
  status: "PENDING",
  subtotal: "123.00",
  discount_amount: "10.00",
  total: "113.00",
  currency: "USD",
  note: null,
  items: [
    {
      id: "1",
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
      order_id: "9001",
      product_id: "102",
      variant_id: null,
      product_name: "Shoulder Bag",
      variant_name: null,
      quantity: 1,
      unit_price: "70.00",
      unit_cost: "40.00",
      discount_amount: "0.00",
      applied_discount: null,
    },
    {
      id: "3",
      order_id: "9001",
      product_id: "103",
      variant_id: null,
      product_name: "Cold Drink",
      variant_name: null,
      quantity: 1,
      unit_price: "3.00",
      unit_cost: "1.00",
      discount_amount: "0.00",
      applied_discount: null,
    },
  ],
};

//calculate total,, discound
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
  };
}

//GET current pending order
export async function getCurrentOrder(): Promise<Order> {
  await delay();
  return structuredClone(mockOrder);

}

// Update product Qty
export async function updateOrderItemQty(
  itemId: string,
  delta: number
): Promise<Order> {
  await delay();
  mockOrder = recalcOrderTotals({
    ...mockOrder,
    items: mockOrder.items.map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ),
  });
  return structuredClone(mockOrder);

}

//Delete Product
export async function removeOrderItem(itemId: string): Promise<Order> {
  await delay();
  mockOrder = recalcOrderTotals({
    ...mockOrder,
    items: mockOrder.items.filter((item) => item.id !== itemId),
  });
  return structuredClone(mockOrder);
}

// Add product Order
export async function addProductToOrder(productId: string): Promise<Order> {
  await delay();
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) throw new Error("Product not found");

  const existing = mockOrder.items.find((i) => i.product_id === productId);
  const items = existing
    ? mockOrder.items.map((i) =>
        i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i
      )
    : [
        ...mockOrder.items,
        {
          id: crypto.randomUUID(),
          order_id: mockOrder.id,
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

  mockOrder = recalcOrderTotals({ ...mockOrder, items });
  return structuredClone(mockOrder);

}

//Check out
export async function payOrder(): Promise<Order> {
  await delay();
  mockOrder = { ...mockOrder, status: "PAID" };
  return structuredClone(mockOrder);
}
export async function getProducts(): Promise<Product[]> {
  await delay();
  return structuredClone(mockProducts);
 

}
