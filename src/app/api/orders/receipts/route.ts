import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder, PosOrderPage } from "@/lib/api/pos-order";
import { ordersPath } from "@/lib/api/pos-order-backend";

type BackendOrderPage = {
    content?: PosOrder[];
    page?: Partial<PosOrderPage["page"]>;
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
};

function boundedInteger(value: string | null, fallback: number, maximum: number) {
    if (value === null) return fallback;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0
        ? Math.min(parsed, maximum)
        : fallback;
}

function validIsoDate(value: string | null) {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Lists persisted paid orders; historical sale projections are not yet exposed. */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const pageNumber = boundedInteger(url.searchParams.get("page"), 0, 10_000);
        const pageSize = Math.max(
            1,
            boundedInteger(url.searchParams.get("size"), 10, 50),
        );
        const from = validIsoDate(url.searchParams.get("from"));
        const to = validIsoDate(url.searchParams.get("to"));
        const businessId = await getCurrentBusinessId();
        const filters = [
            {
                column: "status",
                value: "PAID",
                operation: "EQUAL",
            },
            ...(from
                ? [
                      {
                          column: "createdDate",
                          value: from,
                          operation: "GREATER_THAN_EQUAL",
                      },
                  ]
                : []),
            ...(to
                ? [
                      {
                          column: "createdDate",
                          value: to,
                          operation: "LESS_THAN_EQUAL",
                      },
                  ]
                : []),
        ];
        const result = await backendRequest<BackendOrderPage>(
            `${ordersPath(businessId, "/filter")}?page=${pageNumber}&size=${pageSize}&sort=createdDate,desc`,
            {
                method: "POST",
                body: JSON.stringify({
                    searchRequestDto: filters,
                    globalOperator: "AND",
                }),
            },
        );

        const content = (result.content ?? []).filter(
            (order) => order.status === "PAID",
        );
        const metadata = result.page ?? result;

        return Response.json({
            content,
            page: {
                size: metadata.size ?? pageSize,
                number: metadata.number ?? pageNumber,
                totalElements: metadata.totalElements ?? content.length,
                totalPages:
                    metadata.totalPages ?? (content.length > 0 ? 1 : 0),
            },
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
