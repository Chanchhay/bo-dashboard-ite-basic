import { NextResponse } from "next/server";
import { getDb, createReceiptFromOrder } from "@/lib/mock-db";
import type { PaymentInput } from "@/types/pos-type";

export async function POST(req: Request) {
  const db = getDb();
  const input: PaymentInput = await req.json();

  if (input.method_type === "CASH") {
    const received = input.received_amount ?? 0;
    if (received < input.amount) {
      return NextResponse.json(
        { message: "Received amount is less than the total due" },
        { status: 400 }
      );
    }
  }

  const order = db.orders[db.currentOrderId];

  db.orders[db.currentOrderId] = {
    ...order,
    status: "PAID",
    updated_at: new Date().toISOString(),
  };

  // Create the matching receipt record so it appears in the Receipts tab
  createReceiptFromOrder(
    db.orders[db.currentOrderId],
    input.method_type,
    input.received_amount
  );

  return NextResponse.json(db.orders[db.currentOrderId]);
}