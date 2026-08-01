import { NextResponse } from "next/server";
import { getDb, recalcOrderTotals } from "@/lib/mock-db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { delta } = await req.json();
  const order = db.orders[db.currentOrderId];

  db.orders[db.currentOrderId] = recalcOrderTotals({
    ...order,
    items: order.items.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ),
  });
  return NextResponse.json(db.orders[db.currentOrderId]);
}