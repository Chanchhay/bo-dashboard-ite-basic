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

export const dynamic = "force-dynamic";
export const revalidate = 0;


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

    
        let paymentStatus: PaymentStatus | null = null;
        try {
            paymentStatus = await backendRequest<PaymentStatus>(
                ordersPath(businessId, `/${encoded}/payment-status`),
            );
        } catch (statusError) {
            if (
                statusError instanceof BackendApiError &&
                statusError.status === 404
            ) {
                paymentStatus = null;
            } else {
               
                console.error(
                    "payment-status: backend payment-status check failed",
                    statusError,
                );
                throw statusError;
            }
        }

   
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encoded}`),
        );

        const isPaid =
            Boolean(paymentStatus?.paid) ||
            paymentStatus?.orderStatus === "PAID" ||
            paymentStatus?.qrStatus === "PAID" ||
            (paymentStatus as any)?.status === "PAID" ||
            (paymentStatus as any)?.paymentStatus === "PAID" ||
            (paymentStatus as any)?.paymentStatus === "SUCCESS" ||
            order?.status === "PAID";

        if (!isPaid || !order) {
            return Response.json(
                { status: paymentStatus, sale: null },
                {
                    headers: {
                        "Cache-Control": "no-store, no-cache, must-revalidate",
                    },
                },
            );
        }

        const sale: Sale = {
            id: order.id,
            orderId: order.id,
            invoiceNumber: order.invoiceNumber,
            cashierId: null,
            customerId: order.customerId,
            customerName: null,
            customerPhone: null,
            customerEmail: null,
            channel: order.channel,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            totalAmount: order.total,
            paidAmount: order.total,
            changeAmount: 0,
            currency: order.currency,
            displayCurrency: order.displayCurrency,
            displayExchangeRate: order.displayExchangeRate,
            paymentMethod: "DIGITAL",
            itemCount: (order.items || []).reduce(
                (count, line) => count + line.quantity,
                0,
            ),
            note: order.note,
            soldAt: paymentStatus?.paidAt || new Date().toISOString(),
        };

        // Settled, so this is no longer the cart.
        await forgetOrder();

        return Response.json(
            { status: paymentStatus || { paid: true }, sale },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        if (error instanceof BackendApiError && error.status === 404) {
            return Response.json({ status: null, sale: null });
        }

        console.error("payment-status: request failed", error);
        return backendErrorResponse(error);
    }
}