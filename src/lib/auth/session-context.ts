"use client";

import { useEffect, useState } from "react";

export type SessionContext = {
    /** Keycloak `sub` — the id the backend identifies users by. */
    subject: string | null;
    accessToken: string | null;
    /**
     * The backend's raw STOMP endpoint (ws:// or wss://), dialled directly.
     * Served from here rather than a NEXT_PUBLIC_ var so the host stays out of
     * the JS bundle and only reaches a request that carries a session.
     */
    wsUrl: string | null;
};

/*
 * Shared across every caller in the tab. Several components want the subject
 * at mount (the socket, the POS screen, the stock page) and there is no reason
 * for each to issue its own request for the same answer.
 */
let inflight: Promise<SessionContext | null> | null = null;

export function fetchSessionContext(
    options?: { force?: boolean },
): Promise<SessionContext | null> {
    if (options?.force) {
        inflight = null;
    }

    if (!inflight) {
        inflight = fetch("/api/session-context", { cache: "no-store" })
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<SessionContext>)
                    : null,
            )
            .catch(() => null);

        /*
         * Don't cache a failure: a request that lost the network would
         * otherwise poison every later caller for the life of the tab.
         */
        inflight = inflight.then((value) => {
            if (value === null) inflight = null;
            return value;
        });
    }

    return inflight;
}

export function clearSessionContext(): void {
    inflight = null;
}

/**
 * The current user's Keycloak subject, or null until it resolves. Use this —
 * not `session.user.id` — for any id the backend will read back.
 */
export function useSessionSubject(): string | null {
    const [subject, setSubject] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        fetchSessionContext().then((context) => {
            if (active) setSubject(context?.subject ?? null);
        });

        return () => {
            active = false;
        };
    }, []);

    return subject;
}
