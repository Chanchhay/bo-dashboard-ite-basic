import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentOrder } from "@/lib/api/pos-order-backend";

/**
 * The cart this terminal is building, or `null`.
 *
 * `null` is an ordinary answer, not an error — a till with nothing rung up yet
 * is the normal state at the start of every sale.
 */
export async function GET() {
    try {
        return Response.json(await getCurrentOrder());
    } catch (error) {
        return backendErrorResponse(error);
    }
}
