import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { payOrderSchema, type Sale } from "@/lib/api/pos-order";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

/**
 * Settles the sale.
 *
 * This used to re-patch the discount here too — a second, independent copy
 * of the sync `cart-sync.ts` already does before payment, with its own
 * silent `catch {}` around a failed patch. That duplicate could fail
 * quietly and leave `order.total` at the undiscounted price fetched a
 * moment earlier, which is exactly what made a correctly-discounted cash
 * amount from the till read as short here. The order fetched below is
 * already the one `flushCart()` pushed the discount onto before payment was
 * ever allowed to start (see `order-table.tsx`); trusting `order.total`
 * outright, rather than re-deriving it, is what keeps this route from being
 * a second, weaker copy of that guarantee.
 */
export async function POST(request: Request) {
    try {
        const result = payOrderSchema.safeParse(await readJsonBody(request));

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

        const effectiveTotal = Math.max(0, order.total ?? subtotal);

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

        // Send payment to Spring Java backend. Tax is not sent — the backend
        // already applied the business's configured rate when the order was
        // created, and settling just charges whatever order.total says.
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
            paidAmount: paidVal,
            changeAmount: changeVal,
        };

        return Response.json(formattedSale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
