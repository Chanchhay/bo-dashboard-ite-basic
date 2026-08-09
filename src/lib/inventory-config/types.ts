/**
 * Add-ons and option presets for Item Config.
 *
 * Static shapes for the proposal — no API yet. See
 * `api-docs/item-config-plan.md` for why these look the way they do.
 *
 * The short version:
 *   Item     the product. Own unit, stock, barcode.
 *   Option   a choice about it (Size: S/M/L). No stock, no barcode.
 *   Add-on   an extra piled on top (Pearls). Own unit and stock, never scanned,
 *            never sold alone, shared across every item that uses it.
 *
 * Nothing here carries a price. Pricing lives in Sale Management, per channel.
 */

import type { UomConversion } from "@/lib/inventory-config/units";

export type AddOn = {
    id: string;
    name: string;
    /**
     * The smallest quantity this is used in. Every conversion below resolves
     * into it. Add-ons carry no stock of their own — only how much of this
     * unit one selection takes.
     */
    baseUnitId: string;
    /**
     * How much one selection takes off, in base units. Defaults to 1, so a
     * "shot" behaves the obvious way and grams of pearls don't have to be
     * re-expressed as servings.
     */
    usePerOrder: number;
    /** Larger units this is bought in — "1 bag = 3000 g". */
    conversions: UomConversion[];
    note?: string;
};

export const addOnSelectionRules = ["ANY", "UP_TO"] as const;

export type AddOnSelectionRule = (typeof addOnSelectionRules)[number];

export type AddOnSet = {
    id: string;
    name: string;
    rule: AddOnSelectionRule;
    /** Only meaningful when `rule` is `UP_TO`. */
    maxChoices?: number;
    required: boolean;
    addOnIds: string[];
};

/**
 * A reusable list of option values — "Size: Small, Medium, Large" saved once so
 * it isn't retyped on every item.
 *
 * A preset is a starting point, not a live link: applying it copies the values
 * onto the item. Editing the preset later does not reach back and rewrite items
 * already using it, because per-item tweaks are certain (not every drink comes
 * in Large) and a live link would silently mutate hundreds of items nobody
 * reviewed.
 */
export type OptionPreset = {
    id: string;
    name: string;
    /** Mirrors the item attribute types this preset fills in. */
    type: "SELECTION" | "COLOR";
    required: boolean;
    values: OptionPresetValue[];
};

export type OptionPresetValue = {
    id: string;
    value: string;
    /** Only used when `type` is `COLOR`. */
    colorHex?: string;
};

/** How many items currently use a config record. Static sample figure for now. */
export type UsageCount = { items: number };
