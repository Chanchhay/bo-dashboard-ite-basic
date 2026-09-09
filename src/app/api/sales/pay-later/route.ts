import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PayLaterSale } from "@/lib/api/pay-later";

export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const sales = await backendRequest<PayLaterSale[]>(
            `/api/v1/businesses/${businessId}/sales/pay-later`,
        );

        return Response.json(sales);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
