"use client";

import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

/**
 * 1. គណនា Net Selling Price (មិនទាន់រួមបញ្ចូល Tax) តាម Target Margin
 * Formula: Net Price = Cost / (1 - Target Margin)
 */
export function calculateNetSellingPrice(cost: number, targetMarginPercent: number): number {
    if (cost <= 0) return 0;
    if (targetMarginPercent >= 100 || targetMarginPercent < 0) {
        throw new Error("Target Margin ត្រូវតែចន្លោះពី 0% ទៅ 99.99%");
    }

    const marginDecimal = targetMarginPercent / 100;
    return cost / (1 - marginDecimal);
}

/**
 * 2. គណនា Tax និង Final Customer Price (Gross Price)
 */
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

/**
 * 3. គណនា Gross Margin % ត្រឹមត្រូវ (គណនាលើ Net Price មិនគិត Tax)
 * Formula: Gross Margin % = ((Net Price - Cost) / Net Price) * 100
 */
export function calculateGrossMargin(netPrice: number, cost: number): number {
    if (netPrice <= 0) return 0;
    return ((netPrice - cost) / netPrice) * 100;
}

/**
 * Every way one item is sold, and the box each price is typed into.
 *
 * Lifted out of the item card it used to live in so it could outlive it: the
 * card listed items on a screen that has since become a table, while the form
 * that prices them still needs to know what an item sells as.
 */
/**
 * Prices are typed, so they live as text until they are saved.
 *
 * Keyed across every item on the page, so a rule applied to everything and a
 * price typed by hand are the same kind of edit and survive together — and a
 * price typed in one item's form is still there after the form is closed.
 */
export type PriceDrafts = Record<string, string>;

/**
 * One sellable thing: the item itself, an option of it, or a pack of it.
 *
 * A pack is keyed by its option as well as its unit. The same unit can be
 * defined for several options — a six pack of Large and a six pack of Small
 * are both "6 Pack" and are priced apart — so keying on the unit alone made
 * all of them one box: typing in any of them wrote to every one, and saving
 * gave them all the same price.
 */
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

/** An add-on's price is one number for the business, so it is keyed alone. */
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

/** What one sellable line of an item costs to buy and what it sells for. */
export type SoldAsRow = {
    key: string;
    /** What a customer is buying: "One can", "Large", "6 Pack of Large". */
    label: string;
    /** A plain sentence saying what they get for the price. */
    description: string;
    saved: number | null | undefined;
    /** What the stock behind it cost. Undefined when nothing is costed yet. */
    unitCost?: number;
    /** Which of the three kinds of row this is, for its heading. */
    kind: "BASE" | "OPTION" | "PACK";
};

/**
 * Every way one item is sold, in the order a shop thinks of them.
 *
 * Shared so the summary row and the form it opens can never disagree about
 * what the item sells as — the row counts these lines and the form prices
 * them, and a row promising three prices that the form does not ask for would
 * be worse than no summary at all.
 */
/**
 * What one base unit of a given option cost.
 *
 * A lookup rather than a number, because each option is its own shelf: S/Black
 * received at $2.00 sits beside S/Blue received at $1.50, and one figure for
 * the whole item would quote the wrong margin on all but one of them. Called
 * with no option for an item sold as itself.
 */
export type UnitCostLookup = (variantId?: string) => number | undefined;

export function soldAsRowsOf(
    item: InventoryItem,
    unitCostFor: UnitCostLookup,
): SoldAsRow[] {
    const baseUnitLabel = item.unit?.name || "base unit";
    /** "can", for reading inside a sentence. */
    const unitWord = baseUnitLabel.toLowerCase();
    /** "6 cans" / "1 can" — never "1 base unit", which means nothing to a shop. */
    const countOfUnits = (amount: number) =>
        `${formatAmount(amount)} ${unitWord}${amount === 1 ? "" : "s"}`;

    const options = (item.variants || []).filter(
        (variant) => variant.id && variant.name?.trim(),
    );
    const packs = (item.uomConversions || []).filter(
        (conversion) => conversion.unit?.id,
    );

    return [
        // An item sold in options is always sold as one of them, so its own
        // price would never be charged and is not asked for.
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
            // A pack draws down the option it was declared for, so it costs
            // what that option's stock cost.
            const packUnitCost = unitCostFor(conversion.variantId || undefined);

            return {
                key: soldAsKey(
                    item.id,
                    "PACK",
                    conversion.unit?.id,
                    conversion.variantId || undefined,
                ),
                // The conversion says which option it is for, so the row does too.
                label: conversion.variantName
                    ? `${unitName} of ${conversion.variantName}`
                    : unitName,
                description: `Holds ${countOfUnits(holds)}${
                    conversion.variantName ? ` of ${conversion.variantName}` : ""
                }. One sale takes that many off the shelf.`,
                saved: conversion.price,
                // It costs what everything inside it cost.
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
    /** Nothing is priced before its stock cost is known. */
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
