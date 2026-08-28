import { z } from "zod";

export const IMPORT_TARGET_TYPES = [
    "ITEM_GROUP",
    "ITEM",
    "OPENING_STOCK",
] as const;

export type ImportTargetType = (typeof IMPORT_TARGET_TYPES)[number];

export type ImportStatus =
    | "UPLOADED"
    | "MAPPED"
    | "VALIDATING"
    | "READY"
    | "VALIDATION_FAILED"
    | "COMMITTING"
    | "COMMITTED"
    | "REVERTING"
    | "REVERTED"
    | "FAILED";

export type ImportRowStatus =
    | "PENDING"
    | "VALID"
    | "DUPLICATE"
    | "INVALID"
    | "CREATED"
    | "UPDATED"
    | "SKIPPED"
    | "REVERTED"
    | "FAILED";

export type ImportDuplicateStrategy = "SKIP" | "UPDATE_EXISTING";

export type ImportFieldRequirement =
    | "REQUIRED"
    | "REQUIRED_OR_DEFAULTED"
    | "IDENTIFIER"
    | "OPTIONAL";

export type ImportFieldType = "TEXT" | "NUMBER" | "MONEY" | "BOOLEAN" | "ENUM";

export type ImportJob = {
    id: string;
    targetType: ImportTargetType;
    sourceType: "CSV_UPLOAD" | "XLSX_UPLOAD";
    status: ImportStatus;
    fileName: string;
    fileSize: number;
    sourceColumns: string[];
    columnMappings: Record<string, string>;
    duplicateStrategy: ImportDuplicateStrategy;
    defaultUnitId: string | null;
    defaultItemType: "PHYSICAL" | "SERVICE" | "DIGITAL" | null;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    createdRows: number;
    updatedRows: number;
    skippedRows: number;
    failedRows: number;
    createdItemGroups: number;
    createdStockEntries: number;
    startedBy: string | null;
    uploadedAt: string | null;
    validationStartedAt: string | null;
    validationCompletedAt: string | null;
    commitStartedAt: string | null;
    commitCompletedAt: string | null;
    revertedAt: string | null;
    failureMessage: string | null;
    committable: boolean;

    /**
     * Whether this import can still be taken back out. False once it has been,
     * and false for one that created nothing — there is nothing to undo.
     */
    revertable: boolean;
};

/**
 * One starting file a shop can download.
 *
 * Served by the backend rather than written out here, so the words describing
 * a sample and the columns inside it cannot drift apart.
 */
export type ImportSample = {
    sample: string;
    label: string;
    description: string;
    fileName: string;
    columns: string[];
};

export type ImportField = {
    field: string;
    label: string;
    help: string;
    type: ImportFieldType;
    requirement: ImportFieldRequirement;
};

export type ImportColumns = {
    sourceColumns: string[];
    targetFields: ImportField[];
    
    suggestions: Record<string, string>;
    currentMappings: Record<string, string>;
    sampleRows: Record<string, string>[];
    requiresUnit: boolean;
};

export type ImportIssue = {
    field: string | null;
    code: string;
    message: string;
    /**
     * INFO is what the import will do — a category or unit it will create.
     * WARNING is worth a look but still imports. ERROR stops the row.
     */
    severity: "INFO" | "WARNING" | "ERROR";
};

export type ImportRow = {
    id: string;
    rowNumber: number;
    status: ImportRowStatus;
    sourceValues: Record<string, string>;
    values: Record<string, unknown>;
    issues: ImportIssue[];
    errorCount: number;
    warningCount: number;
    committedEntityId: string | null;
};

export type ImportPreview = {
    importId: string;
    targetType: ImportTargetType;
    status: ImportStatus;
    duplicateStrategy: ImportDuplicateStrategy;
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    invalidRows: number;
    willCreate: number;
    willUpdate: number;
    willSkip: number;
    willFail: number;
    itemGroupsToCreate: number;
    openingStockToRecord: number;
    units: ImportUnitSummary;
    committable: boolean;
};

/** What the import will do about the units its rows are counted in. */
export type ImportUnitSummary = {
    reused: number;
    created: number;
    conflicts: number;
    toReuse: string[];
    toCreate: string[];
};

export type ImportErrorSummary = {
    field: string | null;
    code: string;
    message: string;
    rows: number;
};

export type ImportReport = {
    importId: string;
    fileName: string;
    targetType: ImportTargetType;
    status: ImportStatus;
    startedBy: string | null;
    startedAt: string | null;
    completedAt: string | null;
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    skippedRows: number;
    failedRows: number;
    invalidRows: number;
    itemGroupsCreated: number;
    openingStockRecorded: number;
    failureMessage: string | null;
    errorSummary: ImportErrorSummary[];
};

export type ImportJobPage = {
    content: ImportJob[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
};

export type ImportRowPage = {
    content: ImportRow[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
};

export const importMappingSchema = z.object({
    mappings: z.record(z.string(), z.string().nullable()),
    duplicateStrategy: z.enum(["SKIP", "UPDATE_EXISTING"]),
    defaultUnitId: z.string().nullable().optional(),
    defaultItemType: z.enum(["PHYSICAL", "SERVICE", "DIGITAL"]).nullable().optional(),
});

export type ImportMappingInput = z.infer<typeof importMappingSchema>;

export const IMPORT_TARGET_LABELS: Record<ImportTargetType, string> = {
    ITEM_GROUP: "Categories",
    ITEM: "Items",
    OPENING_STOCK: "Opening Stock",
};

export const IMPORT_TARGET_DESCRIPTIONS: Record<ImportTargetType, string> = {
    ITEM_GROUP: "Just the categories you file items under.",
    ITEM:
        "Your item list. Can also create the categories it names and record the stock you have on hand.",
    OPENING_STOCK:
        "How much of each item you have right now. Your items must already be in FluxiBiz.",
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
    UPLOADED: "Uploaded",
    MAPPED: "Columns matched",
    VALIDATING: "Checking",
    READY: "Ready to import",
    VALIDATION_FAILED: "Check failed",
    COMMITTING: "Importing",
    COMMITTED: "Imported",
    REVERTING: "Loading",
    REVERTED: "Undone",
    FAILED: "Failed",
};

export const IMPORT_ROW_STATUS_LABELS: Record<ImportRowStatus, string> = {
    PENDING: "Not checked",
    VALID: "Ready",
    DUPLICATE: "Already exists",
    INVALID: "Has errors",
    CREATED: "Created",
    UPDATED: "Updated",
    SKIPPED: "Skipped",
    REVERTED: "Removed by undo",
    FAILED: "Failed",
};

export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".xlsx"] as const;
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 20_000;

export function isImportRunning(status: ImportStatus) {
    return (
        status === "VALIDATING" || status === "COMMITTING" || status === "REVERTING"
    );
}

export function isImportFinished(status: ImportStatus) {
    return status === "COMMITTED" || status === "REVERTED" || status === "FAILED";
}

export function importFileError(file: File) {
    const name = file.name.toLowerCase();
    const accepted = ACCEPTED_IMPORT_EXTENSIONS.some((ext) => name.endsWith(ext));

    if (!accepted) {
        return "Choose a CSV or Excel (.xlsx) file.";
    }

    if (file.size === 0) {
        return "That file is empty.";
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
        return "Files must be 10 MB or smaller. Please split this one into parts.";
    }

    return undefined;
}

export function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRowCount(count: number) {
    return count.toLocaleString();
}
