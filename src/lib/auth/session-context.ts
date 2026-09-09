"use client";

import { useEffect, useState } from "react";

export type SessionContext = {
    subject: string | null;
    accessToken: string | null;
    wsUrl: string | null;
};

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
