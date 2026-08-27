"use client";

import {
    IMPORT_ROW_STATUS_LABELS,
    IMPORT_STATUS_LABELS,
    type ImportRowStatus,
    type ImportStatus,
} from "@/lib/api/data-import";
import { cn } from "@/lib/utils";

/**
 * Colour carries meaning here, so it is never the only thing that does — every
 * pill also says what it means in words.
 */
const TONE = {
    neutral: "bg-muted text-muted-foreground",
    progress: "bg-[color-mix(in_srgb,var(--chart-1)_14%,transparent)] text-[var(--chart-1)]",
    good: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
    warn: "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)]",
    bad: "bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-[var(--destructive)]",
} as const;

const JOB_TONES: Record<ImportStatus, keyof typeof TONE> = {
    UPLOADED: "neutral",
    MAPPED: "neutral",
    VALIDATING: "progress",
    READY: "good",
    VALIDATION_FAILED: "bad",
    COMMITTING: "progress",
    COMMITTED: "good",
    FAILED: "bad",
};

const ROW_TONES: Record<ImportRowStatus, keyof typeof TONE> = {
    PENDING: "neutral",
    VALID: "good",
    DUPLICATE: "warn",
    INVALID: "bad",
    CREATED: "good",
    UPDATED: "good",
    SKIPPED: "neutral",
    FAILED: "bad",
};

function Pill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                TONE[tone],
            )}
        >
            {children}
        </span>
    );
}

export function ImportStatusPill({ status }: { status: ImportStatus }) {
    return <Pill tone={JOB_TONES[status]}>{IMPORT_STATUS_LABELS[status]}</Pill>;
}

export function ImportRowStatusPill({ status }: { status: ImportRowStatus }) {
    return <Pill tone={ROW_TONES[status]}>{IMPORT_ROW_STATUS_LABELS[status]}</Pill>;
}
