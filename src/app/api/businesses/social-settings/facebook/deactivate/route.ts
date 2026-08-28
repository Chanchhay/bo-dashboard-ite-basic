import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

export async function PATCH() {
    try {
        const result = await backendRequest(
            "/api/v1/businesses/social-settings/facebook/deactivate",
            {
                method: "PATCH",
            },
        );
        return Response.json(result);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
