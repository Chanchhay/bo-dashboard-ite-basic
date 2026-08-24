import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { payOrderSchema, type PosOrder, type Sale } from "@/lib/api/pos-order";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";
import { getActiveDefaultTax } from "@/lib/tax-store";

/**
 * Settles the sale.
 * Ensures payment validation compares cash tendered against the real discounted total
 * and bypasses Spring backend un-discounted validation exceptions.
 */
export async function POST(request: Request) {
    try {
        const result = payOrderSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const order = await getCurrentOrder();

        if (!order) {
            return Response.json(
                { message: "There is no open order to pay for." },
                { status: 409 },
            );
        }

        if (order.items.length === 0) {
            return Response.json(
                { message: "Add an item before taking payment." },
                { status: 409 },
            );
        }

        const businessId = await getCurrentBusinessId();

        // Calculate real financial flow breakdown
        const grossSubtotal = order.items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        );
        const itemDiscount = order.items.reduce(
            (sum, item) => sum + (item.discountAmount || 0),
            0
        );
        const subtotal = Math.max(0, grossSubtotal - itemDiscount);
        const discountAmount = Math.max(0, order.discountAmount ?? 0);
        const afterDiscount = Math.max(0, subtotal - discountAmount);

        const activeTax = getActiveDefaultTax();
        const isTaxActive = result.data.isTaxActive ?? activeTax?.isActive ?? false;
        const isTaxInclusive = isTaxActive
            ? (result.data.isTaxInclusive ?? activeTax?.isTaxInclusive ?? false)
            : false;

        const effectiveTaxRate = isTaxActive
            ? (result.data.taxRate !== undefined ? result.data.taxRate : ((order.taxRate && order.taxRate > 0) ? order.taxRate : (activeTax?.taxRate ?? 0)))
            : 0;

        const calculatedTaxAmount = isTaxActive
            ? (isTaxInclusive
                ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
                : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2)))
            : 0;

        const taxAmount = isTaxActive
            ? (result.data.taxAmount !== undefined ? result.data.taxAmount : ((order.taxAmount && order.taxAmount > 0) ? order.taxAmount : calculatedTaxAmount))
            : 0;

        const targetDiscountId = result.data.discountId || order.discountId;
        const targetDiscountCode = result.data.discountCode || order.discountCode;

        // Sync order discount to Spring Java backend prior to payment validation
        if (discountAmount > 0 || targetDiscountId || targetDiscountCode) {
            try {
                const patchedOrder = await backendRequest<PosOrder>(
                    ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            discountAmount,
                            discountId: targetDiscountId ?? undefined,
                            discountCode: targetDiscountCode ?? undefined,
                        }),
                    }
                );
                if (patchedOrder) {
                    if (patchedOrder.discountAmount !== undefined) order.discountAmount = patchedOrder.discountAmount;
                    if (patchedOrder.total !== undefined) order.total = patchedOrder.total;
                }
            } catch {
                try {
                    // Fallback: patch manual discount amount without discountId if target rules failed
                    const fallbackOrder = await backendRequest<PosOrder>(
                        ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                discountAmount,
                            }),
                        }
                    );
                    if (fallbackOrder) {
                        if (fallbackOrder.discountAmount !== undefined) order.discountAmount = fallbackOrder.discountAmount;
                        if (fallbackOrder.total !== undefined) order.total = fallbackOrder.total;
                    }
                } catch {}
            }
        } else if ((order.discountAmount ?? 0) > 0) {
            // If discount was cleared on cart
            try {
                await backendRequest<unknown>(
                    ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            discountAmount: 0,
                        }),
                    }
                );
            } catch {}
        }

        const effectiveTotal = Math.max(
            0,
            parseFloat(
                (isTaxInclusive ? afterDiscount : (afterDiscount + taxAmount)).toFixed(2)
            )
        );

        const userReceived = result.data.receivedAmount;
        const isPayLater = result.data.paymentMethod === "PAY_LATER";

        // Check if cash tendered covers effective discounted total
        if (result.data.paymentMethod === "CASH" && userReceived !== undefined) {
            if (userReceived < effectiveTotal) {
                return Response.json(
                    {
                        message: `Received ${userReceived.toFixed(
                            2
                        )} is less than the total ${effectiveTotal.toFixed(2)}`,
                    },
                    { status: 400 }
                );
            }
        }

        // Pay later collects nothing right now — whatever the client sent is
        // ignored, so a stray value can never be mistaken for cash in hand.
        const paidVal = isPayLater ? 0 : (userReceived ?? effectiveTotal);

        // Sync order discount to Spring Java backend prior to payment
        if (discountAmount > 0) {
            try {
                await backendRequest<unknown>(
                    ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            discountAmount,
                        }),
                    }
                );
            } catch {
                // Ignore discount patch error if endpoint not reached
            }
        }

        const taxInclusionType = isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE";

        // Send payment to Spring Java backend
        const sale = await backendRequest<Sale>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/pay`),
            {
                method: "PATCH",
                body: JSON.stringify({
                    paymentMethod: result.data.paymentMethod,
                    note: result.data.note,
                    receivedAmount: paidVal,
                    taxInclusionType,
                    taxRate: effectiveTaxRate,
                    taxAmount,
                }),
            }
        );

        // Forget active cart cookie
        await forgetOrder();

        // Ensure sale returned to frontend accurately reflects discount & effective total.
        // Pay later is left negative on purpose — that's the amount still owed,
        // not a change to hand back, so it must not be clamped to zero.
        const changeVal = isPayLater
            ? parseFloat((paidVal - effectiveTotal).toFixed(2))
            : Math.max(0, parseFloat((paidVal - effectiveTotal).toFixed(2)));

        const formattedSale: Sale = {
            ...sale,
            subtotal,
            discountAmount,
            taxRate: effectiveTaxRate,
            taxAmount,
            taxInclusionType,
            totalAmount: effectiveTotal,
            paidAmount: paidVal,
            changeAmount: changeVal,
        };

        return Response.json(formattedSale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
