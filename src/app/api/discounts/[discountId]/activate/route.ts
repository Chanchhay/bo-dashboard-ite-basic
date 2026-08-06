import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DiscountResponse } from "@/lib/api/discount";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ discountId: string }> },
) {
    try {
        const { discountId } = await params;
        const businessId = await getCurrentBusinessId();
        const discount = await backendRequest<DiscountResponse>(
            `/api/v1/businesses/${businessId}/discounts/${discountId}/activate`,
            { method: "PATCH" },
        );

        return Response.json(discount);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
