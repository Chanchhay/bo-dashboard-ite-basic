"use client";

import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

export function calculateNetSellingPrice(cost: number, targetMarginPercent: number): number {
    if (cost <= 0) return 0;
    if (targetMarginPercent >= 100 || targetMarginPercent < 0) {
        throw new Error("Target Margin ត្រូវតែចន្លោះពី 0% ទៅ 99.99%");
    }

    const marginDecimal = targetMarginPercent / 100;
    return cost / (1 - marginDecimal);
}

export function calculateCustomerPrice(netPrice: number, taxRatePercent: number = 0): {
    netPrice: number;
    taxAmount: number;
    finalPrice: number;
} {
    const taxAmount = netPrice * (taxRatePercent / 100);
    const finalPrice = netPrice + taxAmount;

    return {
        netPrice,
        taxAmount,
        finalPrice,
    };
}

export function calculateGrossMargin(netPrice: number, cost: number): number {
    if (netPrice <= 0) return 0;
    return ((netPrice - cost) / netPrice) * 100;
}

export type PriceDrafts = Record<string, string>;

export function soldAsKey(
    itemId: string,
    kind: "BASE" | "OPTION" | "PACK",
    id?: string,
    variantId?: string,
) {
    if (kind === "BASE") return `${itemId}::base`;
    if (kind === "PACK") return `${itemId}::PACK::${id}::${variantId ?? ""}`;

    return `${itemId}::${kind}::${id}`;
}

export function addOnKey(addOnId: string) {
    return `addon::${addOnId}`;
}

export function draftAmount(
    draft: string | undefined,
    saved: number | null | undefined,
) {
    if (draft === undefined) return saved ?? undefined;

    const typed = draft.trim();

    if (typed === "") return undefined;

    const amount = Number(typed);

    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : undefined;
}

export type SoldAsRow = {
    key: string;
    label: string;
    description: string;
    saved: number | null | undefined;
    unitCost?: number;
    kind: "BASE" | "OPTION" | "PACK";
};

export type UnitCostLookup = (variantId?: string) => number | undefined;

export function soldAsRowsOf(
    item: InventoryItem,
    unitCostFor: UnitCostLookup,
): SoldAsRow[] {
    const baseUnitLabel = item.unit?.name || "base unit";
    const unitWord = baseUnitLabel.toLowerCase();
    const countOfUnits = (amount: number) =>
        `${formatAmount(amount)} ${unitWord}${amount === 1 ? "" : "s"}`;

    const options = (item.variants || []).filter(
        (variant) => variant.id && variant.name?.trim(),
    );
    const packs = (item.uomConversions || []).filter(
        (conversion) => conversion.unit?.id,
    );

    return [
        ...(options.length
            ? []
            : [
                  {
                      key: soldAsKey(item.id, "BASE"),
                      label: `One ${unitWord}`,
                      description: `What a customer pays for a single ${unitWord}.`,
                      saved: item.price,
                      unitCost: unitCostFor(),
                      kind: "BASE" as const,
                  },
              ]),
        ...options.map((option) => ({
            key: soldAsKey(item.id, "OPTION", option.id),
            label: option.name || "Option",
            description: `One ${unitWord} of ${option.name}.`,
            saved: option.price,
            unitCost: unitCostFor(option.id),
            kind: "OPTION" as const,
        })),
        ...packs.map((conversion) => {
            const holds = conversion.factor ?? 1;
            const unitName = conversion.unit?.name || "Pack";
            const packUnitCost = unitCostFor(conversion.variantId || undefined);

            return {
                key: soldAsKey(
                    item.id,
                    "PACK",
                    conversion.unit?.id,
                    conversion.variantId || undefined,
                ),
                label: conversion.variantName
                    ? `${unitName} of ${conversion.variantName}`
                    : unitName,
                description: `Holds ${countOfUnits(holds)}${
                    conversion.variantName ? ` of ${conversion.variantName}` : ""
                }. One sale takes that many off the shelf.`,
                saved: conversion.price,
                unitCost: packUnitCost === undefined ? undefined : packUnitCost * holds,
                kind: "PACK" as const,
            };
        }),
    ];
}

export function PriceInput({
    value,
    label,
    onChange,
    disabled,
    disabledHint,
}: {
    value: string;
    label: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    disabledHint?: string;
}) {
    return (
        <div className="relative flex w-full items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground">
                $
            </span>
            <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={disabled ? "Stock in first" : "Not sold"}
                aria-label={label}
                disabled={disabled}
                title={disabled ? disabledHint : undefined}
                className={cn(
                    controlClassName,
                    "h-9 pr-2 pl-6 text-sm font-semibold",
                    disabled && "cursor-not-allowed opacity-60",
                )}
            />
        </div>
    );
}
