import { cookies } from "next/headers";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    normalizeRegisterSession,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";

/**
 * The store-wide open session, independent of this browser's cookie.
 *
 * The backend resolves the register from the authenticated user's business.
 * A 204 response has no JSON body, which `backendRequest` represents as
 * `undefined`; that is the only successful "no open drawer" answer.
 */
export async function findCurrentRegisterSession(): Promise<RegisterSession | null> {
    const session = await backendRequest<RegisterSession | undefined>(
        "/api/v1/sessions/current",
    );

    if (!session || session.status !== "OPEN") {
        return null;
    }

    return normalizeRegisterSession(session);
}

/** Every session for the caller's business, most recently opened first. */
export async function listRegisterSessions(): Promise<RegisterSession[]> {
    const sessions = await backendRequest<RegisterSession[]>("/api/v1/sessions");
    return (sessions ?? []).map(normalizeRegisterSession);
}

/** Records the current authenticated user as a participant in the drawer. */
export async function joinRegisterSession(
    sessionId: number,
): Promise<RegisterSession> {
    const session = await backendRequest<RegisterSession>(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/join`,
        { method: "POST" },
    );

    return normalizeRegisterSession(session);
}

/**
 * The shift this browser has open, or `null` when there is definitively none.
 *
 * Throws when the answer is unknown — the backend being unreachable is not the
 * same as the drawer being shut, and callers that redirect on `null` must not
 * act on a network blip.
 */
export async function getCurrentRegisterSession(): Promise<RegisterSession | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(POS_SESSION_COOKIE)?.value;

    if (!sessionId) return null;

    try {
        const session = await backendRequest<RegisterSession>(
            `/api/v1/sessions/${encodeURIComponent(sessionId)}/summary`,
        );

        // Closed on another device, or the cookie outlived the shift.
        if (session.status !== "OPEN") {
            cookieStore.delete(POS_SESSION_COOKIE);
            return null;
        }

        return normalizeRegisterSession(session);
    } catch (error) {
        // A stale id is expected once the backend prunes a session.
        if (
            error instanceof BackendApiError &&
            (error.status === 404 || error.status === 400)
        ) {
            cookieStore.delete(POS_SESSION_COOKIE);
            return null;
        }

        throw error;
    }
}

export default async function getSessionSummary(
    sessionId: number | string,
): Promise<RegisterSession> {
    const session = await backendRequest<RegisterSession>(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/summary`,
    );

    return normalizeRegisterSession(session);
}
