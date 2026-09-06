import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CouponResponse } from "@/lib/api/discount";

export async function GET(request: NextRequest) {
    try {
        const businessId = await getCurrentBusinessId();
        const discountId = request.nextUrl.searchParams.get("discountId");
        const path = discountId
            ? `/api/v1/businesses/${businessId}/coupons?discountId=${encodeURIComponent(discountId)}`
            : `/api/v1/businesses/${businessId}/coupons`;

        const coupons = await backendRequest<CouponResponse[]>(path);
        return Response.json(coupons);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const businessId = await getCurrentBusinessId();
        const body = await readJsonBody(request);

        const coupon = await backendRequest<CouponResponse>(
            `/api/v1/businesses/${businessId}/coupons`,
            {
                method: "POST",
                body: JSON.stringify(body),
            },
        );

        return Response.json(coupon, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
