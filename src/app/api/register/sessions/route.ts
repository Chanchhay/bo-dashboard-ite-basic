import { backendErrorResponse } from "@/lib/api/backend";
import getSessionSummary, { listRegisterSessions } from "@/lib/api/pos-session-backend";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const querySessionId = searchParams.get("sessionId") || searchParams.get("id");

        // If a specific sessionId is requested, fetch just its summary.
        if (querySessionId) {
            const summary = await getSessionSummary(querySessionId);
            return Response.json([summary]);
        }

        const sessions = await listRegisterSessions();
        return Response.json(sessions);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
