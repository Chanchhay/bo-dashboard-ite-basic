import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CouponResponse } from "@/lib/api/discount";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ couponId: string }> },
) {
    try {
        const { couponId } = await params;
        const businessId = await getCurrentBusinessId();
        const coupon = await backendRequest<CouponResponse>(
            `/api/v1/businesses/${businessId}/coupons/${couponId}/activate`,
            { method: "PATCH" },
        );

        return Response.json(coupon);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
