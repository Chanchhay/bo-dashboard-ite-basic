import { useEffect, useState } from "react";
import { Client, Message } from "@stomp/stompjs";
import { fetchSessionContext } from "@/lib/auth/session-context";
import type { CustomerDisplayPayload } from "@/types/customer-display";

const CUSTOMER_DISPLAY_CHANNEL = "ipos_customer_display";

export function useCustomerDisplayListener(
  terminalId: string = "term_default",
  businessId?: string
) {
  const [data, setData] = useState<CustomerDisplayPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 0. Read cached payload from localStorage immediately (0ms initial state when opened after items added)
    try {
      const stored =
        localStorage.getItem(`ipos_customer_display_${terminalId}`) ||
        localStorage.getItem("ipos_customer_display_latest");
      if (stored) {
        const parsed = JSON.parse(stored) as CustomerDisplayPayload;
        if (parsed && parsed.status) {
          setData(parsed);
        }
      }
    } catch {}

    // 1. Local BroadcastChannel Listener (Instant 0ms sync)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.onmessage = (event: MessageEvent<CustomerDisplayPayload>) => {
        if (event.data && typeof event.data === "object" && event.data.status) {
          if (!terminalId || event.data.terminalId === terminalId) {
            setData(event.data);
            try {
              localStorage.setItem(`ipos_customer_display_${terminalId}`, JSON.stringify(event.data));
            } catch {}
          }
        }
      };

      // Request immediate sync from active POS tab when display opens
      channel.postMessage({ type: "REQUEST_CUSTOMER_DISPLAY_SYNC", terminalId });
    } catch {
      // BroadcastChannel not available
    }

    // 2. STOMP WebSocket Listener for Remote Display Screens
    let stompClient: Client | null = null;

    async function initSocket() {
      try {
        const credentials = await fetchSessionContext();
        if (!credentials?.wsUrl) return;

        const client = new Client({
          brokerURL: credentials.wsUrl,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectHeaders: credentials.accessToken
            ? { Authorization: `Bearer ${credentials.accessToken}` }
            : {},
        });

        client.onConnect = () => {
          const topicsToSubscribe = [
            `/topic/customer-display/${terminalId}`,
            ...(businessId ? [`/topic/customer-display/${businessId}/${terminalId}`] : []),
          ];

          topicsToSubscribe.forEach((topic) => {
            client.subscribe(topic, (message: Message) => {
              try {
                const parsed = JSON.parse(message.body) as CustomerDisplayPayload;
                if (parsed) {
                  setData(parsed);
                }
              } catch (err) {
                console.error("[CustomerDisplayListener] Parse error:", err);
              }
            });
          });
        };

        client.activate();
        stompClient = client;
      } catch (err) {
        console.warn("[CustomerDisplayListener] Socket setup error:", err);
      }
    }

    void initSocket();

    return () => {
      if (channel) {
        channel.close();
      }
      if (stompClient) {
        void stompClient.deactivate();
      }
    };
  }, [terminalId, businessId]);

  return data;
}
