import type { InventoryItem } from "@/lib/api/inventory";
import {
    channelLineKey,
    type OverrideKind,
    type PriceOverride,
} from "@/lib/sale-pricing/pricing";

/**
 * The lines a channel can make an exception on.
 *
 * Kept apart from any one screen because both the table and the form it opens
 * have to agree line for line — an exception set against something the shop
 * does not actually sell would never be charged.
 */

/** One exception being typed, with the ids that say what it applies to. */
export type DraftOverride = {
    itemId: string;
    variantId?: string;
    unitId?: string;
    kind: OverrideKind;
    /** Text while it is being typed, like every other price on these screens. */
    value: string;
};

/** One thing this item is sold as, and what the business charges for it. */
export type SoldLine = {
    key: string;
    label: string;
    variantId?: string;
    unitId?: string;
    base?: number;
};

/**
 * Every way an item can be sold, exactly as Set Price lists them.
 *
 * The two screens have to agree line for line, or an exception would be set
 * against something the shop does not actually sell.
 */
export function linesOf(item: InventoryItem): SoldLine[] {
    const unitWord = (item.unit?.name || "unit").toLowerCase();
    const options = (item.variants || []).filter(
        (variant) => variant.id && variant.name?.trim(),
    );
    const packs = (item.uomConversions || []).filter(
        (conversion) => conversion.unit?.id,
    );

    return [
        // An item sold in options is always sold as one of them, so it has no
        // price of its own to mark up.
        ...(options.length
            ? []
            : [
                  {
                      key: channelLineKey(item.id),
                      label: `One ${unitWord}`,
                      base: item.price ?? undefined,
                  },
              ]),
        ...options.map((option) => ({
            key: channelLineKey(item.id, option.id),
            label: option.name || "Option",
            variantId: option.id,
            base: option.price ?? undefined,
        })),
        ...packs.map((conversion) => ({
            key: channelLineKey(
                item.id,
                conversion.variantId || undefined,
                conversion.unit?.id,
            ),
            label: conversion.variantName
                ? `${conversion.unit?.name || "Pack"} of ${conversion.variantName}`
                : conversion.unit?.name || "Pack",
            variantId: conversion.variantId || undefined,
            unitId: conversion.unit?.id,
            base: conversion.price ?? undefined,
        })),
    ];
}

export function toOverride(kind: OverrideKind, raw: string): PriceOverride {
    const amount = Number(raw);
    const safe = Number.isFinite(amount) ? amount : 0;

    if (kind === "MARKUP_PERCENT") return { kind, percent: safe };
    if (kind === "MARKUP_AMOUNT") return { kind, amount: safe };

    return { kind: "INHERIT" };
}
