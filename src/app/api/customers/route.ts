import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { CustomerResponse } from "@/lib/api/customer";

export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const customers = await backendRequest<CustomerResponse[]>(
            `/api/v1/businesses/${businessId}/customers`,
        );

        return Response.json(customers);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const businessId = await getCurrentBusinessId();
        const body = await request.json();

        const customer = await backendRequest<CustomerResponse>(
            `/api/v1/businesses/${businessId}/customers`,
            {
                method: "POST",
                body: JSON.stringify(body),
            },
        );

        return Response.json(customer, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
