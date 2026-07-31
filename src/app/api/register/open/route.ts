import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { startingCash } = await req.json();
  if (startingCash < 0) {
    return NextResponse.json({ message: "Starting cash cannot be negative" }, { status: 400 });
  }
  return NextResponse.json({ registerSessionId: "register_session_1" });
}