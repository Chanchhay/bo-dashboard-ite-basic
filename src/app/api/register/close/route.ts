import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function POST(req: Request) {
  const db = getDb();
  const { totalCounted } = await req.json();
  const totalExpected = db.registerSession.openingAmount + db.registerSession.revenue;
  const totalDifferent = totalCounted - totalExpected;
  return NextResponse.json({ totalExpected, totalDifferent });
}