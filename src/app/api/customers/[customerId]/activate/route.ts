import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CustomerResponse } from "@/lib/api/customer";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ customerId: string }> },
) {
    try {
        const { customerId } = await params;
        const businessId = await getCurrentBusinessId();

        const customer = await backendRequest<CustomerResponse>(
            `/api/v1/businesses/${businessId}/customers/${customerId}/activate`,
            { method: "PATCH" },
        );

        return Response.json(customer);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
