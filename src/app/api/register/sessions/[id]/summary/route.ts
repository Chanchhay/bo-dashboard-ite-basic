import { backendErrorResponse } from "@/lib/api/backend";
import getSessionSummary from "@/lib/api/pos-session-backend";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { id } = await context.params;
        const summary = await getSessionSummary(id);
        return Response.json(summary);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
