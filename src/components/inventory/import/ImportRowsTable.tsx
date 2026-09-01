"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { ImportRowStatusPill } from "@/components/inventory/import/ImportStatusPill";
import { type ImportRow } from "@/lib/api/data-import";

/**
 * Which of a row's values are worth a column of their own.
 *
 * A staged row carries every field the matching produced, which is far too
 * many to put on screen. These are the ones that identify a row to the person
 * looking at it — enough to recognise which of their products it is.
 */
const SHOWN_VALUES = [
    { key: "name", label: "Name" },
    { key: "itemName", label: "Item" },
    // On a file listing one row per option, the name repeats down the page and
    // this is the only column that tells one row from the next.
    { key: "option", label: "Option" },
    { key: "sku", label: "SKU" },
    { key: "itemGroup", label: "Category" },
    { key: "price", label: "Price" },
    { key: "quantity", label: "Quantity" },
    { key: "openingStock", label: "Stock" },
] as const;

function readable(value: unknown) {
    if (value == null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    return String(value);
}

/**
 * The staged rows, as a table a shopkeeper can read.
 *
 * Validation messages are shown as the sentences they were written as. The
 * underlying row carries a good deal more — the raw cells, the field codes —
 * and none of it belongs on a screen meant for someone fixing a spreadsheet.
 */
export function ImportRowsTable({
    rows,
    page,
    size,
    totalElements,
    totalPages,
    onPageChange,
    onSizeChange,
    isLoading,
    emptyMessage = "No rows to show.",
}: {
    rows: ImportRow[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
    isLoading?: boolean;
    emptyMessage?: string;
}) {
    // Only the value columns this import actually populated.
    const valueColumns = SHOWN_VALUES.filter((column) =>
        rows.some((row) => row.values?.[column.key] != null && row.values[column.key] !== ""),
    );

    return (
        <div className="flex flex-col">
            {/* Mobile Cards Layout (md:hidden) */}
            <div className="flex flex-col divide-y divide-border md:hidden">
                {rows.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    rows.map((row) => (
                        <div key={row.id} className="flex flex-col gap-3 p-3.5 sm:p-4 bg-card">
                            {/* Card Header: Row Number & Status */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-semibold tabular-nums text-foreground">
                                    Row {row.rowNumber}
                                </span>
                                <ImportRowStatusPill status={row.status} />
                            </div>

                            {/* Key-Value Fields Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 dark:bg-muted/10 p-2.5 rounded-xl border border-border/50">
                                {valueColumns.map((column) => (
                                    <div key={column.key} className="flex flex-col min-w-0">
                                        <span className="text-[11px] text-muted-foreground">
                                            {column.label}
                                        </span>
                                        <span className="font-medium text-foreground truncate">
                                            {readable(row.values?.[column.key])}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Issues / What we found */}
                            {row.issues.length > 0 && (
                                <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-xs">
                                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                                        What we found:
                                    </p>
                                    <ul className="flex flex-col gap-1">
                                        {row.issues.map((issue, index) => (
                                            <li
                                                key={`${issue.code}-${index}`}
                                                className={
                                                    issue.severity === "ERROR"
                                                        ? "text-[var(--destructive)] font-medium"
                                                        : issue.severity === "WARNING"
                                                          ? "text-[var(--warning)] font-medium"
                                                          : "text-muted-foreground"
                                                }
                                            >
                                                • {issue.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-160 border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40 text-left">
                            <th className="w-16 px-4 py-3 font-medium text-muted-foreground">
                                Row
                            </th>
                            {valueColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-4 py-3 font-medium text-muted-foreground"
                                >
                                    {column.label}
                                </th>
                            ))}
                            <th className="w-32 px-4 py-3 font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">
                                What we found
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={valueColumns.length + 3}
                                    className="px-4 py-10 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="border-b border-border last:border-0 align-top">
                                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                                        {row.rowNumber}
                                    </td>
                                    {valueColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="max-w-48 truncate px-4 py-2.5 text-foreground"
                                        >
                                            {readable(row.values?.[column.key])}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2.5">
                                        <ImportRowStatusPill status={row.status} />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {row.issues.length === 0 ? (
                                            <span className="text-muted-foreground">—</span>
                                        ) : (
                                            <ul className="flex flex-col gap-1">
                                                {row.issues.map((issue, index) => (
                                                    <li
                                                        key={`${issue.code}-${index}`}
                                                        /*
                                                         * "The unit Kilogram will be created" is
                                                         * the import saying what it will do, not a
                                                         * problem. Showing it in the same amber as
                                                         * a real warning taught people to read past
                                                         * the colour altogether.
                                                         */
                                                        className={
                                                            issue.severity === "ERROR"
                                                                ? "text-[var(--destructive)]"
                                                                : issue.severity === "WARNING"
                                                                  ? "text-[var(--warning)]"
                                                                  : "text-muted-foreground"
                                                        }
                                                    >
                                                        {issue.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalElements > 0 ? (
                <PaginationBar
                    page={page}
                    size={size}
                    totalElements={totalElements}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    onSizeChange={onSizeChange}
                    isLoading={isLoading}
                    itemLabel="row"
                    itemLabelPlural="rows"
                    className="border-t border-border"
                />
            ) : null}
        </div>
    );
}
