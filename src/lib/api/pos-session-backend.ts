import { cookies } from "next/headers";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    normalizeRegisterSession,
    POS_SESSION_COOKIE,
    type RegisterSession,
} from "@/lib/api/pos-session";


export async function findCurrentRegisterSession(): Promise<RegisterSession | null> {
    const session = await backendRequest<RegisterSession | undefined>(
        "/api/v1/sessions/current",
    );

    if (!session || session.status !== "OPEN") {
        return null;
    }

    return normalizeRegisterSession(session);
}


export async function listRegisterSessions(): Promise<RegisterSession[]> {
    const sessions = await backendRequest<RegisterSession[]>("/api/v1/sessions");
    return (sessions ?? []).map(normalizeRegisterSession);
}


export async function joinRegisterSession(
    sessionId: number,
): Promise<RegisterSession> {
    const session = await backendRequest<RegisterSession>(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/join`,
        { method: "POST" },
    );

    return normalizeRegisterSession(session);
}


export async function getCurrentRegisterSession(): Promise<RegisterSession | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(POS_SESSION_COOKIE)?.value;

    if (!sessionId) return null;

    try {
        const session = await backendRequest<RegisterSession>(
            `/api/v1/sessions/${encodeURIComponent(sessionId)}/summary`,
        );

        
        if (session.status !== "OPEN") {
            cookieStore.delete(POS_SESSION_COOKIE);
            return null;
        }

        return normalizeRegisterSession(session);
    } catch (error) {
        
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
