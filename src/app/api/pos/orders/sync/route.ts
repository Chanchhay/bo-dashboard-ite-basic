import { NextResponse } from "next/server";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { backendRequest } from "@/lib/api/backend";
import { ordersPath } from "@/lib/api/pos-order-backend";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Accept { orders: [...] }, array [...], or single order object
    const ordersToSync = Array.isArray(body?.orders)
      ? body.orders
      : Array.isArray(body)
      ? body
      : body && body.uuid
      ? [body]
      : [];

    if (ordersToSync.length === 0) {
      return NextResponse.json(
        { error: "Invalid offline order payload: no valid orders found" },
        { status: 400 }
      );
    }

    // No fallback business. Posting a shift's takings to whichever business
    // happens to be "1" is worse than refusing: the till keeps its queue and
    // retries, and nothing lands in a stranger's ledger.
    const businessId = await getCurrentBusinessId();

    /*
     * Named exactly as the backend's OfflineOrderDto declares them.
     *
     * That DTO annotates its fields `@JsonProperty("unit_price")`,
     * `@JsonProperty("variant_id")` and so on, and the service configures no
     * snake_case naming strategy — so Jackson matches those strings and
     * nothing else. A key sent as `unitPrice` is not renamed, it is ignored,
     * and the field arrives null: a sale whose lines are all priced at zero
     * while its total is right, which is exactly what the offline receipts
     * were showing.
     *
     * Both casings are accepted coming in, because the queue has been written
     * by more than one version of the till. Only the DTO's own names go out.
     */
    const num = (...values: unknown[]) => {
        for (const value of values) {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string" && value.trim() !== "") {
                const parsed = parseFloat(value);
                if (Number.isFinite(parsed)) return parsed;
            }
        }
        return 0;
    };

    const formattedOrders = ordersToSync.map((o: any) => ({
        uuid: o.uuid || o.order_number || o.id,
        channel: o.channel || "POS",
        status: o.status || "PAID",
        subtotal: num(o.subtotal),
        discount_amount: num(o.discountAmount, o.discount_amount),
        // The total already includes tax; without the breakdown the recorded
        // sale cannot show a VAT line and its parts do not add up to it.
        tax_rate: o.taxRate ?? o.tax_rate ?? null,
        tax_amount: o.taxAmount ?? o.tax_amount ?? null,
        tax_inclusion_type: o.taxInclusionType ?? o.tax_inclusion_type ?? null,
        total: num(o.total),
        // What was handed over and what came back — only the till saw it, and
        // a sale recorded without them claims the exact money was tendered.
        paid_amount: o.paidAmount ?? o.paid_amount ?? null,
        change_amount: o.changeAmount ?? o.change_amount ?? null,
        payment_method: o.paymentMethod || o.payment_method || "CASH",
        // When the sale was taken, not when the connection came back. An
        // order dated at sync time lands in the wrong day's takings.
        created_at: o.createdAt || o.created_at || new Date().toISOString(),
        items: (o.items || []).map((i: any) => ({
            product_id: i.productId || i.product_id,
            // A sale of an option that arrives without one reconciles against
            // the base item, so the option's own stock never moves.
            variant_id: i.variantId || i.variant_id || null,
            // A pack is not one of anything: without the unit the backend
            // takes a single base unit off the shelf for a case of twelve.
            unit_id: i.unitId || i.unit_id || null,
            // The extras are stock too.
            add_on_ids: i.addOnIds || i.add_on_ids || [],
            quantity: i.quantity || 1,
            unit_price: num(i.unitPrice, i.unit_price),
            subtotal: num(i.subtotal),
        })),
    }));

    let backendResult: any = null;
    // Forward sync payload to Spring Boot Backend API (/api/v1/businesses/{businessId}/orders/sync)
    //
    // A failure here is reported as one. The till deletes an order from its
    // own queue on the strength of this response, so answering "synced" when
    // the backend refused destroys the only record of a sale that was taken
    // in cash. Left queued, it is retried until it lands.
    try {
      backendResult = await backendRequest(ordersPath(businessId, "/sync"), {
        method: "POST",
        body: JSON.stringify({ orders: formattedOrders }),
      });
    } catch (err) {
      console.error("[POS Sync API] Backend refused the offline orders:", err);

      return NextResponse.json(
        {
          error: "The server did not accept these offline sales.",
          detail: err instanceof Error ? err.message : undefined,
          queued: formattedOrders.length,
        },
        { status: 502 }
      );
    }

    // No list back means the backend took the lot; a list means it took those.
    const syncedUuids: string[] =
      Array.isArray(backendResult?.syncedUuids) && backendResult.syncedUuids.length > 0
        ? backendResult.syncedUuids
        : formattedOrders.map((o: any) => o.uuid).filter(Boolean);

    /*
     * The backend holds these now, so nothing is kept here.
     *
     * A copy used to be stashed in this server's memory and merged into the
     * orders list, from a time when the sync could not be relied on. Since a
     * refusal is reported as one, this code is only ever reached after the
     * backend accepted the sale — so the copy could only ever be a second row
     * for the same sale, priced at zero because it read the line fields under
     * names this route does not use.
     */
    for (const order of formattedOrders) {
      if (order?.uuid && syncedUuids.includes(order.uuid)) {
        console.log(
          `[POS Sync API] Synced offline order ${order.uuid} (total: ${order.total})`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully synced ${syncedUuids.length} offline order(s)`,
        syncedUuids,
        syncedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POS Sync API] Error syncing order:", error);
    return NextResponse.json(
      { error: "Failed to process offline order sync" },
      { status: 500 }
    );
  }
}
