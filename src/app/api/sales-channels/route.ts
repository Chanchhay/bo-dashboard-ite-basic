import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { SalesChannel } from "@/lib/api/sales-channels";

export async function GET() {
    try {
        const channels = await backendRequest<SalesChannel[]>(
            "/api/v1/sales-channels",
        );

        return Response.json(channels);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
