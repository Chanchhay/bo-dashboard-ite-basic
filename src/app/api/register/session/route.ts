import { backendErrorResponse } from "@/lib/api/backend";
import { findCurrentRegisterSession } from "@/lib/api/pos-session-backend";

/**
 * The store-wide open shift, or `null` when there is none.
 *
 * This lookup is authoritative across browsers. The backend's 204 becomes a
 * JSON `null` for existing client consumers.
 */
export async function GET() {
    try {
        return Response.json(await findCurrentRegisterSession());
    } catch (error) {
        return backendErrorResponse(error);
    }
}
