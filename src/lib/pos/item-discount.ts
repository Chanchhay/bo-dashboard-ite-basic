import type { DiscountResponse } from "@/lib/api/discount";

export type UnitDiscountPreview = {
    badge: string;
    reducedPrice?: number;
};

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

function needsWholeOrder(discount: DiscountResponse): boolean {
    if (discount.ruleType === "BUY_X_GET_Y") return true;
    if (discount.buyQuantity && discount.getQuantity) return true;
    if (discount.minOrderAmount && discount.minOrderAmount > 0) return true;
    if (discount.minQuantity && discount.minQuantity > 1) return true;
    return false;
}

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

    if (discount.maxDiscountAmount != null) {
        off = Math.min(off, discount.maxDiscountAmount);
    }

    return { badge, reducedPrice: Math.max(0, unitPrice - off) };
}
