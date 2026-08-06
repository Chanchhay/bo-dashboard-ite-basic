import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { DiscountResponse } from "@/lib/api/discount";

export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const discounts = await backendRequest<DiscountResponse[]>(
            `/api/v1/businesses/${businessId}/discounts`,
        );

        return Response.json(discounts);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const businessId = await getCurrentBusinessId();
        const body = await request.json();

        const discount = await backendRequest<DiscountResponse>(
            `/api/v1/businesses/${businessId}/discounts`,
            {
                method: "POST",
                body: JSON.stringify(body),
            },
        );

        return Response.json(discount, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
