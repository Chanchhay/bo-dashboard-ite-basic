import { NextRequest } from "next/server";

import {
    backendRequest,
    backendErrorResponse,
} from "@/lib/api/backend";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await backendRequest(
            `/api/v1/notifications/received/${id}/read`,
            {
                method: "PATCH",
            }
        );

        return Response.json(response ?? { success: true });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
