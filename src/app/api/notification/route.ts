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
        const size = searchParams.get("size") ?? "20";
        const sort = searchParams.get("sort");
        const type = searchParams.get("type");
        const isRead = searchParams.get("isRead");

        let sortParam = "createdDate,desc";
        if (sort) {
            if (sort.toUpperCase() === "DESC") sortParam = "createdDate,desc";
            else if (sort.toUpperCase() === "ASC") sortParam = "createdDate,asc";
            else sortParam = sort;
        }

        let backendUrl = `/api/v1/notifications/received?page=${page}&size=${size}&sort=${encodeURIComponent(sortParam)}`;
        if (type) {
            backendUrl += `&type=${encodeURIComponent(type)}`;
        }
        if (isRead !== null && isRead !== undefined) {
            backendUrl += `&isRead=${encodeURIComponent(isRead)}`;
        }

        const response = await backendRequest<NotificationResponse>(backendUrl);

        return Response.json(
            normalizeNotificationResponse(response)
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await backendRequest("/api/v1/notifications", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return Response.json(response, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}