"use client";

import { AlertTriangle, FolderPlus, Minus, Pencil, Plus, Warehouse } from "lucide-react";

import {
    IMPORT_TARGET_LABELS,
    formatRowCount,
    type ImportPreview,
    type ImportTargetType,
} from "@/lib/api/data-import";
import { cn } from "@/lib/utils";

/** What one thing is called here, singular or plural, so the lines read as English. */
function noun(targetType: ImportTargetType, count: number) {
    const singular = {
        ITEM_GROUP: "category",
        ITEM: "item",
        OPENING_STOCK: "quantity",
    }[targetType];

    const plural = {
        ITEM_GROUP: "categories",
        ITEM: "items",
        OPENING_STOCK: "quantities",
    }[targetType];

    return count === 1 ? singular : plural;
}

function Consequence({
    icon: Icon,
    count,
    text,
    tone,
}: {
    icon: typeof Plus;
    count: number;
    text: string;
    tone: "good" | "info" | "muted" | "bad";
}) {
    if (count === 0) return null;

    const tones = {
        good: "text-[var(--success)]",
        info: "text-[var(--chart-1)]",
        muted: "text-muted-foreground",
        bad: "text-[var(--destructive)]",
    } as const;

    return (
        <li className="flex items-center gap-3">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted", tones[tone])}>
                <Icon className="size-4" />
            </span>
            <span className="text-sm text-foreground">
                <strong className="font-semibold tabular-nums">{formatRowCount(count)}</strong>{" "}
                {text}
            </span>
        </li>
    );
}

/**
 * What will happen, in the shop's own terms, before it happens.
 *
 * Phrased as consequences rather than row states — "1,920 items will be
 * created" is a sentence a shopkeeper can agree or object to, where "1,920
 * rows are valid" is not. This is the last screen before anything becomes
 * real, so it also says plainly that it cannot be undone.
 */
export function StepReview({
    preview,
    targetType,
    confirmed,
    onConfirmedChange,
}: {
    preview: ImportPreview;
    targetType: ImportTargetType;
    confirmed: boolean;
    onConfirmedChange: (next: boolean) => void;
}) {
    const nothingToDo = preview.willCreate === 0 && preview.willUpdate === 0;

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="text-base font-semibold text-foreground">
                    Here is what will happen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Read this over before you continue. Importing cannot be undone.
                </p>
            </div>

            <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <Consequence
                    icon={Plus}
                    count={preview.willCreate}
                    tone="good"
                    text={`${noun(targetType, preview.willCreate)} will be created`}
                />
                <Consequence
                    icon={Pencil}
                    count={preview.willUpdate}
                    tone="info"
                    text={`${noun(targetType, preview.willUpdate)} will be updated`}
                />
                <Consequence
                    icon={Minus}
                    count={preview.willSkip}
                    tone="muted"
                    text={`${noun(targetType, preview.willSkip)} already exist and will be left alone`}
                />
                <Consequence
                    icon={AlertTriangle}
                    count={preview.willFail}
                    tone="bad"
                    text="rows have errors and will not be imported"
                />

                {preview.itemGroupsToCreate > 0 || preview.openingStockToRecord > 0 ? (
                    <li className="mt-1 border-t border-border pt-3">
                        <ul className="flex flex-col gap-3">
                            <Consequence
                                icon={FolderPlus}
                                count={preview.itemGroupsToCreate}
                                tone="info"
                                text={`new ${preview.itemGroupsToCreate === 1 ? "category" : "categories"} will be created along the way`}
                            />
                            <Consequence
                                icon={Warehouse}
                                count={preview.openingStockToRecord}
                                tone="info"
                                text={`${preview.openingStockToRecord === 1 ? "item" : "items"} will be given a starting stock quantity`}
                            />
                        </ul>
                    </li>
                ) : null}

                {nothingToDo ? (
                    <li className="text-sm text-muted-foreground">
                        Nothing in this file would change anything. Every row either has an
                        error or matches something you already have.
                    </li>
                ) : null}
            </ul>

            <label
                className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-4",
                    confirmed
                        ? "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                        : "border-border bg-card",
                )}
            >
                <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => onConfirmedChange(event.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span className="text-sm text-foreground">
                    I have read the above and want to import this file into my{" "}
                    {IMPORT_TARGET_LABELS[targetType].toLowerCase()}.
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                        This cannot be undone.
                    </span>
                </span>
            </label>
        </div>
    );
}
