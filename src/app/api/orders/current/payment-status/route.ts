import {
    BackendApiError,
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PaymentStatus, PosOrder, Sale } from "@/lib/api/pos-order";
import {
    forgetOrder,
    ordersPath,
    readOrderId,
} from "@/lib/api/pos-order-backend";

/**
 * Whether the customer has paid yet. Polled while the code is on screen.
 *
 * Bakong settles the order itself, so once it reports paid there is no sale to
 * create here — only one to report. `SaleResponse` is returned exclusively by
 * the pay endpoint, which cannot be called on an order that is already paid,
 * so the sale is rebuilt from the order it settled. That is exact for digital:
 * the amount tendered is the total and there is never change.
 */
export async function GET() {
    const orderId = await readOrderId();

    if (!orderId) {
        return Response.json(
            { message: "There is no open order." },
            { status: 409 },
        );
    }

    try {
        const businessId = await getCurrentBusinessId();
        const encoded = encodeURIComponent(orderId);

        const status = await backendRequest<PaymentStatus>(
            ordersPath(businessId, `/${encoded}/payment-status`),
        );

        if (!status.paid) {
            return Response.json({ status, sale: null });
        }

        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encoded}`),
        );

        const sale: Sale = {
            id: order.id,
            orderId: order.id,
            invoiceNumber: order.invoiceNumber,
            cashierId: null,
            channel: order.channel,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            totalAmount: order.total,
            paidAmount: order.total,
            changeAmount: 0,
            currency: order.currency,
            paymentMethod: "DIGITAL",
            itemCount: order.items.reduce(
                (count, line) => count + line.quantity,
                0,
            ),
            note: order.note,
            soldAt: status.paidAt,
        };

        // Settled, so this is no longer the cart.
        await forgetOrder();

        return Response.json({ status, sale });
    } catch (error) {
        // No code has been generated for this order yet — a normal state while
        // the cashier is still choosing how to take payment.
        if (error instanceof BackendApiError && error.status === 404) {
            return Response.json({ status: null, sale: null });
        }

        return backendErrorResponse(error);
    }
}
