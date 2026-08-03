import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  if (!db.orders[id]) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  db.currentOrderId = id;
  return NextResponse.json(db.orders[id]);
}