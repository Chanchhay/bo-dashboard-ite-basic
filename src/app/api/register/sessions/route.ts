import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { normalizeRegisterSessionPage } from "@/lib/api/pos-session";

/** Matches the backend's `@PageableDefault(size = 20)`. */
const DEFAULT_SIZE = 20;

/**
 * A page of the business's register sessions, newest first.
 *
 * The backend resolves the business from the authenticated caller, so nothing
 * here identifies it — a session belonging to another shop is not something a
 * caller can ask for by changing a query string.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);

        // Clamped rather than passed through: `size` reaches a database query,
        // and an unbounded one would undo the point of paging at all.
        const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
        const size = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get("size")) || DEFAULT_SIZE),
        );

        const query = new URLSearchParams({
            page: String(page),
            size: String(size),
            sort: "openedAt,desc",
        });

        const payload = await backendRequest<Record<string, unknown>>(
            `/api/v1/sessions?${query.toString()}`,
        );

        return Response.json(
            normalizeRegisterSessionPage(payload, { page, size }),
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
