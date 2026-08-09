/**
 * Pricing for Sale Management.
 *
 * Two layers, and only two:
 *
 *   1. **Base price** — one per item per unit of measure. This is the price,
 *      the one a merchant thinks in. It lives on the Items & Pricings tab.
 *   2. **Channel override** — an explicit exception for one channel. A channel
 *      with no override *inherits* the base, so changing the base moves every
 *      channel that never disagreed with it.
 *
 * The base is never overwritten. A channel price is a separate record that
 * points at the base, which is what makes "reset to base" a real operation
 * rather than a guess at what the number used to be.
 *
 * An override can be an absolute amount or an adjustment. The adjustment forms
 * matter more than they look: "delivery is 15% dearer" stays true when the base
 * moves, where a hard-typed absolute silently goes stale the first time costs
 * change. Absolute is still there for the cases where the number is negotiated
 * rather than derived.
 */

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

/** One sellable unit of an item: its base unit, or a package built on it. */
export type PriceUnit = {
    id: string;
    label: string;
    /** How many base units this holds. The base unit itself is 1. */
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
    /** Mirrors the item's inventory status — configurable here or via inventory. */
    available: boolean;
    baseUnitLabel: string;
    units: PriceUnit[];
    /** Base price per unit id. A unit with no entry is simply not priced. */
    basePrices: Record<string, number | undefined>;
    /** Stock unit cost from inventory when stock was added (read-only in pricing). */
    unitCost?: number;
    /** Category add-ons / modifiers (e.g. Extra 1 shot, Milk, Syrup) */
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

/**
 * What a channel sells: which items are on it, and any price exceptions.
 * Keyed `${itemId}:${unitId}`.
 */
export type ChannelListing = {
    channelId: string;
    itemIds: string[];
    globalRule?: PriceOverride;
    overrides: Record<string, PriceOverride>;
};

export function listingKey(itemId: string, unitId: string) {
    return `${itemId}:${unitId}`;
}

/** Rounds to cents so a percentage markup never produces 3.4500000000000006. */
function toMoney(value: number) {
    return Math.round(value * 100) / 100;
}

/**
 * What a channel actually charges. `undefined` when the item has no base price
 * for that unit and no absolute override — an unpriced unit is not sellable,
 * which is how inventory declares units without committing to selling them.
 */
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

/** Short label for the override chip: "+15%", "+$0.50". */
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

/** The number the override's own input shows, so editing round-trips. */
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

/**
 * Price per base unit, so packages can be compared honestly.
 *
 * A case at $28 and a can at $1.50 are not comparable until both are expressed
 * per can — and "is my case actually cheaper than 24 singles" is the question a
 * merchant is really asking when they set package prices.
 */
export function unitEconomics(price: number | undefined, factor: number) {
    if (price === undefined || factor <= 0) return undefined;

    return price / factor;
}
