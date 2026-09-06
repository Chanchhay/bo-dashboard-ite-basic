import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DiscountResponse } from "@/lib/api/discount";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ discountId: string }> },
) {
    try {
        const { discountId } = await params;
        const businessId = await getCurrentBusinessId();
        const discount = await backendRequest<DiscountResponse>(
            `/api/v1/businesses/${businessId}/discounts/${discountId}`,
        );

        return Response.json(discount);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ discountId: string }> },
) {
    try {
        const { discountId } = await params;
        const businessId = await getCurrentBusinessId();
        const body = await readJsonBody(request);

        const discount = await backendRequest<DiscountResponse>(
            `/api/v1/businesses/${businessId}/discounts/${discountId}`,
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );

        return Response.json(discount);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ discountId: string }> },
) {
    try {
        const { discountId } = await params;
        const businessId = await getCurrentBusinessId();

        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/discounts/${discountId}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
