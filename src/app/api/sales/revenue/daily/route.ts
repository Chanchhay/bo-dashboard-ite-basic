import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DailyChannelRevenue } from "@/lib/api/sales-report";

/**
 * Revenue for every channel, broken out per day.
 *
 * A straight pass-through, same as `/api/sales/profit` — the grouping is the
 * database's job.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const query = new URLSearchParams();
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        if (from) query.set("from", from);
        if (to) query.set("to", to);

        const search = query.toString();
        const revenue = await backendRequest<DailyChannelRevenue[]>(
            `/api/v1/businesses/${businessId}/sales/revenue/daily${search ? `?${search}` : ""}`,
        );

        return Response.json(revenue);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
