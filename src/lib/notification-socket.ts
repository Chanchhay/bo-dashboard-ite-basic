import { Client, Message, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Notification } from "./api/notification";
import { fetchSessionContext } from "./auth/session-context";

export type NotificationCallback = (notification: Notification) => void;

export interface SocketConnectParams {
    token?: string;
    userId?: string;
    receiverId?: string;
}

/*
 * Resolved once per connect and again on every reconnect — `force` on the
 * latter, since the whole point of re-reading is to get a token the cached
 * copy no longer has.
 */
function fetchCredentials(force = false) {
    return fetchSessionContext(force ? { force: true } : undefined);
}

/*
 * A Next rewrite proxies plain HTTP; it does not forward the Upgrade handshake
 * a raw WebSocket needs. SockJS's XHR transports are ordinary HTTP requests, so
 * they survive the proxy — hence pinning them here rather than letting SockJS
 * try `websocket` first and spend every connect on a handshake that cannot
 * succeed. Notification traffic is a trickle, so long-polling costs nothing
 * that matters.
 */
const PROXY_SAFE_TRANSPORTS = ["xhr-streaming", "xhr-polling"];

function getWsConfig(wsPath: string): { webSocketFactory: () => any } {
    /*
     * SockJS wants an absolute URL. Resolving against the page origin keeps it
     * same-origin, which is the whole point: no CORS preflight, and the backend
     * host never appears in the browser.
     */
    const url = new URL(wsPath, window.location.origin).toString();

    return {
        webSocketFactory: () =>
            new SockJS(url, null, { transports: PROXY_SAFE_TRANSPORTS }),
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
         * `/topic/notifications` is the one that actually delivers today:
         * NotificationWebSocketPublisher broadcasts every notification there.
         * `/user/queue/notifications` is kept for the day the backend adds a
         * ChannelInterceptor — it registers none, so the STOMP session has no
         * Principal and Spring can never route a user destination.
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
        void this.openClient();
    }

    /*
     * Split out because the socket URL is only known after asking the server,
     * so the client cannot be constructed synchronously.
     */
    private async openClient(): Promise<void> {
        const credentials = await fetchCredentials();

        // disconnect() may have landed while the fetch was in flight.
        if (!this.isConnecting) return;

        if (credentials?.subject) {
            this.subject = credentials.subject;
        }

        /*
         * No path means the server has no API_BASE_URL to proxy to. Opening a
         * socket then would just retry a 404 every 5s forever.
         */
        if (!credentials?.wsPath) {
            this.isConnecting = false;
            console.warn(
                "[NotificationSocket] No socket path configured; realtime disabled.",
            );
            return;
        }

        const wsConfig = getWsConfig(credentials.wsPath);

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
         * Re-runs before every reconnect, so a long-lived tab reconnects with
         * a freshly minted token instead of the one captured at page load.
         * The URL is deliberately not re-read here — stompjs has already built
         * the socket factory by this point.
         */
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
