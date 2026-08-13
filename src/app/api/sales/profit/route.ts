import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { SalesProfit } from "@/lib/api/sales-report";

/**
 * Revenue, cost and profit for every channel the shop sells on.
 *
 * A straight pass-through: the grouping is the database's job, because the
 * only alternative is reading every sale a shop has ever made in order to add
 * it up here.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const query = new URLSearchParams();
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        // Absent means unbounded, which is how "all time" is asked for.
        if (from) query.set("from", from);
        if (to) query.set("to", to);

        const search = query.toString();
        const profit = await backendRequest<SalesProfit>(
            `/api/v1/businesses/${businessId}/sales/profit${search ? `?${search}` : ""}`,
        );

        return Response.json(profit);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
