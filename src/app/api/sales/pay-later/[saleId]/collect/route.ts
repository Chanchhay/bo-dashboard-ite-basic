import { NextRequest } from "next/server";

import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { collectPayLaterSchema } from "@/lib/api/pay-later";
import type { PayLaterSale } from "@/lib/api/pay-later";

/** Settles a pay-later sale once the money actually comes in. */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ saleId: string }> },
) {
    try {
        const { saleId } = await params;
        const result = collectPayLaterSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const sale = await backendRequest<PayLaterSale>(
            `/api/v1/businesses/${businessId}/sales/pay-later/${encodeURIComponent(saleId)}/collect`,
            {
                method: "PATCH",
                body: JSON.stringify(result.data),
            },
        );

        return Response.json(sale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
