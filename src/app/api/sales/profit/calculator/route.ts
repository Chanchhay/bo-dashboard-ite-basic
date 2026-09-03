import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    saleProfitCalculatorRequestSchema,
    type SaleProfitCalculatorResponse,
} from "@/lib/api/sales-report";

/**
 * "What if I priced the catalog at this margin" — priced against a fresh
 * read of inventory on the backend rather than whatever the browser has
 * cached, so a stock delivery mid-session can't leave the prediction stale.
 */
export async function POST(request: Request) {
    try {
        const result = saleProfitCalculatorRequestSchema.safeParse(
            await request.json(),
        );

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();

        const response = await backendRequest<SaleProfitCalculatorResponse>(
            `/api/v1/businesses/${businessId}/sales/profit/calculator`,
            {
                method: "POST",
                body: JSON.stringify(result.data),
            },
        );

        return Response.json(response);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
