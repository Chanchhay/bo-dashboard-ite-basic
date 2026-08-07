import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";

export async function GET() {
    try {
        const result = await backendRequest(
            "/api/v1/businesses/social-settings/telegram-bot",
        );
        return Response.json(result);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const result = await backendRequest(
            "/api/v1/businesses/social-settings/telegram-bot",
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );
        return Response.json(result);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE() {
    try {
        await backendRequest(
            "/api/v1/businesses/social-settings/telegram-bot",
            {
                method: "DELETE",
            },
        );
        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
