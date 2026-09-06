/** One browser/device's push registration, keyed to the user it belongs to. */
export interface StoredPushSubscription {
  /** Keycloak subject — same id the notification inbox and the socket use. */
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
  createdAt?: string;
}

/** What actually lands in the OS notification. */
export interface PushPayload {
  title: string;
  body: string;
  /** Where a tap on the notification should open. Defaults to "/". */
  url?: string;
  icon?: string;
  /** Collapses repeats of the same alert (e.g. one per order) into the latest. */
  tag?: string;
}

export interface SendPushResult {
  /** Devices that accepted the push. */
  sent: number;
  /** Devices that rejected it for a reason other than being gone (network, payload, quota). */
  failed: number;
  /** Dead registrations removed from the store — the endpoint no longer exists. */
  pruned: number;
}
