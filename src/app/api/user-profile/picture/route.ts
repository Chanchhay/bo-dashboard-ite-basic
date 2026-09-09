import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

export async function DELETE() {
    try {
        await backendRequest<void>("/api/v1/user-profiles/me/picture", {
            method: "DELETE",
        });

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
