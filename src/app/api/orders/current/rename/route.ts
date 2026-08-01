import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function PATCH(req: Request) {
  const db = getDb();
  const { note, comment } = await req.json();
  db.orders[db.currentOrderId] = {
    ...db.orders[db.currentOrderId],
    note,
    comment: comment ?? null,
    updated_at: new Date().toISOString(),
  };
  return NextResponse.json(db.orders[db.currentOrderId]);
}