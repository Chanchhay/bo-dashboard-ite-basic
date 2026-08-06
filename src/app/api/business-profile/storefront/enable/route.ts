import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { StorefrontStatus } from "@/lib/api/business";

export async function PATCH() {
    try {
        const status = await backendRequest<StorefrontStatus>(
            "/api/v1/businesses/storefront/enable",
            { method: "PATCH" },
        );
        return Response.json(status);
    } catch (error) {
        return backendErrorResponse(error);
    }
}