import type { PageResult } from "./pagination";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BUY_X_GET_Y";
export type DiscountRuleType = "NO_CONDITION" | "MIN_ORDER_AMOUNT" | "MIN_QUANTITY" | "BUY_X_GET_Y";
export type DiscountScope = "ALL_ITEMS" | "SPECIFIC_ITEMS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_MEMBERSHIP" | "ORDER" | "ITEM" | "CATEGORY";
export type OrderChannel = "POS" | "WEB" | "TELEGRAM" | "MESSENGER";
export type RecordStatus = "ACTIVE" | "INACTIVE";
export type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "USED";

export type DiscountTargetResponse = {
    id: string;
    targetType: "ITEM" | "ITEM_GROUP";
    targetId: string;
    targetName: string;
};

export type DiscountSummaryResponse = {
    id: string;
    name: string;
    type: DiscountType;
    scope: DiscountScope;
    value: number;
};

export type DiscountResponse = {
    id: string;
    businessId: string;
    name: string;
    description?: string;
    type: DiscountType;
    ruleType: DiscountRuleType;
    buyQuantity?: number;
    getQuantity?: number;
    minQuantity?: number;
    value: number;
    scope: DiscountScope;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    requiresCoupon: boolean;
    startsAt: string;
    endsAt: string;
    selectedDays?: string[];
    applicableChannels?: OrderChannel[];
    targets?: DiscountTargetResponse[];
    status: RecordStatus;
    pausedDiscountIds?: string[];
};

export type DiscountPage = PageResult<DiscountResponse>;

export type CreateDiscountInput = {
    name: string;
    description?: string;
    type: DiscountType;
    ruleType: DiscountRuleType;
    buyQuantity?: number;
    getQuantity?: number;
    minQuantity?: number;
    value: number;
    scope: DiscountScope;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    requiresCoupon: boolean;
    startsAt: string;
    endsAt: string;
    selectedDays?: string[];
    status: RecordStatus;
    applicableChannels?: OrderChannel[];
    targetItemIds?: string[];
    targetItemGroupIds?: string[];
    pauseOtherDiscounts?: boolean;
};

export type UpdateDiscountInput = Partial<CreateDiscountInput>;

export type CouponResponse = {
    id: string;
    businessOwnerId: string;
    discountId: string;
    discount?: DiscountSummaryResponse;
    code: string;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    usedCount: number;
    minPurchaseAmount?: number;
    startsAt: string;
    endsAt: string;
    status: CouponStatus;
    createdBy?: string;
};

export type CreateCouponInput = {
    discountId: string;
    code: string;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    minPurchaseAmount?: number;
    startsAt: string;
    endsAt: string;
    status: CouponStatus;
};

export type UpdateCouponInput = Partial<CreateCouponInput>;
