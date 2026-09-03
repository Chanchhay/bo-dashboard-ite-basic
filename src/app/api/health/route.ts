import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Whether the till can reach the API right now.
 *
 * This used to answer 200 unconditionally, which made it a test of whether Vercel
 * was up and never of whether the backend was. That is the wrong question, and
 * wrong in the dangerous direction: the likeliest failure is a healthy frontend
 * in front of an unreachable API, and answering "online" to that keeps the POS
 * out of the offline mode it exists for.
 *
 * The backend's own health endpoint is public, so no credentials are involved.
 */
const HEALTH_TIMEOUT_MS = 3000;

/**
 * Tills poll this every fifteen seconds and one answer serves all of them for a
 * moment. Held per running instance, which is as much as a serverless function
 * can cache, and short enough that a real outage is still noticed within a single
 * poll.
 */
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
        // Nothing configured to check. Reporting a failure here would put every
        // till into offline mode over a deployment mistake, so that judgement is
        // left to the requests that actually need the API.
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
        // Unreachable, refused, or slower than a till can wait for.
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
