import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DashboardPage, RecentOrderRow } from "@/lib/api/dashboard";

/**
 * The recent orders table, already searched and paged by the server.
 *
 * The search has to reach rows that are not on the current page, so it cannot
 * be applied here on whatever this page happens to hold.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const query = new URLSearchParams();
        const search = url.searchParams.get("search");
        const page = url.searchParams.get("page");
        const size = url.searchParams.get("size");

        if (search) query.set("search", search);
        if (page) query.set("page", page);
        if (size) query.set("size", size);

        const params = query.toString();
        const orders = await backendRequest<DashboardPage<RecentOrderRow>>(
            `/api/v1/businesses/${businessId}/dashboard/recent-orders${params ? `?${params}` : ""}`,
        );

        return Response.json(orders);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
