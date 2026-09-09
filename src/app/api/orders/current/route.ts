import { z } from "zod";

import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
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
    freeQuantity: z.coerce.number().int().nonnegative().optional(),
});

const putCartSchema = z.object({
    lines: z.array(cartLineSchema),
});

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

export async function PUT(request: Request) {
    try {
        const result = putCartSchema.safeParse(await readJsonBody(request));

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

        return Response.json({
            order,
            lineIds: Object.fromEntries(
                order.items.map((line) => [keyOfServerLine(line), line.id]),
            ),
            freeQuantities: Object.fromEntries(
                order.items.map((line) => [keyOfServerLine(line), line.freeQuantity ?? 0]),
            ),
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
