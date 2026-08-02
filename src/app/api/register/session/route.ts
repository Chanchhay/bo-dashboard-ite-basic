import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentRegisterSession } from "@/lib/api/pos-session-backend";

/**
 * The shift this browser has open, or `null` when there is none.
 *
 * `null` is a normal answer, not an error — the open-register screen asks this
 * on load precisely to find out whether it should be showing itself at all.
 */
export async function GET() {
    try {
        return Response.json(await getCurrentRegisterSession());
    } catch (error) {
        return backendErrorResponse(error);
    }
}
