
import type { UomConversion } from "@/lib/inventory-config/units";

export type AddOn = {
    id: string;
    name: string;
    baseUnitId: string;
    usePerOrder: number;
    conversions: UomConversion[];
    note?: string;
};

export const addOnSelectionRules = ["ANY", "UP_TO"] as const;

export type AddOnSelectionRule = (typeof addOnSelectionRules)[number];

export type AddOnSet = {
    id: string;
    name: string;
    rule: AddOnSelectionRule;
    maxChoices?: number;
    required: boolean;
    addOnIds: string[];
};

export type OptionPreset = {
    id: string;
    name: string;
    type: "SELECTION" | "COLOR";
    required: boolean;
    values: OptionPresetValue[];
};

export type OptionPresetValue = {
    id: string;
    value: string;
    colorHex?: string;
};

export type UsageCount = { items: number };
