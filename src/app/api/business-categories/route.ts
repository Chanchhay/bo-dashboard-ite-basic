import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { BusinessCategory } from "@/lib/api/business";

export async function GET() {
    try {
        const categories = await backendRequest<BusinessCategory[]>(
            "/api/v1/public/business-categories",
        );
        return Response.json(categories);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
