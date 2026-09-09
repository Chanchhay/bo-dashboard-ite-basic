import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { BestSellingRow, DashboardPage } from "@/lib/api/dashboard";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const query = new URLSearchParams();
        for (const key of ["from", "to", "search", "page", "size"]) {
            const value = url.searchParams.get(key);
            if (value) query.set(key, value);
        }

        const params = query.toString();
        const rows = await backendRequest<DashboardPage<BestSellingRow>>(
            `/api/v1/businesses/${businessId}/dashboard/best-selling${params ? `?${params}` : ""}`,
        );

        return Response.json(rows);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
