import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { SalesPredictionsResponse } from "@/lib/api/sales-report";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const window = url.searchParams.get("window") ?? "WEEK";

        const predictions = await backendRequest<SalesPredictionsResponse>(
            `/api/v1/businesses/${businessId}/sales/predictions?window=${window}`,
        );

        return Response.json(predictions);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
