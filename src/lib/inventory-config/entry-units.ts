/** A unit a stock movement can be entered in. */
export type EntryUnit = {
    id: string;
    label: string;
    /** How many base units one of these is worth. The base unit itself is 1. */
    factor: number;
};

type ConversionLike = {
    unit?: { id?: string; name?: string } | null;
    variantId?: string | null;
    factor?: number | null;
};

/**
 * The conversions that apply to whichever option is being moved.
 *
 * A larger unit belongs to one option: a sack of Large need not exist for
 * Small, and where both exist they need not hold the same amount. A
 * conversion with no option belongs to the item and applies to any of them.
 */
export function conversionsForOption(
    conversions: readonly ConversionLike[],
    variantId?: string,
) {
    return conversions.filter(
        (conversion) =>
            conversion.unit?.id &&
            (!conversion.variantId || conversion.variantId === variantId),
    );
}

/**
 * The units a movement can be entered in: the base unit, then the larger ones.
 *
 * Deduplicated by unit, first definition winning. Stock is counted in one unit
 * and a conversion only answers "how many base units is one of these", so the
 * same unit offered twice is a question the shop cannot answer — and React,
 * quite reasonably, refuses to key a list on it.
 *
 * That case became reachable the moment a conversion could be defined per
 * option: three options each sold by the six-pack are three conversions on one
 * unit, and a list built from all of them offers "6 Pack" three times.
 */
export function toEntryUnits(
    baseUnit: { id?: string; name?: string } | null | undefined,
    conversions: readonly ConversionLike[],
): EntryUnit[] {
    const byUnit = new Map<string, EntryUnit>();

    if (baseUnit?.id) {
        byUnit.set(baseUnit.id, {
            id: baseUnit.id,
            label: baseUnit.name || "units",
            factor: 1,
        });
    }

    for (const conversion of conversions) {
        const unitId = conversion.unit?.id;

        if (!unitId || byUnit.has(unitId)) continue;

        byUnit.set(unitId, {
            id: unitId,
            label: conversion.unit?.name || "unit",
            factor: conversion.factor || 1,
        });
    }

    return [...byUnit.values()];
}
