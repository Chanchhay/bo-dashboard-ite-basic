import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { khqrPreviewSchema } from "@/lib/api/bakong";
import type { Khqr } from "@/lib/api/pos-order";

/**
 * Produces a throwaway code from the saved settings.
 *
 * Lets a merchant prove the configuration works without ringing up a real
 * sale — and separates "Bakong is misconfigured" from "the order is wrong",
 * which are otherwise indistinguishable at the till.
 */
export async function POST(request: Request) {
    try {
        const result = khqrPreviewSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const khqr = await backendRequest<Khqr>(
            "/api/v1/businesses/payment-settings/bakong/preview-qr",
            { method: "POST", body: JSON.stringify(result.data) },
        );

        return Response.json(khqr);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
