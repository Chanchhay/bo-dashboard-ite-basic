import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder, PosOrderItem } from "@/lib/api/pos-order";
import {
    ensureCurrentOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

export async function GET() {
    try {
        return Response.json(await getCurrentOrder());
    } catch (error) {
        return backendErrorResponse(error);
    }
}

const cartLineSchema = z.object({
    itemId: z.string().min(1),
    variantId: z.string().nullish(),
    unitId: z.string().nullish(),
    addOnIds: z.array(z.string()).optional(),
    quantity: z.coerce.number().int().positive(),
});

const putCartSchema = z.object({
    lines: z.array(cartLineSchema),
});

/**
 * What makes two lines the same line: the item and every choice on it.
 *
 * Both sides of the reconciliation are keyed this way, which is why the till
 * never has to send an id the server issued. The cart it holds is a statement
 * of what is being sold, not a list of rows to update.
 */
function keyOf(line: {
    itemId: string;
    variantId?: string | null;
    unitId?: string | null;
    addOnIds?: (string | null)[];
}) {
    return [
        line.itemId,
        line.variantId ?? "",
        line.unitId ?? "",
        [...(line.addOnIds ?? [])].filter(Boolean).sort().join("+"),
    ].join("|");
}

function keyOfServerLine(line: PosOrderItem) {
    return keyOf({
        itemId: line.itemId,
        variantId: line.variantId,
        unitId: line.unitId,
        addOnIds: (line.addOns ?? []).map((addOn) => addOn.addOnId),
    });
}

/**
 * Makes the server's order match the cart the till is holding.
 *
 * The till owns the cart now, so it declares the whole thing and this works out
 * the difference — rather than the till replaying a stream of edits, each one
 * naming a row id it had to wait for and could lose. Sending the same cart
 * twice changes nothing the second time, which is what makes it safe to retry
 * after a connection drops mid-push.
 */
export async function PUT(request: Request) {
    try {
        const result = putCartSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        let order = await ensureCurrentOrder(businessId);

        const wanted = new Map(
            result.data.lines.map((line) => [keyOf(line), line]),
        );

        // Removals first: a cart that has swapped one line for another should
        // not have to hold both at once against the channel's share of stock.
        for (const line of order.items) {
            if (wanted.has(keyOfServerLine(line))) continue;

            order = await backendRequest<PosOrder>(
                ordersPath(
                    businessId,
                    `/${encodeURIComponent(order.id)}/items/${encodeURIComponent(line.id)}`,
                ),
                { method: "DELETE" },
            );
        }

        for (const [key, line] of wanted) {
            const existing = order.items.find(
                (candidate) => keyOfServerLine(candidate) === key,
            );

            if (!existing) {
                order = await backendRequest<PosOrder>(
                    ordersPath(businessId, `/${encodeURIComponent(order.id)}/items`),
                    {
                        method: "POST",
                        body: JSON.stringify({
                            itemId: line.itemId,
                            variantId: line.variantId ?? undefined,
                            unitId: line.unitId ?? undefined,
                            addOnIds: line.addOnIds,
                            quantity: line.quantity,
                        }),
                    },
                );

                continue;
            }

            if (existing.quantity === line.quantity) continue;

            order = await backendRequest<PosOrder>(
                ordersPath(
                    businessId,
                    `/${encodeURIComponent(order.id)}/items/${encodeURIComponent(existing.id)}`,
                ),
                {
                    method: "PATCH",
                    body: JSON.stringify({ quantity: line.quantity }),
                },
            );
        }

        // The till matches its lines back up by the same key, so it learns the
        // ids without this route having to know anything about its own.
        return Response.json({
            order,
            lineIds: Object.fromEntries(
                order.items.map((line) => [keyOfServerLine(line), line.id]),
            ),
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
