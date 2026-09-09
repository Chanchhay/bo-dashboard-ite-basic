
export type PriceOverride =
    | { kind: "INHERIT" }
    | { kind: "MARKUP_PERCENT"; percent: number }
    | { kind: "MARKUP_AMOUNT"; amount: number };

export const overrideKinds = [
    "INHERIT",
    "MARKUP_PERCENT",
    "MARKUP_AMOUNT",
] as const;

export type OverrideKind = (typeof overrideKinds)[number];

export const overrideKindLabels: Record<OverrideKind, string> = {
    INHERIT: "Same as base",
    MARKUP_PERCENT: "Base + %",
    MARKUP_AMOUNT: "Base + amount",
};

export type PriceUnit = {
    id: string;
    label: string;
    factor: number;
};

export type ItemAddOn = {
    id: string;
    name: string;
    price: number;
    available: boolean;
};

export type PricedItem = {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    itemType?: string;
    groupId: string;
    available: boolean;
    baseUnitLabel: string;
    units: PriceUnit[];
    basePrices: Record<string, number | undefined>;
    unitCost?: number;
    addOns?: ItemAddOn[];
};

export type PricingGroup = {
    id: string;
    name: string;
};

export type SellingChannel = {
    id: string;
    code: string;
    name: string;
    description: string;
};

export type ChannelListing = {
    channelId: string;
    itemIds: string[];
    globalRule?: PriceOverride;
    overrides: Record<string, PriceOverride>;
};

export function listingKey(itemId: string, unitId: string) {
    return `${itemId}:${unitId}`;
}

export function channelLineKey(
    itemId: string,
    variantId?: string,
    unitId?: string,
) {
    return `${itemId}:${variantId || ""}:${unitId || ""}`;
}

function toMoney(value: number) {
    return Math.round(value * 100) / 100;
}

export function effectivePrice(
    base: number | undefined,
    override: PriceOverride | undefined,
    globalRule?: PriceOverride,
): number | undefined {
    const activeRule =
        !override || override.kind === "INHERIT" ? globalRule : override;

    if (!activeRule || activeRule.kind === "INHERIT") return base;

    if (base === undefined) return undefined;

    if (activeRule.kind === "MARKUP_PERCENT") {
        return toMoney(base * (1 + activeRule.percent / 100));
    }

    return toMoney(base + activeRule.amount);
}

export function isOverridden(override: PriceOverride | undefined) {
    return Boolean(override) && override!.kind !== "INHERIT";
}

export function describeOverride(
    override: PriceOverride | undefined,
    globalRule?: PriceOverride,
) {
    const activeRule =
        !override || override.kind === "INHERIT" ? globalRule : override;

    if (!activeRule || activeRule.kind === "INHERIT") return "";

    if (activeRule.kind === "MARKUP_PERCENT") {
        const sign = activeRule.percent >= 0 ? "+" : "";
        return `${sign}${activeRule.percent}%`;
    }

    const sign = activeRule.amount >= 0 ? "+" : "";
    return `${sign}${activeRule.amount}`;
}

export function overrideValue(override: PriceOverride | undefined) {
    if (!override || override.kind === "INHERIT") return "";
    if (override.kind === "MARKUP_PERCENT") return String(override.percent);
    return String(override.amount);
}

export function buildOverride(
    kind: OverrideKind,
    raw: string,
): PriceOverride {
    const value = Number(raw);
    const safe = Number.isFinite(value) ? value : 0;

    switch (kind) {
        case "MARKUP_PERCENT":
            return { kind, percent: safe };
        case "MARKUP_AMOUNT":
            return { kind, amount: safe };
        default:
            return { kind: "INHERIT" };
    }
}

export function unitEconomics(price: number | undefined, factor: number) {
    if (price === undefined || factor <= 0) return undefined;

    return price / factor;
}
