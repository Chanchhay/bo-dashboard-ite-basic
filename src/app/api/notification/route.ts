import { NextRequest } from "next/server";

import {
    backendRequest,
    backendErrorResponse,
} from "@/lib/api/backend";

import {
    normalizeNotificationResponse,
    type NotificationResponse,
} from "@/lib/api/notification";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const page = searchParams.get("page") ?? "0";
        const size = searchParams.get("size") ?? "6";
        const sort = searchParams.get("sort") ?? "ASC";

        const response = await backendRequest<NotificationResponse>(
            `/api/v1/notifications/received?page=${page}&size=${size}&sort=${sort}`
        );

        return Response.json(
            normalizeNotificationResponse(response)
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}