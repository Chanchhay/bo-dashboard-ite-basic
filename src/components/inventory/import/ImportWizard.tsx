"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, History, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { TourButton } from "@/components/onboarding/TourButton";
import { InventoryPageHeader, getApiErrorMessage } from "@/components/inventory/InventoryUi";
import { ImportResult } from "@/components/inventory/import/ImportResult";
import { ImportStepper } from "@/components/inventory/import/ImportStepper";
import { StepCheckData } from "@/components/inventory/import/StepCheckData";
import { StepChooseData } from "@/components/inventory/import/StepChooseData";
import {
    StepMatchColumns,
    matchProblems,
    type MatchState,
} from "@/components/inventory/import/StepMatchColumns";
import { StepReview } from "@/components/inventory/import/StepReview";
import { StepUploadFile } from "@/components/inventory/import/StepUploadFile";
import { useImportJob } from "@/components/inventory/import/useImportJob";
import {
    type ImportDuplicateStrategy,
    type ImportTargetType,
} from "@/lib/api/data-import";
import {
    useCommitImportMutation,
    useGetImportColumnsQuery,
    useGetImportPreviewQuery,
    useSaveImportMappingMutation,
    useUploadImportMutation,
    useValidateImportMutation,
} from "@/services/dataImportApi";
import { useGetInventoryUnitsQuery } from "@/services/inventoryApi";

const CHOOSE = 0;
const UPLOAD = 1;
const MATCH = 2;
const CHECK = 3;
const REVIEW = 4;
const IMPORT = 5;

/**
 * The guided migration: choose, upload, match, check, review, import.
 *
 * One page rather than six routes. Every step needs what the one before it
 * produced, and a shop that lost its place by refreshing would have to start
 * from the file again — so the import's id is the only thing that identifies
 * where they are, and the server holds everything else.
 *
 * The last step is the only one that changes anything. Up to that point the
 * uploaded rows sit apart from the catalogue, which is what lets the shop go
 * back and re-match a column without consequence.
 */
export function ImportWizard() {
    const { toast } = useToast();

    const [step, setStep] = useState(CHOOSE);
    const [furthest, setFurthest] = useState(CHOOSE);
    const [targetType, setTargetType] = useState<ImportTargetType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [importId, setImportId] = useState<string>();
    const [confirmed, setConfirmed] = useState(false);

    /*
     * Null until the user touches a dropdown, so the suggestions the backend
     * worked out from their column names can simply be what the screen shows.
     * Seeding state from them instead would mean choosing a moment to do it,
     * and every candidate moment either runs before the suggestions arrive or
     * runs again later and throws the user's own choices away.
     */
    const [mappingEdits, setMappingEdits] = useState<Record<string, string> | null>(null);
    const [duplicateStrategy, setDuplicateStrategy] =
        useState<ImportDuplicateStrategy>("SKIP");
    const [defaultUnitId, setDefaultUnitId] = useState<string | null>(null);

    const [upload, uploadState] = useUploadImportMutation();
    const [saveMapping, mappingState] = useSaveImportMappingMutation();
    const [validate, validateState] = useValidateImportMutation();
    const [commit, commitState] = useCommitImportMutation();

    const job = useImportJob(importId);
    const columns = useGetImportColumnsQuery(importId ?? "", { skip: !importId });
    const units = useGetInventoryUnitsQuery();

    const preview = useGetImportPreviewQuery(importId ?? "", {
        skip: !importId || step < REVIEW,
    });

    function goTo(next: number) {
        setStep(next);
        setFurthest((reached) => Math.max(reached, next));
    }

    const match: MatchState = useMemo(
        () => ({
            mappings:
                mappingEdits ?? {
                    ...(columns.data?.suggestions ?? {}),
                    ...(columns.data?.currentMappings ?? {}),
                },
            duplicateStrategy,
            defaultUnitId,
        }),
        [mappingEdits, columns.data, duplicateStrategy, defaultUnitId],
    );

    function setMatch(next: MatchState) {
        setMappingEdits(next.mappings);
        setDuplicateStrategy(next.duplicateStrategy);
        setDefaultUnitId(next.defaultUnitId);
    }

    const problems = useMemo(
        () =>
            columns.data ? matchProblems(columns.data, match) : ["Loading your columns…"],
        [columns.data, match],
    );

    // --- actions -------------------------------------------------------------------

    async function handleUpload() {
        if (!file || !targetType) return;

        try {
            const created = await upload({ targetType, file }).unwrap();

            /*
             * A different file has different columns, so anything matched
             * against the last one is meaningless now. Cleared back to null so
             * the new file's own suggestions are what the next step shows.
             */
            setMappingEdits(null);
            setConfirmed(false);
            setImportId(created.id);
            goTo(MATCH);
        } catch (error) {
            toast({
                tone: "error",
                title: "Upload failed",
                description: getApiErrorMessage(error, "That file could not be uploaded."),
            });
        }
    }

    async function handleCheck() {
        if (!importId) return;

        try {
            await saveMapping({
                importId,
                mapping: {
                    mappings: match.mappings,
                    duplicateStrategy: match.duplicateStrategy,
                    defaultUnitId: match.defaultUnitId,
                },
            }).unwrap();

            await validate(importId).unwrap();
            setConfirmed(false);
            goTo(CHECK);
        } catch (error) {
            toast({
                tone: "error",
                title: "Could not check the file",
                description: getApiErrorMessage(error, "Please check your column matching."),
            });
        }
    }

    async function handleImport() {
        if (!importId) return;

        try {
            await commit(importId).unwrap();
            goTo(IMPORT);
        } catch (error) {
            toast({
                tone: "error",
                title: "Could not start the import",
                description: getApiErrorMessage(error, "Please try again."),
            });
        }
    }

    // --- what the footer offers ----------------------------------------------------

    const busy =
        uploadState.isLoading ||
        mappingState.isLoading ||
        validateState.isLoading ||
        commitState.isLoading;

    const checkFinished = job.data?.status === "READY";

    function primary() {
        switch (step) {
            case CHOOSE:
                return {
                    label: "Continue",
                    disabled: !targetType,
                    onClick: () => goTo(UPLOAD),
                };
            case UPLOAD:
                return {
                    label: "Upload and read columns",
                    disabled: !file || busy,
                    onClick: handleUpload,
                };
            case MATCH:
                return {
                    /*
                     * Not while a run is already in flight. The server refuses
                     * a second one anyway, but a shop should never have to
                     * learn that from a conflict message.
                     */
                    label: job.running ? "Checking…" : "Check my data",
                    disabled: problems.length > 0 || busy || job.running,
                    onClick: handleCheck,
                };
            case CHECK:
                return {
                    label: "Review what will happen",
                    disabled: !checkFinished || !job.data?.committable,
                    onClick: () => goTo(REVIEW),
                };
            case REVIEW:
                return {
                    label: "Import now",
                    disabled: !confirmed || busy || !preview.data?.committable,
                    onClick: handleImport,
                };
            default:
                return null;
        }
    }

    const action = primary();

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Import data"
                description="Bring your items, categories and stock across from your old system. Nothing is added until you have seen what will happen."
                action={
                    <div className="flex items-center gap-2">
                        <Link
                            href="/inventory/import/history"
                            data-tour="import-history-link"
                            className={buttonVariants({ variant: "outline" })}
                        >
                            <History className="size-4" />
                            History
                        </Link>
                        <TourButton />
                    </div>
                }
            />

            <div data-tour="import-stepper">
                <ImportStepper
                    current={step}
                    furthest={step === IMPORT ? IMPORT : furthest}
                    onStepClick={step === IMPORT ? undefined : setStep}
                />
            </div>

            <section data-tour="import-panel" className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-6 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                {step === CHOOSE ? (
                    <StepChooseData value={targetType} onChange={setTargetType} />
                ) : null}

                {step === UPLOAD && targetType ? (
                    <StepUploadFile
                        targetType={targetType}
                        file={file}
                        onFileChange={setFile}
                        uploading={uploadState.isLoading}
                    />
                ) : null}

                {step === MATCH && targetType ? (
                    columns.isLoading || !columns.data ? (
                        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Reading your column headings…
                        </p>
                    ) : (
                        <StepMatchColumns
                            targetType={targetType}
                            columns={columns.data}
                            state={match}
                            onChange={setMatch}
                            units={units.data ?? []}
                        />
                    )
                ) : null}

                {step === CHECK && job.data ? (
                    <StepCheckData job={job.data} stalled={job.stalled} />
                ) : null}

                {step === REVIEW && preview.data && targetType ? (
                    <StepReview
                        preview={preview.data}
                        targetType={targetType}
                        confirmed={confirmed}
                        onConfirmedChange={setConfirmed}
                    />
                ) : null}

                {step === IMPORT && job.data ? (
                    <ImportResult
                        job={job.data}
                        reportHref={`/inventory/import/${job.data.id}`}
                    />
                ) : null}
            </section>

            {step !== IMPORT ? (
                <div className="flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={step === CHOOSE || busy}
                        onClick={() => setStep(step - 1)}
                        className="h-10 rounded-xl px-4 text-xs sm:h-11 sm:px-6 sm:text-sm"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>

                    {action ? (
                        <Button
                            type="button"
                            disabled={action.disabled}
                            onClick={action.onClick}
                            className="h-10 rounded-xl px-4 text-xs sm:h-11 sm:px-6 sm:text-sm"
                        >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                            {action.label}
                            {!busy ? <ArrowRight className="size-4" /> : null}
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
