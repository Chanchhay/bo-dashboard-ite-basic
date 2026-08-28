import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { NextRequest } from "next/server";

export async function PATCH(request: NextRequest) {
    const enabled = request.nextUrl.searchParams.get("enabled");
    try {
        const result = await backendRequest(
            `/api/v1/businesses/social-settings/facebook/mini-app?enabled=${enabled === "true"}`,
            {
                method: "PATCH",
            },
        );
        return Response.json(result);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
