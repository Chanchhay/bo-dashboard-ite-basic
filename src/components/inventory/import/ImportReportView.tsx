"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Undo2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    getApiErrorMessage,
} from "@/components/inventory/InventoryUi";
import { ImportResult } from "@/components/inventory/import/ImportResult";
import { ImportRowsTable } from "@/components/inventory/import/ImportRowsTable";
import { ImportStatusPill } from "@/components/inventory/import/ImportStatusPill";
import { useImportJob } from "@/components/inventory/import/useImportJob";
import {
    IMPORT_TARGET_LABELS,
    formatRowCount,
    isImportFinished,
} from "@/lib/api/data-import";
import {
    useGetImportErrorsQuery,
    useGetImportReportQuery,
    useRevertImportMutation,
} from "@/services/dataImportApi";

function when(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

/**
 * One import, opened again later.
 *
 * The question this screen answers is "what did that file actually do", asked
 * weeks after the fact when something in the catalogue looks wrong. So it
 * leads with the counts, then the reasons rows were refused, then the rows
 * themselves.
 */
export function ImportReportView({ importId }: { importId: string }) {
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(25);
    const [undoing, setUndoing] = useState(false);

    const { toast } = useToast();
    const [revertImport, revertState] = useRevertImportMutation();

    const job = useImportJob(importId);
    const report = useGetImportReportQuery(importId);
    const errors = useGetImportErrorsQuery({ importId, page, size });

    if (job.isLoading || report.isLoading) {
        return <InventoryLoading label="Loading import" />;
    }

    if (job.error || report.error || !job.data || !report.data) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    job.error ?? report.error,
                    "Unable to load this import.",
                )}
                retry={() => {
                    void job.refetch();
                    void report.refetch();
                }}
            />
        );
    }

    const detail = report.data;
    const errorPage = errors.data?.page;
    const isUndoing = job.data.status === "REVERTING" || revertState.isLoading;
    const finished = isImportFinished(job.data.status);
    const created = job.data.createdRows;

    async function handleUndo() {
        try {
            await revertImport(importId).unwrap();
            setUndoing(false);
            void job.refetch();
            void report.refetch();
            toast({
                tone: "success",
                title: "Undoing this import",
                description:
                    "The report will show what was removed and what had to stay.",
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Import not undone",
                description: getApiErrorMessage(
                    error,
                    "This import could not be undone.",
                ),
            });
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title={detail.fileName}
                description={`${IMPORT_TARGET_LABELS[detail.targetType]} import`}
                action={
                    <div className="flex items-center gap-2">
                        {job.data.revertable && !isUndoing && job.data.status !== "REVERTED" ? (
                            <Button
                                variant="outline"
                                onClick={() => setUndoing(true)}
                                disabled={revertState.isLoading}
                            >
                                <Undo2 className="size-4" />
                                Undo import
                            </Button>
                        ) : null}
                        <Link
                            href="/inventory/import/history"
                            className={buttonVariants({ variant: "outline" })}
                        >
                            <ArrowLeft className="size-4" />
                            All imports
                        </Link>
                    </div>
                }
            />

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                {finished || job.data.status === "COMMITTING" || isUndoing ? (
                    <ImportResult
                        job={
                            isUndoing && job.data.status !== "REVERTING"
                                ? { ...job.data, status: "REVERTING" }
                                : job.data
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        <ImportStatusPill status={job.data.status} />
                        <p className="text-sm text-muted-foreground">
                            This import was never brought in. It has{" "}
                            {formatRowCount(job.data.totalRows)} rows and can be picked up
                            again from a new import.
                        </p>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold text-foreground">Details</h2>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Fact label="Started by" value={detail.startedBy ?? "—"} />
                    <Fact label="Started" value={when(detail.startedAt)} />
                    <Fact label="Finished" value={when(detail.completedAt)} />
                    <Fact label="Rows in file" value={formatRowCount(detail.totalRows)} />
                </dl>
            </section>

            {detail.errorSummary.length > 0 ? (
                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Why rows were not imported
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Most common first. Fixing these in your file and importing again
                            will bring the rest in.
                        </p>
                    </div>
                    <ul className="divide-y divide-border">
                        {detail.errorSummary.map((summary) => (
                            <li
                                key={summary.code}
                                className="flex items-center justify-between gap-4 px-5 py-3"
                            >
                                <span className="text-sm text-foreground">{summary.message}</span>
                                <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                                    {formatRowCount(summary.rows)}{" "}
                                    {summary.rows === 1 ? "row" : "rows"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold text-foreground">
                        Rows that were not imported
                    </h2>
                </div>
                <ImportRowsTable
                    rows={errors.data?.content ?? []}
                    page={errorPage?.number ?? 0}
                    size={errorPage?.size ?? size}
                    totalElements={errorPage?.totalElements ?? 0}
                    totalPages={errorPage?.totalPages ?? 0}
                    onPageChange={setPage}
                    onSizeChange={(next) => {
                        setSize(next);
                        setPage(0);
                    }}
                    isLoading={errors.isFetching}
                    emptyMessage="Every row went in."
                />
            </section>
            <DestructiveConfirmDialog
                open={undoing}
                onOpenChange={setUndoing}
                title="Undo this import?"
                description={
                    <>
                        This deletes the{" "}
                        <strong className="font-semibold text-[#16181c] dark:text-[#f8fafc]">
                            {formatRowCount(created)}
                        </strong>{" "}
                        this import created, along with any categories it added that are
                        still empty. Items it only updated keep their new values, and
                        anything already sold is left alone — the report will say which.
                        This cannot itself be undone.
                    </>
                }
                confirmLabel="Undo import"
                cancelLabel="Keep it"
                isPending={revertState.isLoading}
                onConfirm={handleUndo}
            />
        </div>
    );
}
