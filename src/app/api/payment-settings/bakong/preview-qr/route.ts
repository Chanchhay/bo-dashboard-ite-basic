import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { khqrPreviewSchema } from "@/lib/api/bakong";
import type { Khqr } from "@/lib/api/pos-order";

export async function POST(request: Request) {
    try {
        const result = khqrPreviewSchema.safeParse(await readJsonBody(request));

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
