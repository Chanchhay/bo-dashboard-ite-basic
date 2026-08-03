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

/** Lists the real pending orders for this business, newest first. */
export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const result = await backendRequest<BackendOrderPage>(
            `${ordersPath(businessId, "/filter")}?page=0&size=100&sort=createdDate,desc`,
            {
                method: "POST",
                body: JSON.stringify({
                    searchRequestDto: [
                        {
                            column: "status",
                            value: "PENDING",
                            operation: "EQUAL",
                        },
                    ],
                    globalOperator: "AND",
                }),
            },
        );

        // Spring Page serialization differs between backend versions. Keep the
        // browser on one stable shape while accepting both documented forms.
        const content = (result.content ?? []).filter(
            (order) =>
                order.status === "PENDING" &&
                (order.items.length > 0 || Boolean(order.note?.trim())),
        );
        const metadata = result.page ?? result;

        const page: PosOrderPage = {
            content,
            page: {
                size: metadata.size ?? content.length,
                number: metadata.number ?? 0,
                totalElements: content.length,
                totalPages: content.length > 0 ? 1 : 0,
            },
        };

        return Response.json(page);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
