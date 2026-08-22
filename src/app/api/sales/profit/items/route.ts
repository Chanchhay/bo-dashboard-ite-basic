import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { ItemProfitReport } from "@/lib/api/sales-report";

/**
 * What each item sold over a range, and what the shop kept on it.
 *
 * A straight pass-through: the grouping is the database's job, because the
 * only alternative is reading every sale line a shop has ever made in order to
 * add it up here.
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
        const report = await backendRequest<ItemProfitReport>(
            `/api/v1/businesses/${businessId}/sales/profit/items${search ? `?${search}` : ""}`,
        );

        return Response.json(report);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
