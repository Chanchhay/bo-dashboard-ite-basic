import { NextResponse } from "next/server";
import { getDb, createBlankOrder } from "@/lib/mock-db";

export async function POST() {
  const db = getDb();
  const blank = createBlankOrder();
  db.orders[blank.id] = blank;
  db.currentOrderId = blank.id;
  return NextResponse.json(blank);
}