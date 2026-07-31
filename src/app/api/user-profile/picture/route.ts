import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

/** Clearing the avatar; the profile PATCH can only replace it. */
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
