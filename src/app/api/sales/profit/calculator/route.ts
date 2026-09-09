import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    saleProfitCalculatorRequestSchema,
    type SaleProfitCalculatorResponse,
} from "@/lib/api/sales-report";

export async function POST(request: Request) {
    try {
        const result = saleProfitCalculatorRequestSchema.safeParse(
            await readJsonBody(request),
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
