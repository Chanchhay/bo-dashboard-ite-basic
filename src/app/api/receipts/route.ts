import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const cashierId = searchParams.get("cashierId");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);

  let receipts = db.receipts;
  if (from) receipts = receipts.filter((r) => new Date(r.sold_at) >= new Date(from));
  if (to) receipts = receipts.filter((r) => new Date(r.sold_at) <= new Date(to));
  if (cashierId) receipts = receipts.filter((r) => r.cashier_id === cashierId);

  const cash = receipts.filter((r) => r.method_type === "CASH").reduce((s, r) => s + parseFloat(r.amount), 0);
  const card = receipts.filter((r) => r.method_type === "DIGITAL").reduce((s, r) => s + parseFloat(r.amount), 0);

  return NextResponse.json({
    receipts,
    summary: {
      total: (cash + card).toFixed(2),
      cash: cash.toFixed(2),
      card: card.toFixed(2),
      receiptCount: receipts.length,
    },
    totalResults: receipts.length,
    page,
    pageSize,
  });
}