import { Client, Message } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Notification } from "./api/notification";

export type NotificationCallback = (notification: Notification) => void;

export interface SocketConnectParams {
    token?: string;
    userId?: string;
    receiverId?: string;
}

function getWsConfig(): { brokerURL?: string; webSocketFactory?: () => any } {
    const customUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (customUrl) {
        if (customUrl.startsWith("ws://") || customUrl.startsWith("wss://")) {
            return { brokerURL: customUrl };
        }
        return { webSocketFactory: () => new SockJS(customUrl) };
    }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const cleanBase = apiBase.replace(/\/+$/, "");
    const sockJsUrl = `${cleanBase}/ws/notifications-sockjs`;

    return { webSocketFactory: () => new SockJS(sockJsUrl) };
}

class NotificationSocketService {
    private client: Client | null = null;
    private callbacks: Set<NotificationCallback> = new Set();
    private isConnecting = false;
    private params: SocketConnectParams = {};
    private processedIds = new Set<string>();

    public connect(params?: SocketConnectParams | string): void {
        if (typeof window === "undefined") return;

        if (typeof params === "string") {
            this.params = { token: params };
        } else if (params) {
            this.params = { ...this.params, ...params };
        }

        if (this.client?.active || this.isConnecting) return;

        this.isConnecting = true;
        const wsConfig = getWsConfig();

        this.client = new Client({
            ...wsConfig,
            connectHeaders: this.params.token ? { Authorization: `Bearer ${this.params.token}` } : {},
            debug: (str) => {
                if (process.env.NODE_ENV === "development") {
                    console.log("[NotificationSocket]", str);
                }
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            this.isConnecting = false;
            console.log("[NotificationSocket] Connected successfully");

            // 1. Subscribe to general broadcast notification topic
            this.client?.subscribe("/topic/notifications", (message: Message) => {
                this.handleIncomingMessage(message);
            });

            // 2. Subscribe to user personal notification queue
            this.client?.subscribe("/user/queue/notifications", (message: Message) => {
                this.handleIncomingMessage(message);
            });

            // 3. Subscribe to user personal topic: /topic/notifications/{receiverId}
            if (this.params.receiverId) {
                this.client?.subscribe(`/topic/notifications/${this.params.receiverId}`, (message: Message) => {
                    this.handleIncomingMessage(message);
                });
            }

            // 4. Subscribe to tenant + user topic: /topic/notifications/{userId}/{receiverId}
            if (this.params.userId && this.params.receiverId) {
                this.client?.subscribe(`/topic/notifications/${this.params.userId}/${this.params.receiverId}`, (message: Message) => {
                    this.handleIncomingMessage(message);
                });
            }
        };

        this.client.onStompError = (frame) => {
            this.isConnecting = false;
            console.error("[NotificationSocket] STOMP Error:", frame.headers["message"], frame.body);
        };

        this.client.onWebSocketClose = () => {
            this.isConnecting = false;
        };

        this.client.activate();
    }

    private handleIncomingMessage(message: Message) {
        try {
            const data = JSON.parse(message.body);
            const id = String(data.id || data.notificationId || Date.now());

            if (this.processedIds.has(id)) {
                return;
            }
            this.processedIds.add(id);

            if (this.processedIds.size > 200) {
                const firstKey = this.processedIds.values().next().value;
                if (firstKey) this.processedIds.delete(firstKey);
            }

            const notification: Notification = {
                id,
                notificationId: data.notificationId ?? null,
                senderId: data.senderId ?? null,
                senderName: data.senderName ?? null,
                type: data.type ?? "GENERAL",
                title: data.title || "New Notification",
                content: data.content || data.message || "",
                deepLink: data.deepLink ?? null,
                read: Boolean(data.read),
                readAt: data.readAt ?? null,
                deliveredAt: data.deliveredAt ?? null,
                createdAt: data.createdAt || new Date().toISOString(),
            };

            this.callbacks.forEach((cb) => {
                try {
                    cb(notification);
                } catch (e) {
                    console.error("[NotificationSocket] Callback error:", e);
                }
            });
        } catch (err) {
            console.error("[NotificationSocket] Failed to parse message:", err);
        }
    }

    public subscribe(callback: NotificationCallback, params?: SocketConnectParams): () => void {
        this.callbacks.add(callback);
        if (params) {
            this.params = { ...this.params, ...params };
        }
        if (!this.client?.active && !this.isConnecting) {
            this.connect(this.params);
        }

        return () => {
            this.callbacks.delete(callback);
            if (this.callbacks.size === 0) {
                this.disconnect();
            }
        };
    }

    public disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.isConnecting = false;
            console.log("[NotificationSocket] Disconnected");
        }
    }
}

export const notificationSocket = new NotificationSocketService();
