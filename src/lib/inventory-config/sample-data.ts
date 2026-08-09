/**
 * Hardcoded sample data for the static Item Config screens.
 *
 * This exists so the layout can be judged with realistic content before any API
 * is designed. Delete it the moment the endpoints land.
 */

import type { AddOn, AddOnSet, OptionPreset } from "@/lib/inventory-config/types";
import type { Unit } from "@/lib/inventory-config/units";

export const sampleUnits: Unit[] = [
    // Platform-owned. Selectable everywhere, locked everywhere.
    { id: "u-g", name: "Gram", symbol: "g", category: "MASS", system: true },
    { id: "u-kg", name: "Kilogram", symbol: "kg", category: "MASS", system: true },
    { id: "u-ml", name: "Millilitre", symbol: "ml", category: "VOLUME", system: true },
    { id: "u-l", name: "Litre", symbol: "L", category: "VOLUME", system: true },
    { id: "u-pc", name: "Piece", symbol: "pc", category: "COUNT", system: true },
    { id: "u-dz", name: "Dozen", symbol: "dz", category: "COUNT", system: true },
    { id: "u-ctn", name: "Carton", symbol: "ctn", category: "COUNT", system: true },

    // Business-owned.
    {
        id: "u-bag",
        name: "Bag",
        symbol: "bag",
        category: "COUNT",
        system: false,
        note: "How toppings arrive from the supplier.",
    },
    {
        id: "u-sack",
        name: "Sack",
        symbol: "sack",
        category: "COUNT",
        system: false,
        note: "Rice and flour arrive by the sack — weight varies by item.",
    },
    {
        id: "u-bottle",
        name: "Bottle",
        symbol: "btl",
        category: "COUNT",
        system: false,
    },
    {
        id: "u-cup",
        name: "Cup",
        symbol: "cup",
        category: "COUNT",
        system: false,
    },
    {
        id: "u-shot",
        name: "Shot",
        symbol: "shot",
        category: "VOLUME",
        system: false,
        note: "A single espresso pour.",
    },
];

export const sampleAddOns: AddOn[] = [
    {
        id: "a-pearls",
        name: "Pearls",
        baseUnitId: "u-g",
        usePerOrder: 30,
        conversions: [{ id: "c-pearls-bag", unitId: "u-bag", factor: 3000 }],
        note: "Cooked fresh each morning.",
    },
    {
        id: "a-jelly",
        name: "Grass jelly",
        baseUnitId: "u-g",
        usePerOrder: 30,
        conversions: [{ id: "c-jelly-bag", unitId: "u-bag", factor: 3000 }],
    },
    {
        id: "a-pudding",
        name: "Egg pudding",
        baseUnitId: "u-g",
        usePerOrder: 40,
        conversions: [],
    },
    {
        id: "a-aloe",
        name: "Aloe vera",
        baseUnitId: "u-g",
        usePerOrder: 35,
        conversions: [],
    },
    {
        id: "a-shot",
        name: "Extra shot",
        baseUnitId: "u-shot",
        usePerOrder: 1,
        conversions: [],
    },
    {
        id: "a-cream",
        name: "Whipped cream",
        baseUnitId: "u-g",
        usePerOrder: 20,
        conversions: [],
    },
    {
        id: "a-syrup",
        name: "Vanilla syrup",
        baseUnitId: "u-ml",
        usePerOrder: 15,
        conversions: [
            { id: "c-syrup-btl", unitId: "u-bottle", factor: 750 },
        ],
    },
];

export const sampleAddOnSets: AddOnSet[] = [
    {
        id: "s-toppings",
        name: "Toppings",
        rule: "ANY",
        required: false,
        addOnIds: ["a-pearls", "a-jelly", "a-pudding", "a-aloe"],
    },
    {
        id: "s-extras",
        name: "Extras",
        rule: "UP_TO",
        maxChoices: 2,
        required: false,
        addOnIds: ["a-shot", "a-cream", "a-syrup"],
    },
];

export const sampleOptionPresets: OptionPreset[] = [
    {
        id: "p-size",
        name: "Size",
        type: "SELECTION",
        required: true,
        values: [
            { id: "p-size-s", value: "Small" },
            { id: "p-size-m", value: "Medium" },
            { id: "p-size-l", value: "Large" },
        ],
    },
    {
        id: "p-milk",
        name: "Milk",
        type: "SELECTION",
        required: true,
        values: [
            { id: "p-milk-d", value: "Dairy" },
            { id: "p-milk-o", value: "Oat" },
            { id: "p-milk-a", value: "Almond" },
        ],
    },
    {
        id: "p-sugar",
        name: "Sugar level",
        type: "SELECTION",
        required: true,
        values: [
            { id: "p-sugar-0", value: "0%" },
            { id: "p-sugar-50", value: "50%" },
            { id: "p-sugar-100", value: "100%" },
        ],
    },
    {
        id: "p-colour",
        name: "Cup colour",
        type: "COLOR",
        required: false,
        values: [
            { id: "p-colour-k", value: "Black", colorHex: "#161d16" },
            { id: "p-colour-w", value: "White", colorHex: "#f5f5f5" },
            { id: "p-colour-g", value: "Forest", colorHex: "#00932a" },
        ],
    },
];

/** How many items reference each record. Sample figures until the API exists. */
export const sampleAddOnUsage: Record<string, number> = {
    "a-pearls": 18,
    "a-jelly": 12,
    "a-pudding": 9,
    "a-aloe": 4,
    "a-shot": 6,
    "a-cream": 4,
    "a-syrup": 7,
};

export const sampleOptionPresetUsage: Record<string, number> = {
    "p-size": 24,
    "p-milk": 11,
    "p-sugar": 19,
    "p-colour": 2,
};

/** Units that are in use somewhere, so the library can refuse to delete them. */
export const sampleUnitUsage: Record<string, number> = {
    "u-g": 14,
    "u-ml": 6,
    "u-pc": 21,
    "u-cup": 12,
    "u-bag": 3,
    "u-shot": 1,
    "u-bottle": 2,
};
