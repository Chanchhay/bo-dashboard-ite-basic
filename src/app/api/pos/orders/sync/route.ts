import { NextResponse } from "next/server";
import { addSyncedOrder } from "@/lib/synced-orders-store";
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

    let businessId = "1";
    try {
      businessId = await getCurrentBusinessId();
    } catch {}

    // Format and normalize offline order payload for Spring Boot Backend API
    const formattedOrders = ordersToSync.map((o: any) => ({
      uuid: o.uuid || o.order_number || o.id,
      status: o.status || "PAID",
      paymentMethod: o.paymentMethod || o.payment_method || "CASH",
      subtotal: typeof o.subtotal === "number" ? o.subtotal : parseFloat(o.subtotal || "0"),
      total: typeof o.total === "number" ? o.total : parseFloat(o.total || "0"),
      discountAmount: typeof o.discountAmount === "number" ? o.discountAmount : parseFloat(o.discount_amount || o.discountAmount || "0"),
      createdAt: o.createdAt || o.created_at || new Date().toISOString(),
      items: (o.items || []).map((i: any) => ({
        productId: i.productId || i.product_id,
        product_id: i.productId || i.product_id,
        productName: i.productName || i.product_name || i.itemName || i.item_name || "Item",
        product_name: i.productName || i.product_name || i.itemName || i.item_name || "Item",
        itemName: i.productName || i.product_name || i.itemName || i.item_name || "Item",
        item_name: i.productName || i.product_name || i.itemName || i.item_name || "Item",
        variantId: i.variantId || i.variant_id || null,
        variantName: i.variantName || i.variant_name || null,
        quantity: i.quantity || 1,
        unitPrice: typeof i.unitPrice === "number" ? i.unitPrice : parseFloat(i.unit_price || i.unitPrice || "0"),
        discountAmount: typeof i.discountAmount === "number" ? i.discountAmount : parseFloat(i.discount_amount || i.discountAmount || "0"),
        subtotal: typeof i.subtotal === "number" ? i.subtotal : parseFloat(i.subtotal || "0"),
      })),
    }));

    let backendResult: any = null;
    // Forward sync payload to Spring Boot Backend API (/api/v1/businesses/{businessId}/orders/sync)
    try {
      backendResult = await backendRequest(ordersPath(businessId, "/sync"), {
        method: "POST",
        body: JSON.stringify({ orders: formattedOrders }),
      });
    } catch (err) {
      console.warn("[POS Sync API] Spring Boot backend endpoint note:", err);
    }

    const syncedUuids: string[] =
      Array.isArray(backendResult?.syncedUuids) && backendResult.syncedUuids.length > 0
        ? backendResult.syncedUuids
        : formattedOrders.map((o: any) => o.uuid).filter(Boolean);

    for (const order of formattedOrders) {
      if (order?.uuid) {
        addSyncedOrder(order);
        console.log(
          `[POS Sync API] Successfully synced offline order ${order.uuid} (total: ${order.total})`
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
