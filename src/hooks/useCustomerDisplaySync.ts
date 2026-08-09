import { useEffect, useRef } from "react";
import type { PosOrder } from "@/lib/api/pos-order";
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
  statusOverride?: CustomerDisplayStatus;
  qrCodeUrl?: string | null;
}

const CUSTOMER_DISPLAY_CHANNEL = "ipos_customer_display";

export function useCustomerDisplaySync({
  businessId,
  terminalId = "term_default",
  order,
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
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
    }));

    const computedStatus: CustomerDisplayStatus =
      statusOverride || (items.length > 0 ? "CART_UPDATED" : "IDLE");

    const payloadKey = `${terminalId}:${computedStatus}:${order?.id || ""}:${order?.total || 0}:${items.length}:${qrCodeUrl || ""}`;
    if (lastPayloadKeyRef.current === payloadKey) {
      return;
    }
    lastPayloadKeyRef.current = payloadKey;

    const payload: CustomerDisplayPayload = {
      terminalId,
      businessId: businessId || business?.id,
      businessName: business?.name || "IPOS Store",
      businessLogo: business?.logo || null,
      businessThumbnail: business?.thumbnail || null,
      status: computedStatus,
      items,
      subtotal: order?.subtotal ?? 0,
      discountAmount: order?.discountAmount ?? 0,
      tax: 0,
      total: order?.total ?? 0,
      currency: order?.currency ?? "USD",
      invoiceNumber: order?.invoiceNumber ?? null,
      qrCodeUrl: qrCodeUrl ?? null,
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
    order?.items,
    statusOverride,
    qrCodeUrl,
    publishCustomerDisplay,
  ]);
}
