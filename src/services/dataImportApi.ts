import { baseApi } from "@/lib/baseApi";
import type {
    ImportColumns,
    ImportJob,
    ImportJobPage,
    ImportMappingInput,
    ImportPreview,
    ImportReport,
    ImportRowPage,
    ImportRowStatus,
    ImportTargetType,
} from "@/lib/api/data-import";

/**
 * What a change to one import invalidates.
 *
 * Everything about an import hangs off its status, and the status changes on
 * its own while the server works. Rather than name each read here, the whole
 * import is invalidated by id and the screen re-reads what it is showing.
 */
const importTags = (importId: string) =>
    [
        { type: "DataImports" as const, id: importId },
        { type: "DataImportRows" as const, id: importId },
    ] as const;

export const dataImportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getImports: builder.query<ImportJobPage, { page?: number; size?: number }>({
            query: (params) => ({ url: "/inventory/imports", params }),
            providesTags: (result) => [
                "DataImports",
                ...(result?.content || []).map((job) => ({
                    type: "DataImports" as const,
                    id: job.id,
                })),
            ],
        }),

        getImport: builder.query<ImportJob, string>({
            query: (importId) => `/inventory/imports/${encodeURIComponent(importId)}`,
            providesTags: (_result, _error, importId) => [
                { type: "DataImports", id: importId },
            ],
        }),

        getImportColumns: builder.query<ImportColumns, string>({
            query: (importId) =>
                `/inventory/imports/${encodeURIComponent(importId)}/columns`,
            providesTags: (_result, _error, importId) => [
                { type: "DataImports", id: importId },
            ],
        }),

        getImportPreview: builder.query<ImportPreview, string>({
            query: (importId) =>
                `/inventory/imports/${encodeURIComponent(importId)}/preview`,
            providesTags: (_result, _error, importId) => [
                { type: "DataImports", id: importId },
            ],
        }),

        getImportReport: builder.query<ImportReport, string>({
            query: (importId) =>
                `/inventory/imports/${encodeURIComponent(importId)}/report`,
            providesTags: (_result, _error, importId) => [
                { type: "DataImports", id: importId },
            ],
        }),

        getImportRows: builder.query<
            ImportRowPage,
            { importId: string; status?: ImportRowStatus | "ALL"; page?: number; size?: number }
        >({
            query: ({ importId, ...params }) => ({
                url: `/inventory/imports/${encodeURIComponent(importId)}/rows`,
                params,
            }),
            providesTags: (_result, _error, { importId }) => [
                { type: "DataImportRows", id: importId },
            ],
        }),

        getImportErrors: builder.query<
            ImportRowPage,
            { importId: string; page?: number; size?: number }
        >({
            query: ({ importId, ...params }) => ({
                url: `/inventory/imports/${encodeURIComponent(importId)}/errors`,
                params,
            }),
            providesTags: (_result, _error, { importId }) => [
                { type: "DataImportRows", id: importId },
            ],
        }),

        uploadImport: builder.mutation<
            ImportJob,
            { targetType: ImportTargetType; file: File }
        >({
            query: ({ targetType, file }) => {
                const body = new FormData();
                body.append("targetType", targetType);
                body.append("file", file, file.name);

                return { url: "/inventory/imports", method: "POST", body };
            },
            invalidatesTags: ["DataImports"],
        }),

        saveImportMapping: builder.mutation<
            ImportJob,
            { importId: string; mapping: ImportMappingInput }
        >({
            query: ({ importId, mapping }) => ({
                url: `/inventory/imports/${encodeURIComponent(importId)}/mapping`,
                method: "PUT",
                body: mapping,
            }),
            invalidatesTags: (_result, _error, { importId }) => [...importTags(importId)],
        }),

        validateImport: builder.mutation<ImportJob, string>({
            query: (importId) => ({
                url: `/inventory/imports/${encodeURIComponent(importId)}/validate`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, importId) => [...importTags(importId)],
        }),

        /**
         * The one call that changes the catalogue.
         *
         * Everything an import touched is invalidated with it: the items and
         * categories it created, and the stock it opened. A shop that lands
         * back on its item list after an import must see what just arrived,
         * not a cached list from before it.
         */
        commitImport: builder.mutation<ImportJob, string>({
            query: (importId) => ({
                url: `/inventory/imports/${encodeURIComponent(importId)}/commit`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, importId) => [
                ...importTags(importId),
                "InventoryItems",
                "InventoryItemGroups",
                "InventoryStock",
                "InventoryStockEntries",
                "ItemChannels",
            ],
        }),
    }),
});

export const {
    useGetImportsQuery,
    useGetImportQuery,
    useGetImportColumnsQuery,
    useGetImportPreviewQuery,
    useGetImportReportQuery,
    useGetImportRowsQuery,
    useGetImportErrorsQuery,
    useUploadImportMutation,
    useSaveImportMappingMutation,
    useValidateImportMutation,
    useCommitImportMutation,
} = dataImportApi;
