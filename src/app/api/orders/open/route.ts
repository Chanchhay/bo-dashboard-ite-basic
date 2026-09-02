import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrderPage } from "@/lib/api/pos-order";
import { filterOrders, readOrderId } from "@/lib/api/pos-order-backend";

/**
 * Lists the real pending orders for this business, newest first.
 *
 * This is the POS "Orders" tab — where a cashier parks a table or a
 * pay-later customer with "New order" and comes back to it later. A pending
 * order from the web store, Telegram or Messenger is a customer's own order
 * still waiting on payment, not something staff parked here on purpose;
 * mixing the two in made this list a general "everything unpaid" view
 * instead of the till's own parked-orders drawer, so it is scoped to the
 * POS channel.
 */
export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const result = await filterOrders(
            businessId,
            [
                { column: "status", value: "PENDING", operation: "EQUAL" },
                { column: "channel", value: "POS", operation: "EQUAL" },
            ],
            { page: 0, size: 100 },
        );

        // The cart still being rung up at this terminal is also a pending
        // POS order server-side the moment it has a line on it — that is
        // what makes it resume correctly on refresh — but it is not
        // something staff parked, it is the one they are actively working
        // on. Its id is this device's own cookie, not anything recorded on
        // the order itself, so it is excluded by id rather than by any
        // property a genuinely parked order could also have.
        const activeOrderId = await readOrderId();

        // Empty carts are not orders anyone opened, so they are counted out
        // here rather than paged around.
        const content = result.content.filter(
            (order) =>
                order.id !== activeOrderId &&
                order.status === "PENDING" &&
                (order.items.length > 0 || Boolean(order.note?.trim())),
        );

        return Response.json({
            content,
            page: {
                size: result.page.size,
                number: result.page.number,
                totalElements: content.length,
                totalPages: content.length > 0 ? 1 : 0,
            },
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
