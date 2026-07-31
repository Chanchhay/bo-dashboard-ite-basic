import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const detail = db.receiptDetails[id];
  if (!detail) return NextResponse.json({ message: "Receipt not found" }, { status: 404 });
  return NextResponse.json(detail);
}