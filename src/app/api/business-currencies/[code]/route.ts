import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { Business } from "@/lib/api/business";
import type { BusinessCurrency } from "@/lib/api/currency";

type RouteContext = {
    params: Promise<{ code: string }>;
};

async function getBusinessId() {
    const business = await backendRequest<Business>(
        "/api/v1/businesses/me",
    );
    return business.id;
}

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { code } = await context.params;
        const businessId = await getBusinessId();
        const currency = await backendRequest<BusinessCurrency>(
            `/api/v1/businesses/${encodeURIComponent(businessId)}/currencies/${encodeURIComponent(code)}`,
        );

        return Response.json(currency);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const { code } = await context.params;
        const body = await request.json();
        const businessId = await getBusinessId();
        const updated = await backendRequest<BusinessCurrency>(
            `/api/v1/businesses/${encodeURIComponent(businessId)}/currencies/${encodeURIComponent(code)}`,
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { code } = await context.params;
        const businessId = await getBusinessId();
        await backendRequest<void>(
            `/api/v1/businesses/${encodeURIComponent(businessId)}/currencies/${encodeURIComponent(code)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
