import { useEffect, useRef } from "react";
import type { PosOrder, Sale } from "@/lib/api/pos-order";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { usePublishCustomerDisplayMutation } from "@/services/customerDisplayApi";
import type {
  CustomerDisplayItem,
  CustomerDisplayPayload,
  CustomerDisplayStatus,
} from "@/types/customer-display";

export interface CustomerDisplaySyncOptions {
  businessId?: string;
  terminalId?: string;
  order?: PosOrder | null;
  sale?: Sale | null;
  statusOverride?: CustomerDisplayStatus;
  qrCodeUrl?: string | null;
}

const CUSTOMER_DISPLAY_CHANNEL = "ipos_customer_display";

export function useCustomerDisplaySync({
  businessId,
  terminalId = "term_default",
  order,
  sale,
  statusOverride,
  qrCodeUrl,
}: CustomerDisplaySyncOptions) {
  const { data: business } = useGetBusinessProfileQuery();
  const [publishCustomerDisplay] = usePublishCustomerDisplayMutation();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadKeyRef = useRef<string>("");
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Maintain long-lived BroadcastChannel instance for maximum performance
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
        channelRef.current.onmessage = (event: MessageEvent) => {
          if (
            event.data &&
            typeof event.data === "object" &&
            event.data.type === "REQUEST_CUSTOMER_DISPLAY_SYNC"
          ) {
            lastPayloadKeyRef.current = "";
          }
        };
      }
    } catch {}

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Build Payload
    const items: CustomerDisplayItem[] = (order?.items || []).map((item) => ({
      id: item.id,
      itemId: item.itemId,
      name: item.itemName,
      variantName: item.variantName ?? null,
      unitName: item.unitName ?? null,
      unitFactor: item.unitFactor ?? null,
      addOns: (item.addOns || []).map((addOn) => ({ name: addOn.name })),
      quantity: item.quantity,
      freeQuantity: item.freeQuantity ?? 0,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
    }));

    const computedStatus: CustomerDisplayStatus =
      statusOverride || (items.length > 0 ? "CART_UPDATED" : "IDLE");

    // Signed by what is on the lines, not just how many: swapping a can for a
    // six pack can leave the count and the total untouched while changing what
    // the customer is looking at.
    const linesKey = items
      .map((item) => `${item.id}#${item.quantity}@${item.unitPrice}`)
      .join(",");
    const payloadKey = `${terminalId}:${computedStatus}:${order?.id || ""}:${sale?.id || ""}:${order?.total || 0}:${linesKey}:${qrCodeUrl || ""}`;
    if (lastPayloadKeyRef.current === payloadKey) {
      return;
    }
    lastPayloadKeyRef.current = payloadKey;

    const subtotal = sale?.subtotal ?? order?.subtotal ?? 0;
    const discountAmount = sale?.discountAmount ?? order?.discountAmount ?? 0;
    const discountLabel = sale?.discountLabel ?? order?.discountLabel ?? null;

    // Tax was already computed server-side when the order was created —
    // read directly rather than re-derived, so the customer-facing screen
    // never shows a different number than the receipt will.
    const computedTax = sale?.taxAmount ?? order?.taxAmount ?? 0;
    const taxRate = sale?.taxRate ?? order?.taxRate ?? 0;
    const taxInclusionType = sale?.taxInclusionType ?? order?.taxInclusionType ?? null;

    const payload: CustomerDisplayPayload = {
      terminalId,
      businessId: businessId || business?.id,
      businessName: business?.name || "IPOS Store",
      businessLogo: business?.logo || null,
      businessThumbnail: business?.thumbnail || null,
      status: computedStatus,
      items,
      subtotal,
      discountAmount,
      discountLabel,
      tax: Math.max(0, computedTax),
      taxRate,
      taxInclusionType,
      total: sale?.totalAmount ?? order?.total ?? Math.max(0, subtotal - discountAmount + computedTax),
      currency: sale?.currency ?? order?.currency ?? null,
      invoiceNumber: sale?.invoiceNumber || order?.invoiceNumber || null,
      qrCodeUrl: qrCodeUrl ?? null,
      paymentMethod: sale?.paymentMethod ?? null,
      paidAmount: sale?.paidAmount ?? null,
      changeAmount: sale?.changeAmount ?? null,
      updatedAt: new Date().toISOString(),
    };

    // Non-blocking local broadcast & storage (0ms UI thread impact)
    setTimeout(() => {
      try {
        const jsonStr = JSON.stringify(payload);
        localStorage.setItem(`ipos_customer_display_${terminalId}`, jsonStr);
        localStorage.setItem("ipos_customer_display_latest", jsonStr);
      } catch {}

      if (channelRef.current) {
        try {
          channelRef.current.postMessage(payload);
        } catch {}
      }
    }, 0);

    // Remote Publish to Backend API (Debounced 200ms for standalone screens)
    const activeBusinessId = businessId || business?.id;
    if (!activeBusinessId) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      publishCustomerDisplay({
        businessId: activeBusinessId,
        terminalId,
        payload,
      }).catch(() => {});
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    businessId,
    business?.id,
    business?.name,
    business?.logo,
    business?.thumbnail,
    terminalId,
    order?.id,
    order?.total,
    order?.subtotal,
    order?.discountAmount,
    order?.discountLabel,
    order?.items,
    statusOverride,
    qrCodeUrl,
    publishCustomerDisplay,
  ]);
}
