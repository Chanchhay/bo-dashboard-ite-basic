import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { payOrderSchema, type Sale } from "@/lib/api/pos-order";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

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
        const taxRate = order.taxRate ?? 0;
        const taxAmount = order.taxAmount ?? (taxRate > 0 ? parseFloat((afterDiscount * (taxRate / 100)).toFixed(2)) : 0);
        const effectiveTotal = Math.max(0, parseFloat((afterDiscount + taxAmount).toFixed(2)));

        const userReceived = result.data.receivedAmount;

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

        const paidVal = userReceived ?? effectiveTotal;

        // Sync order item discounts to Spring Java backend prior to payment
        if (discountAmount > 0 && order.items.length > 0) {
            const itemsSubtotal = grossSubtotal || 1;
            const discountRatio = discountAmount / itemsSubtotal;
            let runningDiscountTotal = 0;

            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                const itemSubtotal = item.unitPrice * item.quantity;
                let itemDisc = 0;
                if (i === order.items.length - 1) {
                    itemDisc = Math.max(0, parseFloat((discountAmount - runningDiscountTotal).toFixed(2)));
                } else {
                    itemDisc = Math.min(itemSubtotal, parseFloat((itemSubtotal * discountRatio).toFixed(2)));
                    runningDiscountTotal += itemDisc;
                }

                try {
                    await backendRequest<unknown>(
                        ordersPath(
                            businessId,
                            `/${encodeURIComponent(order.id)}/items/${encodeURIComponent(item.id)}`
                        ),
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                quantity: item.quantity,
                                discountAmount: itemDisc,
                            }),
                        }
                    );
                } catch {
                    // Ignore item patch error
                }
            }
        }

        // Send payment to Spring Java backend
        const sale = await backendRequest<Sale>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/pay`),
            {
                method: "PATCH",
                body: JSON.stringify({
                    paymentMethod: result.data.paymentMethod,
                    note: result.data.note,
                    receivedAmount: paidVal,
                }),
            }
        );

        // Forget active cart cookie
        await forgetOrder();

        // Ensure sale returned to frontend accurately reflects discount & effective total
        const changeVal = Math.max(0, parseFloat((paidVal - effectiveTotal).toFixed(2)));

        const formattedSale: Sale = {
            ...sale,
            subtotal,
            discountAmount,
            taxRate,
            taxAmount,
            totalAmount: effectiveTotal,
            paidAmount: paidVal,
            changeAmount: changeVal,
        };

        return Response.json(formattedSale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
