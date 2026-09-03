import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CustomerResponse } from "@/lib/api/customer";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ customerId: string }> },
) {
    try {
        const { customerId } = await params;
        const businessId = await getCurrentBusinessId();
        const customer = await backendRequest<CustomerResponse>(
            `/api/v1/businesses/${businessId}/customers/${customerId}`,
        );

        return Response.json(customer);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ customerId: string }> },
) {
    try {
        const { customerId } = await params;
        const businessId = await getCurrentBusinessId();
        const body = await readJsonBody(request);

        const customer = await backendRequest<CustomerResponse>(
            `/api/v1/businesses/${businessId}/customers/${customerId}`,
            {
                method: "PATCH",
                body: JSON.stringify(body),
            },
        );

        return Response.json(customer);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ customerId: string }> },
) {
    try {
        const { customerId } = await params;
        const businessId = await getCurrentBusinessId();

        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/customers/${customerId}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
