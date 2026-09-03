import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DashboardOverview } from "@/lib/api/dashboard";

/**
 * Every card on the dashboard, in one call.
 *
 * A pass-through, and deliberately one request rather than four: the cards
 * share their inputs — the channel report feeds both the revenue headline and
 * the share-by-channel ring — so splitting them would fetch it twice.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const query = new URLSearchParams();
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const granularity = url.searchParams.get("granularity");

        // Absent means unbounded, which is how "all time" is asked for.
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        if (granularity) query.set("granularity", granularity);

        const search = query.toString();
        const overview = await backendRequest<DashboardOverview>(
            `/api/v1/businesses/${businessId}/dashboard/overview${search ? `?${search}` : ""}`,
        );

        return Response.json(overview);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
