import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function GET() {
  const db = getDb();
  const open = Object.values(db.orders)
    .filter((o) => o.status === "PENDING" && (o.items.length > 0 || o.note))
    .map((o) => ({
      id: o.id,
      note: o.note,
      created_at: o.created_at,
      itemCount: o.items.length,
      total: o.total,
    }));
  return NextResponse.json(open);
}