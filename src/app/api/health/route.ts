import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEALTH_TIMEOUT_MS = 3000;

const CACHE_MS = 5000;

let lastCheckedAt = 0;
let lastResult = true;

function backendHealthUrl(): string | null {
    const baseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
    return baseUrl ? `${baseUrl}/actuator/health` : null;
}

async function backendReachable(): Promise<boolean> {
    const now = Date.now();
    if (now - lastCheckedAt < CACHE_MS) {
        return lastResult;
    }

    const url = backendHealthUrl();
    if (!url) {
        lastCheckedAt = now;
        lastResult = true;
        return true;
    }

    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
            cache: "no-store",
        });
        lastResult = res.ok;
    } catch {
        lastResult = false;
    }

    lastCheckedAt = now;
    return lastResult;
}

export async function GET() {
    const reachable = await backendReachable();

    return NextResponse.json(
        { status: reachable ? "ok" : "backend_unreachable", timestamp: Date.now() },
        { status: reachable ? 200 : 503 },
    );
}

export async function HEAD() {
    const reachable = await backendReachable();
    return new NextResponse(null, { status: reachable ? 200 : 503 });
}
