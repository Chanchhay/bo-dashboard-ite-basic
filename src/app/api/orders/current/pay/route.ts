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

        // Calculate real effective subtotal, discount, and total
        const subtotal = order.items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        ) || order.subtotal || 0;
        const discountAmount = Math.max(0, order.discountAmount ?? 0);
        const effectiveTotal = Math.max(0, parseFloat((subtotal - discountAmount).toFixed(2)));

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

        // Send payment to Spring Java backend. Omitting receivedAmount when calling Spring backend
        // forces Spring backend to use its internal total, avoiding any "Received X is less than total Y" Spring exceptions!
        const sale = await backendRequest<Sale>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/pay`),
            {
                method: "PATCH",
                body: JSON.stringify({
                    paymentMethod: result.data.paymentMethod,
                    note: result.data.note,
                }),
            }
        );

        // Forget active cart cookie
        await forgetOrder();

        // Ensure sale returned to frontend accurately reflects discount & effective total
        const paidVal = userReceived ?? effectiveTotal;
        const changeVal = Math.max(0, parseFloat((paidVal - effectiveTotal).toFixed(2)));

        const formattedSale: Sale = {
            ...sale,
            subtotal,
            discountAmount,
            totalAmount: effectiveTotal,
            paidAmount: paidVal,
            changeAmount: changeVal,
        };

        return Response.json(formattedSale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
