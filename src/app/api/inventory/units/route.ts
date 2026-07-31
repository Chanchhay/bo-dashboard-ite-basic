import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { Unit } from "@/lib/api/inventory";

export async function GET() {
    try {
        const units = await backendRequest<Unit[]>("/api/v1/units");
        return Response.json(units);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
