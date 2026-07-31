import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const detail = db.receiptDetails[params.id];
  if (!detail) return NextResponse.json({ message: "Receipt not found" }, { status: 404 });
  return NextResponse.json(detail);
}