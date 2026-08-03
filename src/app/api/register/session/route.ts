import { NextResponse } from "next/server";
import { getDb } from "@/lib/mock-db";

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.registerSession);
}