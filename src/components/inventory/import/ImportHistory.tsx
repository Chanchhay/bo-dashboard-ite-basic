"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { TourButton } from "@/components/onboarding/TourButton";
import {
    InventoryEmpty,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    getApiErrorMessage,
} from "@/components/inventory/InventoryUi";
import { ImportStatusPill } from "@/components/inventory/import/ImportStatusPill";
import {
    IMPORT_TARGET_LABELS,
    formatRowCount,
    type ImportJob,
} from "@/lib/api/data-import";
import { useGetImportsQuery } from "@/services/dataImportApi";

function when(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

/** What the shop actually got out of an import, at a glance. */
function outcome(job: ImportJob) {
    if (job.status === "COMMITTED" || job.status === "FAILED") {
        return `${formatRowCount(job.createdRows + job.updatedRows)} in · ${formatRowCount(
            job.failedRows + job.invalidRows,
        )} not`;
    }

    if (job.status === "REVERTED") {
        return `Undone (${formatRowCount(job.createdRows)} removed)`;
    }

    if (job.status === "REVERTING") {
        return "Loading…";
    }

    return job.totalRows > 0 ? `${formatRowCount(job.totalRows)} rows` : "—";
}

export function ImportHistory() {
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    const imports = useGetImportsQuery({ page, size });

    if (imports.isLoading) {
        return <InventoryLoading label="Loading import history" />;
    }

    if (imports.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(imports.error, "Unable to load your imports.")}
                retry={imports.refetch}
            />
        );
    }

    const jobs = imports.data?.content ?? [];
    const pageInfo = imports.data?.page;

    return (
        <div className="flex flex-col gap-6">
            {/* Header Section (sticky on desktop only) */}
            <div className="static lg:sticky lg:top-0 lg:z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-2.5 bg-shell/95 lg:backdrop-blur-md transition-all">
                <InventoryPageHeader
                    title="Import history"
                    description="Every file you have brought into FluxiBiz, newest first. Open one to see what it did and anything it could not import."
                    action={
                        <div className="flex items-center gap-2">
                            <Link
                                href="/inventory/import"
                                data-tour="import-new-link"
                                className={buttonVariants()}
                            >
                                <Plus className="size-4" />
                                New import
                            </Link>
                            <TourButton />
                        </div>
                    }
                />
            </div>

            {jobs.length === 0 ? (
                <InventoryEmpty
                    title="No imports yet"
                    description="When you bring a file into FluxiBiz, it will be listed here."
                />
            ) : (
                <section data-tour="import-history-list" className="overflow-clip rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    {/* Mobile Cards View (< md) */}
                    <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
                        {jobs.map((job) => (
                            <Link
                                key={job.id}
                                href={`/inventory/import/${job.id}`}
                                className="rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all hover:border-primary/40 active:scale-[0.99] block"
                            >
                                {/* Card Header */}
                                <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className="font-bold text-sm text-foreground dark:text-white truncate">
                                            {job.fileName}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground mt-0.5">
                                            {IMPORT_TARGET_LABELS[job.targetType]}
                                        </span>
                                    </div>
                                    <ImportStatusPill status={job.status} />
                                </div>

                                {/* Card Key-Value Rows */}
                                <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Rows Processed</span>
                                        <span className="font-medium text-foreground dark:text-slate-200">
                                            {outcome(job)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Started By</span>
                                        <span className="text-foreground dark:text-slate-200">
                                            {job.startedBy ?? "—"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30">
                                        <span className="text-muted-foreground dark:text-slate-400">Uploaded At</span>
                                        <span className="text-muted-foreground dark:text-slate-300">
                                            {when(job.uploadedAt)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-auto max-h-[calc(100dvh-260px)] sm:max-h-[calc(100dvh-280px)]">
                        <table className="w-full min-w-160 border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-xs">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">File</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">Type</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">Status</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">Rows</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">Started by</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground bg-card">Uploaded</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="border-b border-border last:border-0 hover:bg-accent/40"
                                    >
                                        <td className="px-4 py-2.5">
                                            <Link
                                                href={`/inventory/import/${job.id}`}
                                                className="font-medium text-foreground underline-offset-4 hover:underline"
                                            >
                                                {job.fileName}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {IMPORT_TARGET_LABELS[job.targetType]}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <ImportStatusPill status={job.status} />
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                            {outcome(job)}
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {job.startedBy ?? "—"}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                            {when(job.uploadedAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        page={pageInfo?.number ?? 0}
                        size={pageInfo?.size ?? size}
                        totalElements={pageInfo?.totalElements ?? 0}
                        totalPages={pageInfo?.totalPages ?? 0}
                        onPageChange={setPage}
                        onSizeChange={(next) => {
                            setSize(next);
                            setPage(0);
                        }}
                        isLoading={imports.isFetching}
                        itemLabel="import"
                        itemLabelPlural="imports"
                        className="border-t border-border"
                    />
                </section>
            )}
        </div>
    );
}
