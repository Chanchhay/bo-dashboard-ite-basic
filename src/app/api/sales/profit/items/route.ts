import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { ItemProfitReport } from "@/lib/api/sales-report";

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
        const report = await backendRequest<ItemProfitReport>(
            `/api/v1/businesses/${businessId}/sales/profit/items${search ? `?${search}` : ""}`,
        );

        return Response.json(report);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
