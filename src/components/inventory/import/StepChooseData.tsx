"use client";

import { FolderTree, Package, Warehouse } from "lucide-react";

import {
    IMPORT_TARGET_DESCRIPTIONS,
    IMPORT_TARGET_LABELS,
    IMPORT_TARGET_TYPES,
    type ImportTargetType,
} from "@/lib/api/data-import";
import { cn } from "@/lib/utils";

const ICONS = {
    ITEM_GROUP: FolderTree,
    ITEM: Package,
    OPENING_STOCK: Warehouse,
} as const;

/**
 * What the shop is bringing across.
 *
 * Items is offered first and described most fully because it is what almost
 * every migration actually is — a shop's export puts the category and the
 * quantity on hand in the same row as the item, and this import will take all
 * three from it.
 */
export function StepChooseData({
    value,
    onChange,
}: {
    value: ImportTargetType | null;
    onChange: (next: ImportTargetType) => void;
}) {
    const order: ImportTargetType[] = [
        "ITEM",
        ...IMPORT_TARGET_TYPES.filter((type) => type !== "ITEM"),
    ];

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-base font-semibold text-foreground">
                    What are you importing?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Bring your list across from a spreadsheet. Nothing is added to FluxiBiz
                    until you have seen exactly what will happen.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {order.map((type) => {
                    const Icon = ICONS[type];
                    const selected = value === type;

                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onChange(type)}
                            aria-pressed={selected}
                            className={cn(
                                "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                                selected
                                    ? "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                                    : "border-border bg-card hover:border-primary/40",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex size-9 items-center justify-center rounded-xl",
                                    selected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground",
                                )}
                            >
                                <Icon className="size-4.5" />
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                                {IMPORT_TARGET_LABELS[type]}
                            </span>
                            <span className="text-xs leading-relaxed text-muted-foreground">
                                {IMPORT_TARGET_DESCRIPTIONS[type]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
