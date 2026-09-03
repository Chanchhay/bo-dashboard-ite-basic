import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    parkOrderSchema,
    type PosOrder,
} from "@/lib/api/pos-order";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

/** Leaves the current order pending and releases the terminal for another cart. */
export async function POST(request: Request) {
    try {
        const result = parkOrderSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        let current = await getCurrentOrder();

        if (!current) {
            if (result.data.note !== undefined) {
                const businessId = await getCurrentBusinessId();
                current = await backendRequest<PosOrder>(ordersPath(businessId), {
                    method: "POST",
                    body: JSON.stringify({
                        channel: "POS",
                        items: [],
                        note: result.data.note,
                    }),
                });

                return Response.json(current);
            }

            return Response.json(
                { message: "There is no current order to save." },
                { status: 409 },
            );
        }

        let parked = current;

        if (result.data.note !== undefined) {
            const businessId = await getCurrentBusinessId();
            parked = await backendRequest<PosOrder>(
                ordersPath(
                    businessId,
                    `/${encodeURIComponent(current.id)}/note`,
                ),
                {
                    method: "PATCH",
                    body: JSON.stringify({ note: result.data.note }),
                },
            );
        }

        await forgetOrder();
        return Response.json(parked);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
