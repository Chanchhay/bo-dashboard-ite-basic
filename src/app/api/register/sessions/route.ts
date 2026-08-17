import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { findCurrentRegisterSession } from "@/lib/api/pos-session-backend";
import { normalizeRegisterSession, type RegisterSession } from "@/lib/api/pos-session";
import { MOCK_REGISTER_SESSIONS } from "@/mock/register-sessions-mock";

/**
 * Normalizes backend response which can be a single RegisterSession object, an array, or a paginated response.
 */
function parseSessionPayload(payload: unknown): RegisterSession[] {
    if (!payload) return [];

    // Array of session objects
    if (Array.isArray(payload)) {
        return (payload as RegisterSession[]).map(normalizeRegisterSession);
    }

    if (typeof payload === "object" && payload !== null) {
        const obj = payload as Record<string, unknown>;

        // Paginated object with `content` array
        if (Array.isArray(obj.content)) {
            return obj.content.map(normalizeRegisterSession);
        }

        // Paginated object with `data` array
        if (Array.isArray(obj.data)) {
            return obj.data.map(normalizeRegisterSession);
        }

        // Object with `sessions` array
        if (Array.isArray(obj.sessions)) {
            return obj.sessions.map(normalizeRegisterSession);
        }

        // Object with `items` array
        if (Array.isArray(obj.items)) {
            return obj.items.map(normalizeRegisterSession);
        }

        // Object with `results` array
        if (Array.isArray(obj.results)) {
            return obj.results.map(normalizeRegisterSession);
        }

        // Single session object with an id
        if ("id" in obj && obj.id !== undefined && obj.id !== null) {
            return [normalizeRegisterSession(obj)];
        }
    }

    return [];
}

/**
 * Returns dynamic register session history.
 */
export async function GET() {
    try {
        let sessions: RegisterSession[] = [...MOCK_REGISTER_SESSIONS];

        // 1. Fetch current active session from backend if open
        let currentSession: RegisterSession | null = null;
        try {
            currentSession = await findCurrentRegisterSession();
        } catch {
            // No active session or unauthenticated
        }

        // 2. Ensure current active open session is merged into top of the list
        if (currentSession) {
            const index = sessions.findIndex((s) => s.id === currentSession.id);
            if (index !== -1) {
                sessions[index] = currentSession;
            } else {
                sessions.unshift(currentSession);
            }
        }

        return Response.json(sessions, {
            headers: {
                "X-Data-Source": "database-history",
            },
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}

