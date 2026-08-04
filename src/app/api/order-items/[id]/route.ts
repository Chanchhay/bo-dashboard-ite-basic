import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { updateOrderItemSchema, type PosOrder } from "@/lib/api/pos-order";
import { ordersPath, readOrderId } from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/** `id` is the order line, not the catalogue item it was rung up from. */
async function linePath(orderItemId: string) {
    const orderId = await readOrderId();

    if (!orderId) return null;

    const businessId = await getCurrentBusinessId();

    return ordersPath(
        businessId,
        `/${encodeURIComponent(orderId)}/items/${encodeURIComponent(orderItemId)}`,
    );
}

function noOrder() {
    return Response.json(
        { message: "There is no open order." },
        { status: 409 },
    );
}

/** Sets a line's quantity outright. Removing a line is DELETE. */
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const result = updateOrderItemSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const { id } = await context.params;
        const path = await linePath(id);

        if (!path) return noOrder();

        const order = await backendRequest<PosOrder>(path, {
            method: "PATCH",
            body: JSON.stringify(result.data),
        });

        return Response.json(order);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const path = await linePath(id);

        if (!path) return noOrder();

        const order = await backendRequest<PosOrder | undefined>(path, {
            method: "DELETE",
        });

        return Response.json(order ?? null);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
