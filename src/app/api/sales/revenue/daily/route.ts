import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DailyChannelRevenue } from "@/lib/api/sales-report";

/**
 * Revenue per channel per day, over a range.
 *
 * A pass-through, like the profit route beside it: the grouping is the
 * database's job, because the only alternative is reading every sale a shop
 * has ever made in order to bucket it here.
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
        const rows = await backendRequest<DailyChannelRevenue[]>(
            `/api/v1/businesses/${businessId}/sales/revenue/daily${search ? `?${search}` : ""}`,
        );

        return Response.json(rows ?? []);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
