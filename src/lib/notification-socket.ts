import { Client, Message, StompSubscription } from "@stomp/stompjs";
import type { Notification } from "./api/notification";
import { fetchSessionContext } from "./auth/session-context";

export type NotificationCallback = (notification: Notification) => void;

export interface SocketConnectParams {
    token?: string;
    userId?: string;
    receiverId?: string;
}

function fetchCredentials(force = false) {
    return fetchSessionContext(force ? { force: true } : undefined);
}

class NotificationSocketService {
    private client: Client | null = null;
    private callbacks: Set<NotificationCallback> = new Set();
    private isConnecting = false;
    private params: SocketConnectParams = {};
    private processedIds = new Set<string>();
    private subscriptions = new Map<string, StompSubscription>();
    private subject: string | null = null;

    private subscribeTopics(): void {
        if (!this.client?.connected) return;

        const topicsToSubscribe = [
            "/topic/notifications",
            "/user/queue/notifications",
        ];

        const receivers = new Set(
            [this.subject, this.params.receiverId, this.params.userId].filter(
                (value): value is string => Boolean(value),
            ),
        );

        for (const receiver of receivers) {
            topicsToSubscribe.push(`/topic/notifications/${receiver}`);
        }

        for (const receiver of receivers) {
            for (const sender of receivers) {
                topicsToSubscribe.push(
                    `/topic/notifications/${sender}/${receiver}`,
                );
            }
        }

        for (const topic of topicsToSubscribe) {
            if (this.subscriptions.has(topic)) continue;

            this.subscriptions.set(
                topic,
                this.client.subscribe(topic, (message: Message) => {
                    this.handleIncomingMessage(message);
                }),
            );
        }
    }

    public connect(params?: SocketConnectParams | string): void {
        if (typeof window === "undefined") return;

        if (typeof params === "string") {
            this.params = { ...this.params, token: params };
        } else if (params) {
            this.params = { ...this.params, ...params };
        }

        if (this.client?.active) {
            if (this.client.connected) {
                this.subscribeTopics();
            }
            return;
        }

        if (this.isConnecting) return;

        this.isConnecting = true;
        void this.openClient();
    }

    private async openClient(): Promise<void> {
        const credentials = await fetchCredentials();

        if (!this.isConnecting) return;

        if (credentials?.subject) {
            this.subject = credentials.subject;
        }

        if (!credentials?.wsUrl) {
            this.isConnecting = false;
            console.warn(
                "[NotificationSocket] No socket URL configured; realtime disabled.",
            );
            return;
        }

        const client = new Client({
            brokerURL: credentials.wsUrl,
            debug: (str: string) => {
                if (process.env.NODE_ENV === "development") {
                    console.log("[NotificationSocket]", str);
                }
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.beforeConnect = async () => {
            const fresh = await fetchCredentials(true);
            const token = fresh?.accessToken ?? this.params.token;

            if (fresh?.subject) {
                this.subject = fresh.subject;
            }

            client.connectHeaders = token
                ? { Authorization: `Bearer ${token}` }
                : {};
        };

        client.connectHeaders = credentials?.accessToken
            ? { Authorization: `Bearer ${credentials.accessToken}` }
            : {};

        client.onConnect = () => {
            this.isConnecting = false;
            this.subscriptions.clear();
            this.subscribeTopics();
        };

        client.onStompError = (frame) => {
            this.isConnecting = false;
            console.error(
                "[NotificationSocket] STOMP Error:",
                frame.headers["message"],
                frame.body,
            );
        };

        client.onWebSocketClose = () => {
            this.isConnecting = false;
            this.subscriptions.clear();
        };

        this.client = client;
        client.activate();
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

    public subscribe(
        callback: NotificationCallback,
        params?: SocketConnectParams,
    ): () => void {
        this.callbacks.add(callback);
        if (params) {
            this.params = { ...this.params, ...params };
        }

        if (!this.client?.active && !this.isConnecting) {
            this.connect(this.params);
        } else if (this.client?.connected) {
            this.subscribeTopics();
        }

        return () => {
            this.callbacks.delete(callback);
        };
    }

    public disconnect(): void {
        const client = this.client;
        if (!client) return;

        this.client = null;
        this.isConnecting = false;
        this.subscriptions.clear();
        this.subject = null;
        this.processedIds.clear();

        void client.deactivate();
    }
}

export const notificationSocket = new NotificationSocketService();
