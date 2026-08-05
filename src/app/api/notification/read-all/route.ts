import { NextRequest } from "next/server";

import {
    backendRequest,
    backendErrorResponse,
} from "@/lib/api/backend";

export async function PATCH(_request: NextRequest) {
    try {
        const response = await backendRequest(
            "/api/v1/notifications/received/read-all",
            {
                method: "PATCH",
            }
        );

        return Response.json(response ?? { success: true });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
