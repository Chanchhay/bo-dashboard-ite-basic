import { backendErrorResponse } from "@/lib/api/backend";
import { findCurrentRegisterSession } from "@/lib/api/pos-session-backend";

export async function GET() {
    try {
        return Response.json(await findCurrentRegisterSession());
    } catch (error) {
        return backendErrorResponse(error);
    }
}
