import { NextResponse } from "next/server";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { RequestBodyError, backendRequest, readJsonBody } from "@/lib/api/backend";
import { ordersPath } from "@/lib/api/pos-order-backend";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const record =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;

    const ordersToSync: unknown[] = Array.isArray(record?.orders)
      ? record.orders
      : Array.isArray(body)
      ? body
      : record?.uuid
      ? [record]
      : [];

    if (ordersToSync.length === 0) {
      return NextResponse.json(
        { error: "Invalid offline order payload: no valid orders found" },
        { status: 400 }
      );
    }

    const businessId = await getCurrentBusinessId();

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
        tax_rate: o.taxRate ?? o.tax_rate ?? null,
        tax_amount: o.taxAmount ?? o.tax_amount ?? null,
        tax_inclusion_type: o.taxInclusionType ?? o.tax_inclusion_type ?? null,
        total: num(o.total),
        paid_amount: o.paidAmount ?? o.paid_amount ?? null,
        change_amount: o.changeAmount ?? o.change_amount ?? null,
        payment_method: o.paymentMethod || o.payment_method || "CASH",
        created_at: o.createdAt || o.created_at || new Date().toISOString(),
        items: (o.items || []).map((i: any) => ({
            product_id: i.productId || i.product_id,
            variant_id: i.variantId || i.variant_id || null,
            unit_id: i.unitId || i.unit_id || null,
            add_on_ids: i.addOnIds || i.add_on_ids || [],
            quantity: i.quantity || 1,
            unit_price: num(i.unitPrice, i.unit_price),
            subtotal: num(i.subtotal),
        })),
    }));

    let backendResult: any = null;
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

    const syncedUuids: string[] =
      Array.isArray(backendResult?.syncedUuids) && backendResult.syncedUuids.length > 0
        ? backendResult.syncedUuids
        : formattedOrders.map((o: any) => o.uuid).filter(Boolean);

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
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[POS Sync API] Error syncing order:", error);
    return NextResponse.json(
      { error: "Failed to process offline order sync" },
      { status: 500 }
    );
  }
}
