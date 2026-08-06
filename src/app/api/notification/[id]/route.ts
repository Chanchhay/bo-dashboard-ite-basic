import { NextRequest } from "next/server";

import {
    backendRequest,
    backendErrorResponse,
} from "@/lib/api/backend";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const permanent = searchParams.get("permanent") === "true";

        if (permanent) {
            // Hard delete
            await backendRequest(`/api/v1/notifications/received/${id}/permanent`, {
                method: "DELETE",
            });
        } else {
            // Soft delete (PUT endpoint in backend)
            await backendRequest(`/api/v1/notifications/received/${id}`, {
                method: "PUT",
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
