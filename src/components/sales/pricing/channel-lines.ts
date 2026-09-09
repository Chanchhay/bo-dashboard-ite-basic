import type { InventoryItem } from "@/lib/api/inventory";
import {
    channelLineKey,
    type OverrideKind,
    type PriceOverride,
} from "@/lib/sale-pricing/pricing";

export type DraftOverride = {
    itemId: string;
    variantId?: string;
    unitId?: string;
    kind: OverrideKind;
    value: string;
};

export type SoldLine = {
    key: string;
    label: string;
    variantId?: string;
    unitId?: string;
    base?: number;
};

export function linesOf(item: InventoryItem): SoldLine[] {
    const unitWord = (item.unit?.name || "unit").toLowerCase();
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
