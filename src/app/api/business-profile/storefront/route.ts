import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { StorefrontStatus } from "@/lib/api/business";

export async function GET() {
    try {
        const status = await backendRequest<StorefrontStatus>(
            "/api/v1/businesses/storefront",
        );
        return Response.json(status);
    } catch (error) {
        return backendErrorResponse(error);
    }
}