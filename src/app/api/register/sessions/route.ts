import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    normalizeRegisterSessionSearch,
    type RegisterSessionSearch,
} from "@/lib/api/pos-session";

/** Matches the backend's `@PageableDefault(size = 20)`. */
const DEFAULT_SIZE = 20;

/** How far back each named range reaches, in days. `null` means all time. */
const RANGE_DAYS: Record<string, number | null> = {
    "All time": null,
    Today: 0,
    "7 days": 7,
    "30 days": 30,
};

/**
 * `YYYY-MM-DDTHH:mm:ss`, in the shop's own time.
 *
 * Not an ISO instant: a `Z` suffix would shift the boundary by the offset and
 * start "today" hours early or late depending on which side of UTC the shop
 * sits.
 */
function toLocalDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

function rangeStart(range: string | null): string | null {
    if (!range) return null;

    const days = RANGE_DAYS[range];
    if (days === null || days === undefined) return null;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (days > 0) start.setDate(start.getDate() - days);

    return toLocalDateTime(start);
}

/**
 * A page of the business's register sessions, filtered, newest first.
 *
 * The filtering happens on the backend rather than here or in the browser: the
 * list is paged, and a filter applied to one page answers a question about
 * twenty rows while claiming to answer it about the whole history.
 *
 * The backend resolves the business from the authenticated caller, so nothing
 * in this request identifies it — a session belonging to another shop is not
 * something a caller can ask for by editing a query string.
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

        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");
        const from = rangeStart(url.searchParams.get("range"));

        // The structured clauses the backend's FilterSpecification understands.
        // Free text is not one of them — it is an OR across several columns,
        // so it travels separately and the backend composes the two.
        const searchRequestDto: {
            column: string;
            value: string;
            operation: string;
        }[] = [];

        if (status && status !== "ALL") {
            searchRequestDto.push({
                column: "status",
                value: status,
                operation: "EQUAL",
            });
        }

        if (from) {
            searchRequestDto.push({
                column: "openedAt",
                value: from,
                operation: "GREATER_THAN_EQUAL",
            });
        }

        const query = new URLSearchParams({
            page: String(page),
            size: String(size),
            sort: "openedAt,desc",
        });
        if (search?.trim()) query.set("search", search.trim());

        const payload = await backendRequest<Partial<RegisterSessionSearch>>(
            `/api/v1/sessions/filter?${query.toString()}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    searchRequestDto,
                    globalOperator: "AND",
                }),
            },
        );

        return Response.json(
            normalizeRegisterSessionSearch(payload, { page, size }),
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
