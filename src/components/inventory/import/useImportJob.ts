"use client";

import { useEffect, useState } from "react";

import { isImportRunning } from "@/lib/api/data-import";
import { useGetImportQuery } from "@/services/dataImportApi";

/**
 * How long to keep watching a running import before assuming nobody is coming.
 *
 * The server releases a job whose thread died, but only on a sweep — so
 * between the thread going and the sweep noticing, a screen that polled
 * forever would sit there asking every second and telling the shop nothing.
 * Past this point the screen says so instead, and stops.
 */
const GIVE_UP_AFTER_MS = 5 * 60 * 1000;

/**
 * Watches one import, asking again while the server is still working.
 *
 * Checking and importing both happen away from the request that started them,
 * so the only way the screen learns they have finished is to look. It stops
 * looking the moment they have — a finished import never changes again — and
 * it stops looking eventually even if they do not, because a spinner that
 * never resolves is worse than an answer the shop can act on.
 */
export function useImportJob(importId: string | undefined, intervalMs = 1500) {
    const [pollingInterval, setPollingInterval] = useState(0);
    const [stalledRun, setStalledRun] = useState<string | null>(null);

    const query = useGetImportQuery(importId ?? "", {
        skip: !importId,
        pollingInterval,
    });

    const serverBusy = query.data ? isImportRunning(query.data.status) : false;

    /*
     * Which run we are watching, so that giving up on one does not condemn the
     * next. A shop whose check timed out and who tries again gets a fresh
     * spinner rather than an instant "this is taking too long".
     */
    const runKey = query.data
        ? [
              query.data.status,
              query.data.validationStartedAt ?? "",
              query.data.commitStartedAt ?? "",
          ].join("|")
        : "";

    useEffect(() => {
        if (!serverBusy) return;

        const timer = setTimeout(() => setStalledRun(runKey), GIVE_UP_AFTER_MS);

        return () => clearTimeout(timer);
    }, [serverBusy, runKey]);

    const stalled = serverBusy && stalledRun === runKey;
    const running = serverBusy && !stalled;

    /*
     * The interval is adjusted during the render that first sees the job
     * rather than from an effect. Polling is a consequence of the status we
     * are already holding, and routing it through an effect would mean a whole
     * extra render pass before the screen started — or stopped — watching.
     */
    const wanted = running ? intervalMs : 0;

    if (query.data && pollingInterval !== wanted) {
        setPollingInterval(wanted);
    }

    return { ...query, running, stalled };
}
