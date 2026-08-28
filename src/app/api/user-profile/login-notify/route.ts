import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

export async function POST() {
    try {
        await backendRequest<void>("/api/v1/user-profiles/login-notify", {
            method: "POST",
        });

        return new Response(null, { status: 200 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
