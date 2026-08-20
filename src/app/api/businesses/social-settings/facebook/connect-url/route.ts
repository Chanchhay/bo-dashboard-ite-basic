import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

export async function GET() {
    try {
        const result = await backendRequest(
            "/api/v1/businesses/social-settings/facebook/connect-url",
        );
        return Response.json(result);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
