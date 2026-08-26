"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatRowCount, type ImportJob } from "@/lib/api/data-import";
import { cn } from "@/lib/utils";

function Tally({ value, label, tone }: { value: number; label: string; tone: string }) {
    return (
        <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card px-4 py-3">
            <span className={cn("text-xl font-semibold tabular-nums sm:text-2xl", tone)}>
                {formatRowCount(value)}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );
}

/**
 * What the import did, once it has done it.
 *
 * Shown whether it finished cleanly or stopped part-way: rows that went in are
 * in either way, and a screen that hid the numbers after a failure would send
 * the shop looking for items that are already there.
 */
export function ImportResult({
    job,
    reportHref,
}: {
    job: ImportJob;
    reportHref?: string;
}) {
    if (job.status === "COMMITTING") {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center">
                <Loader2 className="size-6 animate-spin text-primary" />
                <div>
                    <p className="text-sm font-medium text-foreground">Importing your file</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This can take a moment for a large file. You can leave this page —
                        it will carry on, and you will find it in your import history.
                    </p>
                </div>
            </div>
        );
    }

    const failed = job.status === "FAILED";

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        failed
                            ? "bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-[var(--destructive)]"
                            : "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
                    )}
                >
                    {failed ? <CircleAlert className="size-5" /> : <CircleCheck className="size-5" />}
                </span>
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        {failed ? "Import stopped part-way" : "Import completed"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {failed
                            ? (job.failureMessage ??
                              "Something stopped the import. Everything below did go in.")
                            : `${job.fileName} has been brought into FluxiBiz.`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tally value={job.createdRows} label="Created" tone="text-[var(--success)]" />
                <Tally value={job.updatedRows} label="Updated" tone="text-[var(--chart-1)]" />
                <Tally value={job.skippedRows} label="Skipped" tone="text-muted-foreground" />
                <Tally
                    value={job.failedRows + job.invalidRows}
                    label="Not imported"
                    tone="text-[var(--destructive)]"
                />
            </div>

            {job.createdItemGroups > 0 || job.createdStockEntries > 0 ? (
                <p className="text-sm text-muted-foreground">
                    {job.createdItemGroups > 0
                        ? `${formatRowCount(job.createdItemGroups)} ${job.createdItemGroups === 1 ? "category was" : "categories were"} created along the way. `
                        : ""}
                    {job.createdStockEntries > 0
                        ? `${formatRowCount(job.createdStockEntries)} ${job.createdStockEntries === 1 ? "item was" : "items were"} given a starting stock quantity.`
                        : ""}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {reportHref ? (
                    <Link href={reportHref} className={buttonVariants({ variant: "outline" })}>
                        View full report
                    </Link>
                ) : null}
                <Link
                    href="/inventory/import/history"
                    className={buttonVariants({ variant: "outline" })}
                >
                    Import history
                </Link>
                <Link href="/inventory" className={buttonVariants()}>
                    Go to items
                </Link>
            </div>
        </div>
    );
}
