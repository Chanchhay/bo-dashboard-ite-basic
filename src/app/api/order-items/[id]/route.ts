import { NextResponse } from "next/server";
import { getDb, recalcOrderTotals } from "@/lib/mock-db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const order = db.orders[db.currentOrderId];

  db.orders[db.currentOrderId] = recalcOrderTotals({
    ...order,
    items: order.items.filter((item) => item.id !== id),
  });
  return NextResponse.json(db.orders[db.currentOrderId]);
}