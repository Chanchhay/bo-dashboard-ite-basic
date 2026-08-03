import { NextResponse } from "next/server";
import { getDb, recalcOrderTotals } from "@/lib/mock-db";
import type { OrderItem } from "@/types/pos-type";

export async function POST(req: Request) {
  const db = getDb();
  const { productId } = await req.json();

  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const order = db.orders[db.currentOrderId];
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

  db.orders[db.currentOrderId] = recalcOrderTotals({ ...order, items });
  return NextResponse.json(db.orders[db.currentOrderId]);
}