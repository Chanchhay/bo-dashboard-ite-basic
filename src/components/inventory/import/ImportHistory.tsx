"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/PaginationBar";
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
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-2.5 bg-shell/95 backdrop-blur-md transition-all">
                <InventoryPageHeader
                    title="Import history"
                    description="Every file you have brought into FluxiBiz, newest first. Open one to see what it did and anything it could not import."
                    action={
                        <Link href="/inventory/import" className={buttonVariants()}>
                            <Plus className="size-4" />
                            New import
                        </Link>
                    }
                />
            </div>

            {jobs.length === 0 ? (
                <InventoryEmpty
                    title="No imports yet"
                    description="When you bring a file into FluxiBiz, it will be listed here."
                />
            ) : (
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <div className="overflow-auto max-h-[calc(100dvh-260px)] sm:max-h-[calc(100dvh-280px)]">
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
