import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CouponResponse } from "@/lib/api/discount";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ couponId: string }> },
) {
    try {
        const { couponId } = await params;
        const businessId = await getCurrentBusinessId();
        const coupon = await backendRequest<CouponResponse>(
            `/api/v1/businesses/${businessId}/coupons/${couponId}`,
        );

        return Response.json(coupon);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ couponId: string }> },
) {
    try {
        const { couponId } = await params;
        const businessId = await getCurrentBusinessId();
        const body = await request.json();

        const coupon = await backendRequest<CouponResponse>(
            `/api/v1/businesses/${businessId}/coupons/${couponId}`,
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );

        return Response.json(coupon);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ couponId: string }> },
) {
    try {
        const { couponId } = await params;
        const businessId = await getCurrentBusinessId();

        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/coupons/${couponId}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
