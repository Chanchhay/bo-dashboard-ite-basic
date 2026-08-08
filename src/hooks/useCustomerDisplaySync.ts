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

  // Listen for sync request from newly opened Customer Display windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (
          event.data &&
          typeof event.data === "object" &&
          event.data.type === "REQUEST_CUSTOMER_DISPLAY_SYNC"
        ) {
          // Force resync on next effect run
          lastPayloadKeyRef.current = "";
        }
      };
    } catch {
      // Channel unsupported
    }

    return () => {
      if (channel) {
        channel.close();
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

    // 2. Broadcast Local (0ms latency for dual monitor setups on same PC)
    try {
      const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // BroadcastChannel might fail in unsupported browsers / restricted environments
    }

    // 3. Remote Publish to Backend API (Debounced 200ms for standalone screens)
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
      }).catch((err) => {
        console.warn("[CustomerDisplaySync] Publish error:", err);
      });
    }, 200);

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
