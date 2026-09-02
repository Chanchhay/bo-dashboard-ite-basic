"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    ACCEPTED_IMPORT_EXTENSIONS,
    IMPORT_TARGET_LABELS,
    MAX_IMPORT_ROWS,
    formatFileSize,
    importFileError,
    type ImportTargetType,
} from "@/lib/api/data-import";
import { cn } from "@/lib/utils";
import { useGetImportSamplesQuery } from "@/services/dataImportApi";

/**
 * Picking the file, with the limits said up front rather than discovered.
 *
 * The file is checked here before it is sent: a shop that picked a .pdf or a
 * 40 MB export should be told so in the moment, not after waiting for an
 * upload that was never going to be accepted.
 */
export function StepUploadFile({
    targetType,
    file,
    onFileChange,
    uploading,
    uploadError,
}: {
    targetType: ImportTargetType;
    file: File | null;
    onFileChange: (file: File | null) => void;
    uploading: boolean;
    uploadError?: string;
}) {
    const samples = useGetImportSamplesQuery(targetType);

    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState<string>();

    const accept = ACCEPTED_IMPORT_EXTENSIONS.join(",");
    const error = localError ?? uploadError;

    function pick(next: File | null) {
        if (!next) {
            setLocalError(undefined);
            onFileChange(null);
            return;
        }

        const problem = importFileError(next);
        setLocalError(problem);
        onFileChange(problem ? null : next);
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-base font-semibold text-foreground">
                    Upload your {IMPORT_TARGET_LABELS[targetType].toLowerCase()} file
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    CSV or Excel (.xlsx), up to 10 MB and{" "}
                    {MAX_IMPORT_ROWS.toLocaleString()} rows. The first row should be your
                    column headings.
                </p>
            </div>

            {/*
             * The way out for anyone unsure what we expect. The template's
             * headings are the ones the next step matches automatically, so a
             * file built from it arrives already matched — which is a far
             * better first attempt than guessing at our column names.
             */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">
                    Not sure what your file should look like?
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Start from the sample closest to your shop, replace the example rows
                    with your own, and upload it back. Its columns will be matched for you.
                </p>

                <div className="mt-3 flex flex-col gap-2">
                    {samples.data?.map((sample) => (
                        <div
                            key={sample.sample}
                            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {sample.label}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {sample.description}
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                                    {sample.columns.join(" · ")}
                                </p>
                            </div>
                            <a
                                href={`/api/inventory/imports/template?sample=${encodeURIComponent(sample.sample)}`}
                                download
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "sm" }),
                                    "shrink-0",
                                )}
                            >
                                <Download className="size-4 text-primary" />
                                Download
                            </a>
                        </div>
                    ))}

                    {samples.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading samples…</p>
                    ) : null}

                    {/* A list we could not load is no reason to block an upload. */}
                    {samples.error ? (
                        <a
                            href={`/api/inventory/imports/template?targetType=${targetType}`}
                            download
                            className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "self-start",
                            )}
                        >
                            <Download className="size-4 text-primary" />
                            Sample file
                        </a>
                    ) : null}
                </div>
            </div>

            {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <FileSpreadsheet className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                            {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} ·{" "}
                            {IMPORT_TARGET_LABELS[targetType]}
                        </p>
                    </div>
                    {!uploading ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => pick(null)}
                            aria-label="Remove file"
                        >
                            <X className="size-4" />
                        </Button>
                    ) : null}
                </div>
            ) : (
                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        pick(event.dataTransfer.files?.[0] ?? null);
                    }}
                    className={cn(
                        "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                        dragging ? "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]" : "border-border bg-card",
                    )}
                >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Upload className="size-5" />
                    </span>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Drag your file here
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            or choose one from your computer
                        </p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                        Choose file
                    </Button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        className="sr-only"
                        onChange={(event) => pick(event.target.files?.[0] ?? null)}
                    />
                </div>
            )}

            {uploading ? (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Uploading and reading column headings…</p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                    </div>
                </div>
            ) : null}

            {error ? (
                <p
                    role="alert"
                    className="rounded-xl bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] px-3 py-2 text-sm text-[var(--destructive)]"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}
