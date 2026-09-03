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
    /**
     * How many of `quantity` the till already knows are a Buy X Get Y
     * freebie, last learned from a previous push. The backend's add/update
     * endpoints take a *paid* quantity — they decide the free portion
     * themselves — so this is subtracted before either is called; without
     * it, a total that already includes a granted freebie would be resent
     * as if the cashier meant to pay for it too, compounding the bundle on
     * every edit after the first.
     */
    freeQuantity: z.coerce.number().int().nonnegative().optional(),
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

            // The backend's add/update endpoints decide the free portion of a
            // Buy X Get Y bundle themselves and expect to be told only what
            // the cashier is actually paying for — never a total that may
            // already have a previously-granted freebie baked into it.
            const paidQuantity = Math.max(0, line.quantity - (line.freeQuantity ?? 0));

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
                            quantity: paidQuantity,
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
                    body: JSON.stringify({ quantity: paidQuantity }),
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
            // How many of each line the backend's Buy X Get Y engine gave
            // away for free — the till has no bundle rules of its own, so
            // this is the only way it ever learns a bundle completed.
            freeQuantities: Object.fromEntries(
                order.items.map((line) => [keyOfServerLine(line), line.freeQuantity ?? 0]),
            ),
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
