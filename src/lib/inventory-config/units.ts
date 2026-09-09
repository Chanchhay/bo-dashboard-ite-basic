
import { itemLimits } from "@/lib/api/inventory";

export const unitCategories = ["MASS", "VOLUME", "COUNT"] as const;

export type UnitCategory = (typeof unitCategories)[number];

export const unitCategoryLabels: Record<
    UnitCategory,
    { label: string; hint: string }
> = {
    MASS: {
        label: "Mass",
        hint: "Weight — grams, kilograms, anything you put on a scale.",
    },
    VOLUME: {
        label: "Volume",
        hint: "Liquid or space — millilitres, litres.",
    },
    COUNT: {
        label: "Count",
        hint: "Discrete things you can point at — pieces, cartons, cups.",
    },
};

export type Unit = {
    id: string;
    name: string;
    symbol: string;
    category: UnitCategory;
    system: boolean;
    note?: string;
};

export type UomConversion = {
    id: string;
    unitId: string;
    factor: number;
    variantId?: string;
};

export type ItemUom = {
    baseUnitId: string;
    conversions: UomConversion[];
};

export function findUnit(units: readonly Unit[], id: string | undefined) {
    return units.find((unit) => unit.id === id);
}

export function unitSymbol(units: readonly Unit[], id: string | undefined) {
    return findUnit(units, id)?.symbol ?? "";
}

export function unitsByCategory(units: readonly Unit[]) {
    return unitCategories.map((category) => ({
        category,
        units: units.filter((unit) => unit.category === category),
    }));
}

export function describeConversion(
    units: readonly Unit[],
    baseUnitId: string,
    conversion: UomConversion,
) {
    const from = unitSymbol(units, conversion.unitId);
    const base = unitSymbol(units, baseUnitId);

    if (!from || !base) return "";

    return `1 ${from} = ${formatAmount(conversion.factor)} ${base}`;
}

export function toBaseQuantity(
    quantity: number,
    conversion: UomConversion | undefined,
) {
    return conversion ? quantity * conversion.factor : quantity;
}

export function formatAmount(value: number) {
    if (!Number.isFinite(value)) return "—";

    const rounded = Math.round(value * 1e6) / 1e6;

    return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function validateUnit(
    draft: { name: string; symbol: string; category: UnitCategory },
    existing: readonly Unit[],
    editingId?: string,
) {
    const errors: Record<string, string> = {};
    const name = draft.name.trim();
    const symbol = draft.symbol.trim();
    const others = existing.filter((unit) => unit.id !== editingId);

    if (!name) {
        errors.name = "Unit name is required.";
    } else if (name.length > 50) {
        errors.name = "Unit name must be 50 characters or fewer.";
    } else if (
        others.some((unit) => unit.name.toLowerCase() === name.toLowerCase())
    ) {
        errors.name = "Another unit already uses that name.";
    }

    if (!symbol) {
        errors.symbol = "Symbol is required.";
    } else if (symbol.length > 10) {
        errors.symbol = "Symbol must be 10 characters or fewer.";
    } else if (
        others.some(
            (unit) => unit.symbol.toLowerCase() === symbol.toLowerCase(),
        )
    ) {
        errors.symbol = "Another unit already uses that symbol.";
    }

    return errors;
}

export function validateConversion(
    draft: { unitId: string; factor: string; variantId?: string },
    baseUnitId: string,
    existing: readonly UomConversion[],
    editingId?: string,
    options: readonly { id: string; name: string }[] = [],
) {
    const errors: Record<string, string> = {};

    if (!draft.unitId) {
        errors.unitId = "Choose a unit.";
    } else if (draft.unitId === baseUnitId) {
        errors.unitId = "That is already the base unit.";
    } else if (
        existing.some(
            (conversion) =>
                conversion.id !== editingId &&
                conversion.unitId === draft.unitId &&
                (conversion.variantId || "") === (draft.variantId || ""),
        )
    ) {
        errors.unitId = options.length
            ? "That option already has this unit."
            : "This item already converts that unit.";
    }

    if (options.length && !draft.variantId) {
        errors.variantId = "Choose which option this unit is for.";
    }

    const factor = Number(draft.factor);

    if (draft.factor.trim() === "") {
        errors.factor = "Enter how many base units this holds.";
    } else if (!Number.isFinite(factor) || factor <= 0) {
        errors.factor = "Must be a number greater than zero.";
    } else if (factor < 1) {
        errors.factor =
            "A conversion holds at least one base unit — did you mean the other way round? Use Swap.";
    } else if (factor > itemLimits.conversionFactor) {
        errors.factor = `A conversion cannot be larger than ${itemLimits.conversionFactor.toLocaleString()}.`;
    }

    return errors;
}
