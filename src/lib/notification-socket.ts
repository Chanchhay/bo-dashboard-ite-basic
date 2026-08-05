import { Client, Message, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Notification } from "./api/notification";

export type NotificationCallback = (notification: Notification) => void;

export interface SocketConnectParams {
    token?: string;
    userId?: string;
    receiverId?: string;
}

type WsCredentials = { accessToken: string; subject: string | null };

/*
 * Resolved once per connect (and again on every reconnect, since the token
 * expires). Returns null when the user is not signed in — the caller still
 * connects, it just won't get user-routed messages.
 */
async function fetchCredentials(): Promise<WsCredentials | null> {
    try {
        const response = await fetch("/api/notification/ws-token", {
            cache: "no-store",
        });

        if (!response.ok) return null;

        return (await response.json()) as WsCredentials;
    } catch {
        return null;
    }
}

function getWsConfig(): { brokerURL?: string; webSocketFactory?: () => any } {
    /*
     * NEXT_PUBLIC_WS_URL is the configured answer and is honoured everywhere,
     * localhost included. It used to be overridden by a hardcoded
     * http://localhost:8080 whenever the page was served from localhost, so a
     * dev pointing at a deployed backend silently got no realtime at all.
     */
    const customUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

    if (customUrl) {
        if (customUrl.startsWith("ws://") || customUrl.startsWith("wss://")) {
            return { brokerURL: customUrl };
        }
        return { webSocketFactory: () => new SockJS(customUrl) };
    }

    const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080";
    const cleanBase = apiBase.replace(/\/+$/, "");

    return {
        webSocketFactory: () =>
            new SockJS(`${cleanBase}/ws/notifications-sockjs`),
    };
}

class NotificationSocketService {
    private client: Client | null = null;
    private callbacks: Set<NotificationCallback> = new Set();
    private isConnecting = false;
    private params: SocketConnectParams = {};
    private processedIds = new Set<string>();
    /** Live STOMP subscriptions by destination, so re-subscribing is idempotent. */
    private subscriptions = new Map<string, StompSubscription>();
    /** Keycloak subject for the signed-in user; the backend's notion of "who". */
    private subject: string | null = null;

    private subscribeTopics(): void {
        if (!this.client?.connected) return;

        /*
         * `/user/queue/notifications` is the one that matters for per-receiver
         * alerts (low stock, completed sale): Spring rewrites it per Principal,
         * so it only ever delivers once the CONNECT frame carried a token.
         */
        const topicsToSubscribe = [
            "/topic/notifications",
            "/user/queue/notifications",
        ];

        /*
         * The backend addresses users by Keycloak subject. Better Auth's local
         * `user.id` is a different value, so subscribe to both rather than
         * betting on which one callers passed in.
         */
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
            // Already up (or coming up); just widen the subscriptions.
            if (this.client.connected) {
                this.subscribeTopics();
            }
            return;
        }

        if (this.isConnecting) return;

        this.isConnecting = true;
        const wsConfig = getWsConfig();

        const client = new Client({
            ...wsConfig,
            debug: (str: string) => {
                if (process.env.NODE_ENV === "development") {
                    console.log("[NotificationSocket]", str);
                }
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        /*
         * Runs before the initial CONNECT and before every reconnect, which is
         * what makes this survive token expiry: each attempt gets a freshly
         * minted token rather than the one captured at page load.
         */
        client.beforeConnect = async () => {
            const credentials = await fetchCredentials();
            const token = credentials?.accessToken ?? this.params.token;

            if (credentials?.subject) {
                this.subject = credentials.subject;
            }

            client.connectHeaders = token
                ? { Authorization: `Bearer ${token}` }
                : {};
        };

        client.onConnect = () => {
            this.isConnecting = false;
            // The old client's subscriptions died with the socket.
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
            /*
             * Deliberately does NOT disconnect when the last listener leaves.
             * The two listeners are an RTK Query cache entry and the toast
             * listener, both of which churn on navigation and (in dev) on
             * StrictMode's double-mount — tearing the socket down there meant
             * reconnecting constantly and dropping messages in between.
             * Teardown is `disconnect()`, called when the session goes away.
             */
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

        // Async: the socket is still closing after this returns, which is why
        // `this.client` is cleared first so a racing connect() builds a new one.
        void client.deactivate();
    }
}

export const notificationSocket = new NotificationSocketService();
