import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    normalizeRegisterSessionSearch,
    type RegisterSessionSearch,
} from "@/lib/api/pos-session";

const DEFAULT_SIZE = 20;

const RANGE_DAYS: Record<string, number | null> = {
    "All time": null,
    Today: 0,
    "7 days": 7,
    "30 days": 30,
};

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

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);

        const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
        const size = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get("size")) || DEFAULT_SIZE),
        );

        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");
        const from = rangeStart(url.searchParams.get("range"));

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
