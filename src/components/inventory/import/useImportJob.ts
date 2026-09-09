"use client";

import { useEffect, useState } from "react";

import { isImportRunning } from "@/lib/api/data-import";
import { useGetImportQuery } from "@/services/dataImportApi";

const GIVE_UP_AFTER_MS = 5 * 60 * 1000;

export function useImportJob(importId: string | undefined, intervalMs = 1500) {
    const [pollingInterval, setPollingInterval] = useState(0);
    const [stalledRun, setStalledRun] = useState<string | null>(null);

    const query = useGetImportQuery(importId ?? "", {
        skip: !importId,
        pollingInterval,
    });

    const serverBusy = query.data ? isImportRunning(query.data.status) : false;

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

    const wanted = running ? intervalMs : 0;

    if (query.data && pollingInterval !== wanted) {
        setPollingInterval(wanted);
    }

    return { ...query, running, stalled };
}
