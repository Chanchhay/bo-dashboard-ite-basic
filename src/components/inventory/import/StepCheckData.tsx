"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ImportRowsTable } from "@/components/inventory/import/ImportRowsTable";
import {
    formatRowCount,
    type ImportJob,
    type ImportRowStatus,
} from "@/lib/api/data-import";
import { useGetImportRowsQuery } from "@/services/dataImportApi";
import { cn } from "@/lib/utils";

type Filter = "ALL" | Extract<ImportRowStatus, "VALID" | "DUPLICATE" | "INVALID">;

/**
 * The three numbers a shop needs before deciding, and the rows behind them.
 *
 * Duplicates are counted apart from errors on purpose. A duplicate is not a
 * mistake — it is a row that matches something already here — and lumping the
 * two together would make a perfectly good re-import look broken.
 */
function Counter({
    label,
    value,
    tone,
    active,
    onClick,
}: {
    label: string;
    value: number;
    tone: "neutral" | "good" | "warn" | "bad";
    active: boolean;
    onClick: () => void;
}) {
    const tones = {
        neutral: "text-foreground",
        good: "text-[var(--success)]",
        warn: "text-[var(--warning)]",
        bad: "text-[var(--destructive)]",
    } as const;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "flex flex-1 flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors",
                active
                    ? "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                    : "border-border bg-card hover:border-primary/40",
            )}
        >
            <span className={cn("text-xl font-semibold tabular-nums sm:text-2xl", tones[tone])}>
                {formatRowCount(value)}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </button>
    );
}

export function StepCheckData({ job, stalled }: { job: ImportJob; stalled?: boolean }) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(25);

    const checking = job.status === "VALIDATING";

    const rows = useGetImportRowsQuery(
        { importId: job.id, status: filter, page, size },
        { skip: checking },
    );

    function choose(next: Filter) {
        setFilter(next);
        setPage(0);
    }

    if (checking && stalled) {
        /*
         * The job still claims to be checking long after it should have
         * finished, which in practice means the server was restarted while it
         * ran. It will be released on the next sweep; saying so beats a
         * spinner that never stops.
         */
        return (
            <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-sm font-medium text-[var(--warning)]">
                    This is taking longer than it should
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Checking may have been interrupted. Nothing has been added to FluxiBiz.
                    Go back and check your data again, or start a new import.
                </p>
            </div>
        );
    }

    if (checking) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center">
                <Loader2 className="size-6 animate-spin text-primary" />
                <div>
                    <p className="text-sm font-medium text-foreground">
                        Checking your file
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        We are reading every row and looking for problems. Nothing has been
                        added to FluxiBiz yet.
                    </p>
                </div>
            </div>
        );
    }

    if (job.status === "VALIDATION_FAILED") {
        return (
            <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-sm font-medium text-[var(--destructive)]">
                    We could not check this file
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {job.failureMessage ??
                        "Something about the file stopped us reading it. Please check it and try again."}
                </p>
            </div>
        );
    }

    const page_ = rows.data?.page;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-base font-semibold text-foreground">
                    We checked {formatRowCount(job.totalRows)}{" "}
                    {job.totalRows === 1 ? "row" : "rows"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Nothing has been added to FluxiBiz yet. Fix anything you want to change
                    in your file and upload it again, or carry on with the rows that are
                    ready.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <Counter
                    label="Total rows"
                    value={job.totalRows}
                    tone="neutral"
                    active={filter === "ALL"}
                    onClick={() => choose("ALL")}
                />
                <Counter
                    label="Ready to import"
                    value={job.validRows}
                    tone="good"
                    active={filter === "VALID"}
                    onClick={() => choose("VALID")}
                />
                <Counter
                    label="Already exist"
                    value={job.duplicateRows}
                    tone="warn"
                    active={filter === "DUPLICATE"}
                    onClick={() => choose("DUPLICATE")}
                />
                <Counter
                    label="Have errors"
                    value={job.invalidRows}
                    tone="bad"
                    active={filter === "INVALID"}
                    onClick={() => choose("INVALID")}
                />
            </div>

            {/*
             * A way out for the one error the shop cannot fix in the file: a
             * unit we have never heard of and the workbook never described.
             * Either they add it to the Units sheet, or they add it here.
             */}
            {job.invalidRows > 0 ? (
                <p className="text-xs text-muted-foreground">
                    Rows refused for a unit we do not recognise can be fixed by adding it to
                    the Units sheet of your file, or by adding it in{" "}
                    <Link
                        href="/inventory/config/units"
                        className="font-medium text-primary underline underline-offset-2"
                    >
                        Item config → Units
                    </Link>
                    .
                </p>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ImportRowsTable
                    rows={rows.data?.content ?? []}
                    page={page_?.number ?? 0}
                    size={page_?.size ?? size}
                    totalElements={page_?.totalElements ?? 0}
                    totalPages={page_?.totalPages ?? 0}
                    onPageChange={setPage}
                    onSizeChange={(next) => {
                        setSize(next);
                        setPage(0);
                    }}
                    isLoading={rows.isFetching}
                    emptyMessage={
                        filter === "ALL"
                            ? "This file had no rows in it."
                            : "No rows of this kind."
                    }
                />
            </div>
        </div>
    );
}
