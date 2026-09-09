export type EntryUnit = {
    id: string;
    label: string;
    factor: number;
};

type ConversionLike = {
    unit?: { id?: string; name?: string } | null;
    variantId?: string | null;
    factor?: number | null;
};

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
