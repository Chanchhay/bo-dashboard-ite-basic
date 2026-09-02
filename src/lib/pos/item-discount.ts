import type { DiscountResponse } from "@/lib/api/discount";

/**
 * Which discount an item is actually sold under, and what that is worth on a
 * single unit of it.
 *
 * The till shows a promotion on the item card before anything is rung up, and
 * the order applies one when it is. Those two answers have to be the same
 * discount, or the card advertises a price the order never charges — so both
 * screens choose through here rather than each searching the list its own way.
 */

/** What the item card can say about a promotion, once it has picked one. */
export type UnitDiscountPreview = {
    /** The chip on the card — "-10%", "-$2.00", "Buy 2 Get 1". */
    badge: string;
    /**
     * What one costs with the promotion applied, or undefined when no honest
     * per-unit price exists for it. A bundle, a minimum spend or a minimum
     * quantity is only settled by a whole order, so the card names the
     * promotion without quoting a price it cannot stand behind.
     */
    reducedPrice?: number;
};

/**
 * The discount that applies to an item, most specifically targeted first.
 *
 * The order of these three is the whole point: a promotion aimed at this one
 * item beats one aimed at its category, which beats a storewide one. Picking
 * by whatever happens to come first in the list instead means the card can
 * advertise the storewide 10% while the order applies the item's own 25%.
 *
 * `itemGroupId` is optional because an order line does not carry its item's
 * category. Without it a category-scoped discount can only be matched loosely
 * — as any discount targeting some category — which is what the order screen
 * has always done; pass it wherever it is known to match exactly.
 */
export function findMatchingPosDiscount(
    activePosDiscounts: DiscountResponse[],
    item: { itemId: string; itemGroupId?: string | null },
): DiscountResponse | null {
    const itemMatch = activePosDiscounts.find((discount) => {
        if (discount.scope === "SPECIFIC_ITEMS" || (discount.scope as string) === "ITEM") {
            return discount.targets?.some(
                (target) => target.targetType === "ITEM" && target.targetId === item.itemId,
            );
        }
        return false;
    });
    if (itemMatch) return itemMatch;

    const categoryMatch = activePosDiscounts.find((discount) => {
        if (discount.scope === "SPECIFIC_CATEGORIES" || (discount.scope as string) === "CATEGORY") {
            return discount.targets?.some(
                (target) =>
                    target.targetType === "ITEM_GROUP" &&
                    (item.itemGroupId == null || target.targetId === item.itemGroupId),
            );
        }
        return false;
    });
    if (categoryMatch) return categoryMatch;

    return (
        activePosDiscounts.find(
            (discount) => discount.scope === "ALL_ITEMS" || !discount.scope,
        ) || null
    );
}

/** Whether a promotion needs a whole order before it can be said to apply. */
function needsWholeOrder(discount: DiscountResponse): boolean {
    if (discount.ruleType === "BUY_X_GET_Y") return true;
    if (discount.buyQuantity && discount.getQuantity) return true;
    if (discount.minOrderAmount && discount.minOrderAmount > 0) return true;
    if (discount.minQuantity && discount.minQuantity > 1) return true;
    return false;
}

/**
 * What a promotion takes off one unit at `unitPrice`.
 *
 * Returns no `reducedPrice` for anything a single unit cannot settle, so the
 * card never quotes a price the order will decline to charge.
 */
export function previewUnitDiscount(
    discount: DiscountResponse | null,
    unitPrice: number,
    formatMoney: (value: number) => string,
): UnitDiscountPreview | null {
    if (!discount || !(unitPrice > 0)) return null;

    if (discount.ruleType === "BUY_X_GET_Y" || (discount.buyQuantity && discount.getQuantity)) {
        return { badge: `Buy ${discount.buyQuantity} Get ${discount.getQuantity}` };
    }

    const isPercentage = discount.type === "PERCENTAGE";
    const isFixed =
        discount.type === "FIXED_AMOUNT" || (discount.type as string) === "FIXED";

    if (!(discount.value > 0) || (!isPercentage && !isFixed)) return null;

    const badge = isPercentage
        ? `-${discount.value}%`
        : `-${formatMoney(discount.value)}`;

    if (needsWholeOrder(discount)) {
        return { badge };
    }

    let off = isPercentage ? (unitPrice * discount.value) / 100 : discount.value;

    // A maximum is a ceiling on the whole order, so a single unit can only
    // ever be reduced by less than it — never more.
    if (discount.maxDiscountAmount != null) {
        off = Math.min(off, discount.maxDiscountAmount);
    }

    return { badge, reducedPrice: Math.max(0, unitPrice - off) };
}
