/**
 * Units of measure, modelled on CartonCloud's product UOM concept.
 *
 * The important idea: **conversions belong to the item, not to the unit.**
 *
 * Each item picks a *base unit of measure* — the smallest quantity it is
 * sellable and pickable in — and then declares conversions against it: "1
 * carton = 6 bottles". The factor always reads as *base units per one of the
 * larger unit*, which is the direction people get wrong, so the editor states
 * it and offers a swap.
 *
 * Making conversions per-item is what lets a sack of rice weigh 25 kg while a
 * sack of flour weighs 20 — both are "sacks", and neither fact is true of the
 * unit itself. It also means packaging needs no separate concept: "sold by the
 * bottle, holds 750 ml" is just a conversion on an item whose base is
 * millilitres.
 *
 * The global library holds only what is universally true of a unit: its name,
 * its symbol, and what kind of thing it measures.
 */

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
    /** Platform-owned units are selectable but locked: never edited or deleted. */
    system: boolean;
    note?: string;
};

/**
 * One conversion on an item: how many base units make up one `unitId`.
 *
 * `factor` is always ">= 1 base unit per one of this unit", never the inverse.
 */
export type UomConversion = {
    id: string;
    unitId: string;
    factor: number;
    /**
     * Which option this larger unit is for.
     *
     * A shop that sells Large by the case need not sell Small that way, and
     * the two need not hold the same number — so the option is part of what a
     * conversion is. Empty on an item with no options.
     */
    variantId?: string;
};

/** An item's full unit of measure setup. */
export type ItemUom = {
    /** The smallest sellable, pickable quantity. Stock is held in this unit. */
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

/** `1 carton = 6 bottle` */
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

/** Converts an amount expressed in `conversion`'s unit into base units. */
export function toBaseQuantity(
    quantity: number,
    conversion: UomConversion | undefined,
) {
    return conversion ? quantity * conversion.factor : quantity;
}

/** Trims trailing zeros so 25000 reads as "25,000" and 453.6 stays 453.6. */
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

/**
 * Checks one conversion against the item's base unit and the conversions it
 * already carries.
 */
export function validateConversion(
    draft: { unitId: string; factor: string; variantId?: string },
    baseUnitId: string,
    existing: readonly UomConversion[],
    editingId?: string,
    /** Options the item is sold in. One must be named when it has any. */
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

    // A case of Large is not a case of Small, so which one has to be said.
    if (options.length && !draft.variantId) {
        errors.variantId = "Choose which option this unit is for.";
    }

    const factor = Number(draft.factor);

    if (draft.factor.trim() === "") {
        errors.factor = "Enter how many base units this holds.";
    } else if (!Number.isFinite(factor) || factor <= 0) {
        errors.factor = "Must be a number greater than zero.";
    } else if (factor < 1) {
        // The classic inversion: 1/6 instead of 6. Catchable, so catch it.
        errors.factor =
            "A conversion holds at least one base unit — did you mean the other way round? Use Swap.";
    } else if (factor > itemLimits.conversionFactor) {
        // Matches the item schema's cap, so an over-large factor is caught
        // here in the dialog rather than on the far-away save.
        errors.factor = `A conversion cannot be larger than ${itemLimits.conversionFactor.toLocaleString()}.`;
    }

    return errors;
}
