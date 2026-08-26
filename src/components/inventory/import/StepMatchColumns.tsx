"use client";

import { useMemo } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

import { SelectField } from "@/components/ui/select-field";
import {
    type ImportColumns,
    type ImportDuplicateStrategy,
    type ImportTargetType,
} from "@/lib/api/data-import";
import { type Unit } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

const UNMATCHED = "__none__";

export type MatchState = {
    mappings: Record<string, string>;
    duplicateStrategy: ImportDuplicateStrategy;
    defaultUnitId: string | null;
};

/**
 * Everything wrong with a matching, said before the file is checked.
 *
 * Worked out on every keystroke so the Check button can simply be disabled
 * while something is missing — a shop should not press it, wait, and then be
 * told a required column was never matched.
 */
export function matchProblems(columns: ImportColumns, state: MatchState) {
    const matched = new Set(Object.values(state.mappings).filter(Boolean));
    const problems: string[] = [];

    for (const field of columns.targetFields) {
        if (field.requirement === "REQUIRED" && !matched.has(field.field)) {
            problems.push(`${field.label} is required — match a column to it.`);
        }

        if (
            field.requirement === "REQUIRED_OR_DEFAULTED" &&
            !matched.has(field.field) &&
            !state.defaultUnitId
        ) {
            problems.push(
                `${field.label} is required — match a column, or choose one for the whole file.`,
            );
        }
    }

    const identifiers = columns.targetFields.filter((f) => f.requirement === "IDENTIFIER");

    if (identifiers.length && !identifiers.some((f) => matched.has(f.field))) {
        problems.push(
            `Match a column that says which item each row is for: ${identifiers
                .map((f) => f.label)
                .join(", ")}.`,
        );
    }

    // Two columns feeding one field is the user's to resolve; we cannot pick.
    const counts = new Map<string, string[]>();

    for (const [column, field] of Object.entries(state.mappings)) {
        if (!field) continue;
        counts.set(field, [...(counts.get(field) ?? []), column]);
    }

    for (const [field, cols] of counts) {
        if (cols.length > 1) {
            const label = columns.targetFields.find((f) => f.field === field)?.label ?? field;
            problems.push(`${cols.join(" and ")} are both matched to ${label}. Pick one.`);
        }
    }

    return problems;
}

export function StepMatchColumns({
    targetType,
    columns,
    state,
    onChange,
    units,
}: {
    targetType: ImportTargetType;
    columns: ImportColumns;
    state: MatchState;
    onChange: (next: MatchState) => void;
    units: Unit[];
}) {
    const fieldOptions = useMemo(
        () => [
            { value: UNMATCHED, label: "Do not import" },
            ...columns.targetFields.map((field) => ({
                value: field.field,
                label:
                    field.requirement === "REQUIRED"
                        ? `${field.label} (required)`
                        : field.label,
            })),
        ],
        [columns.targetFields],
    );

    /*
     * Whether the file itself says what each item is counted in. It changes
     * the question below from "what unit is everything" — which is not a
     * question a real shop can answer — to "what should we use where your file
     * is silent", which is.
     */
    const unitColumnMatched = Object.values(state.mappings).includes("UNIT");

    const duplicateFields = useMemo(() => {
        const counts = new Map<string, number>();

        for (const field of Object.values(state.mappings)) {
            if (field) counts.set(field, (counts.get(field) ?? 0) + 1);
        }

        return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([f]) => f));
    }, [state.mappings]);

    const problems = matchProblems(columns, state);

    function setMapping(column: string, field: string) {
        onChange({
            ...state,
            mappings: { ...state.mappings, [column]: field === UNMATCHED ? "" : field },
        });
    }

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="text-base font-semibold text-foreground">Match your columns</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Tell us which of your columns holds which piece of information. We have
                    filled in the ones we recognised — change any of them.
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-160 border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-left">
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Your column
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Example
                                </th>
                                <th className="w-64 px-4 py-3 font-medium text-muted-foreground">
                                    FluxiBiz field
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {columns.sourceColumns.map((column) => {
                                const value = state.mappings[column] || UNMATCHED;
                                const suggested =
                                    columns.suggestions[column] &&
                                    columns.suggestions[column] === state.mappings[column];
                                const clashing =
                                    Boolean(state.mappings[column]) &&
                                    duplicateFields.has(state.mappings[column]);
                                const sample = columns.sampleRows
                                    .map((row) => row[column])
                                    .find((cell) => cell != null && cell !== "");

                                return (
                                    <tr key={column} className="border-b border-border last:border-0">
                                        <td className="px-4 py-2.5">
                                            <span className="font-medium text-foreground">
                                                {column}
                                            </span>
                                        </td>
                                        <td className="max-w-56 truncate px-4 py-2.5 text-muted-foreground">
                                            {sample ?? (
                                                <span className="italic opacity-60">empty</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <SelectField
                                                    options={fieldOptions}
                                                    value={value}
                                                    onValueChange={(next) => setMapping(column, next)}
                                                    size="sm"
                                                    invalid={clashing}
                                                    className="flex-1"
                                                />
                                                {suggested && !clashing ? (
                                                    <span
                                                        title="Matched automatically from the column name"
                                                        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--chart-1)_14%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--chart-1)]"
                                                    >
                                                        <Sparkles className="size-3" />
                                                        Suggested
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {columns.requiresUnit ? (
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                            {unitColumnMatched ? "Fallback unit" : "Default unit"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {unitColumnMatched
                                ? "Your unit column covers most rows. This is used only where that column is blank."
                                : "FluxiBiz counts every item in a unit, and your file has no column for one. Pick what most of these items are sold by — you can change any item afterwards."}
                        </span>
                        <SelectField
                            options={[
                                { value: UNMATCHED, label: "Choose a unit" },
                                ...units.map((unit) => ({
                                    value: unit.id,
                                    label: unit.symbol
                                        ? `${unit.name} (${unit.symbol})`
                                        : (unit.name ?? unit.id),
                                })),
                            ]}
                            value={state.defaultUnitId ?? UNMATCHED}
                            onValueChange={(next) =>
                                onChange({
                                    ...state,
                                    defaultUnitId: next === UNMATCHED ? null : next,
                                })
                            }
                        />
                    </label>
                ) : null}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                        If a row already exists
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {targetType === "OPENING_STOCK"
                            ? "Items that already have stock recorded are always left alone — a starting quantity can only be set once."
                            : "Matched on SKU, then barcode, then name."}
                    </span>
                    <SelectField
                        options={[
                            { value: "SKIP", label: "Skip it — leave what I have" },
                            { value: "UPDATE_EXISTING", label: "Update it with the file" },
                        ]}
                        value={state.duplicateStrategy}
                        disabled={targetType === "OPENING_STOCK"}
                        onValueChange={(next) =>
                            onChange({
                                ...state,
                                duplicateStrategy: next as ImportDuplicateStrategy,
                            })
                        }
                    />
                </label>
            </div>

            {problems.length ? (
                <ul
                    role="alert"
                    className={cn(
                        "flex flex-col gap-1.5 rounded-xl px-3 py-2.5 text-sm",
                        "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
                    )}
                >
                    {problems.map((problem) => (
                        <li key={problem} className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            <span>{problem}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
