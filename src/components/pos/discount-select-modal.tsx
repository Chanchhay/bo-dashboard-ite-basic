"use client";

import { useMemo, useState } from "react";
import {
    Percent,
    DollarSign,
    Tag,
    Ticket,
    Check,
    Loader2,
    X,
    Sparkles,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import { useGetDiscountsQuery, useGetCouponsQuery } from "@/services/discountApi";

export type AppliedDiscountRule = {
    type: "PERCENTAGE" | "FIXED" | "FINAL_PRICE";
    value: number;
    maxDiscountAmount?: number;
    discountId?: string;
    discountCode?: string;
    isCoupon?: boolean;
    isMembership?: boolean;
    label?: string;
    scope?: string;
    targetItemIds?: string[];
    targetItemGroupIds?: string[];
    minOrderAmount?: number;
    minQuantity?: number;
    buyQuantity?: number;
    getQuantity?: number;
};

interface DiscountSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtotal: number;
    currency?: string;
    items?: { itemId: string; unitPrice: number; quantity: number }[];
    currentDiscountAmount: number;
    activeRule?: AppliedDiscountRule | null;
    onApplyDiscountRule: (rule: AppliedDiscountRule | null) => Promise<void>;
}

export function DiscountSelectModal({
    open,
    onOpenChange,
    subtotal,
    currency,
    items = [],
    currentDiscountAmount,
    activeRule,
    onApplyDiscountRule,
}: DiscountSelectModalProps) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [tab, setTab] = useState<"ACTIVE" | "CUSTOM" | "COUPON">("ACTIVE");
    const [isApplying, setIsApplying] = useState(false);

    // Queries
    const { data: discounts = [], isLoading: isDiscountsLoading } = useGetDiscountsQuery();
    const { data: coupons = [], isLoading: isCouponsLoading } = useGetCouponsQuery();

    // Custom discount state
    const [customType, setCustomType] = useState<"PERCENTAGE" | "FIXED" | "FINAL_PRICE">("PERCENTAGE");
    const [customValue, setCustomValue] = useState<string>("");

    // Coupon code state
    const [couponCodeInput, setCouponCodeInput] = useState<string>("");
    const [couponError, setCouponError] = useState<string>("");

    const activeDiscounts = useMemo(() => {
        return discounts.filter((d) => {
            if (d.status !== "ACTIVE" || d.requiresCoupon) return false;
            if (d.applicableChannels && d.applicableChannels.length > 0) {
                return d.applicableChannels.includes("POS");
            }
            return true;
        });
    }, [discounts]);

    const calculateCustomPreview = (): number => {
        const val = parseFloat(customValue);
        if (isNaN(val) || val <= 0) return 0;
        if (customType === "PERCENTAGE") {
            return Math.min(subtotal, (subtotal * val) / 100);
        }
        if (customType === "FIXED") {
            return Math.min(subtotal, val);
        }
        if (customType === "FINAL_PRICE") {
            if (val >= subtotal) return 0;
            return Math.min(subtotal, Math.max(0, subtotal - val));
        }
        return 0;
    };

    const handleApplyRule = async (rule: AppliedDiscountRule | null) => {
        setIsApplying(true);
        try {
            await onApplyDiscountRule(rule);
            if (rule) {
                toast({
                    tone: "success",
                    title: "Discount applied",
                    description: `Applied ${rule.label || "discount"} to cart. It will automatically re-apply as matching items are added!`,
                });
            } else {
                toast({
                    tone: "info",
                    title: "Discount removed",
                    description: "Removed discount from current order.",
                });
            }
            onOpenChange(false);
        } catch (err) {
            toast({
                tone: "error",
                title: "Could not apply discount",
                description: "Please check the discount value and try again.",
            });
        } finally {
            setIsApplying(false);
        }
    };

    const handleApplyCustom = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(customValue);
        if (isNaN(val) || val <= 0) {
            toast({
                tone: "error",
                title: "Invalid input",
                description: "Please enter a positive value.",
            });
            return;
        }

        if (customType === "FINAL_PRICE") {
            if (val >= subtotal) {
                toast({
                    tone: "error",
                    title: "Invalid final price",
                    description: `The price after discount (${format(val, currency)}) must be less than the subtotal before discount (${format(subtotal, currency)}).`,
                });
                return;
            }

            const rule: AppliedDiscountRule = {
                type: "FINAL_PRICE",
                value: val,
                label: `Price: ${format(val, currency)}`,
            };
            handleApplyRule(rule);
            return;
        }

        const rule: AppliedDiscountRule = {
            type: customType,
            value: val,
            label: customType === "PERCENTAGE" ? `${val}% OFF` : `-${format(val, currency)}`,
        };

        handleApplyRule(rule);
    };

    const handleApplyCoupon = (e: React.FormEvent) => {
        e.preventDefault();
        setCouponError("");
        const code = couponCodeInput.trim().toUpperCase();
        if (!code) {
            setCouponError("Please enter a coupon code.");
            return;
        }

        const match = coupons.find(
            (c) => c.code.toUpperCase() === code
        );

        if (!match) {
            setCouponError("Invalid promo / coupon code.");
            return;
        }

        if (match.status !== "ACTIVE") {
            setCouponError(`This coupon code is currently ${match.status.toLowerCase()}.`);
            return;
        }

        const now = new Date();

        if (match.startsAt && new Date(match.startsAt) > now) {
            setCouponError("This promo coupon is not active yet.");
            return;
        }

        if (match.endsAt && new Date(match.endsAt) < now) {
            setCouponError("This promo coupon has expired.");
            return;
        }

        if (match.usageLimit != null && match.usedCount >= match.usageLimit) {
            setCouponError("This coupon has reached its maximum usage limit.");
            return;
        }

        if (match.minPurchaseAmount && subtotal < match.minPurchaseAmount) {
            setCouponError(
                `Minimum purchase amount for this coupon is ${format(match.minPurchaseAmount, currency)}.`
            );
            return;
        }

        const discObj = discounts.find((d) => d.id === match.discountId) || match.discount;
        const type = discObj?.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
        const val = discObj?.value ?? 0;
        const scope = discObj?.scope === "SPECIFIC_ITEMS" || discObj?.scope === "ITEM" ? "SPECIFIC_ITEMS" : "ALL_ITEMS";
        const targetItemIds = discObj && "targets" in discObj && Array.isArray((discObj as any).targets)
            ? (discObj as any).targets.map((t: any) => t.targetId)
            : undefined;
        const maxDiscountAmount = discObj && "maxDiscountAmount" in discObj ? (discObj as any).maxDiscountAmount : undefined;

        const rule: AppliedDiscountRule = {
            type,
            value: val,
            discountId: match.discountId,
            discountCode: match.code,
            isCoupon: true,
            label: `Coupon ${match.code}`,
            scope,
            targetItemIds: targetItemIds && targetItemIds.length > 0 ? targetItemIds : undefined,
            maxDiscountAmount,
        };

        handleApplyRule(rule);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary" />
                            Apply POS Discount
                        </DialogTitle>
                    </div>

                    {/* Mode Tabs */}
                    <div data-tour="discount-modal-tabs" className="grid grid-cols-3 gap-1.5 pt-3">
                        {(
                            [
                                { key: "ACTIVE", icon: Tag, label: `Promotions (${activeDiscounts.length})` },
                                { key: "CUSTOM", icon: Percent, label: "Custom / $" },
                                { key: "COUPON", icon: Ticket, label: "Coupon Code" },
                            ] as const
                        ).map(({ key, icon: Icon, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                className={`h-9 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden transition-all ${tab === key
                                        ? "bg-primary text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{label}</span>
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                <div className="p-5">
                    {/* Active Applied Discount Banner */}
                    {(currentDiscountAmount > 0 || activeRule) && (
                        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-amber-900">
                                        {activeRule?.isCoupon || activeRule?.discountCode ? "Applied Coupon" : "Applied Discount"}
                                    </span>
                                    {activeRule?.label && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                                            {activeRule.label}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-extrabold text-brand-red mt-0.5">
                                    -{format(currentDiscountAmount, currency)}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyRule(null)}
                                disabled={isApplying}
                                className="h-8 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                        </div>
                    )}

                    {tab === "ACTIVE" && (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {isDiscountsLoading ? (
                                <div className="py-12 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading promotions...
                                </div>
                            ) : activeDiscounts.length === 0 ? (
                                <div className="py-10 text-center space-y-2">
                                    <Tag className="h-8 w-8 mx-auto text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-700">No active promotions</p>
                                    <p className="text-xs text-gray-500">
                                        Use "Custom % / $" to set a custom discount.
                                    </p>
                                </div>
                            ) : (
                                activeDiscounts.map((d) => {
                                    const targetItemIds = d.targets
                                        ?.filter((t) => t.targetType === "ITEM")
                                        .map((t) => t.targetId) || [];
                                    const targetItemGroupIds = d.targets
                                        ?.filter((t) => t.targetType === "ITEM_GROUP")
                                        .map((t) => t.targetId) || [];

                                    const isSpecificItems = d.scope === "SPECIFIC_ITEMS" || d.scope === "ITEM";
                                    const isSpecificCategories = d.scope === "SPECIFIC_CATEGORIES" || d.scope === "CATEGORY";

                                    const hasMatchingItem = !isSpecificItems || targetItemIds.length === 0 || items.some((item) => targetItemIds.includes(item.itemId));
                                    const meetsMinOrder = !d.minOrderAmount || subtotal >= d.minOrderAmount;
                                    
                                    const totalCartQty = items.reduce((sum, i) => sum + i.quantity, 0);
                                    const meetsMinQty = !d.minQuantity || totalCartQty >= d.minQuantity;

                                    const isEligible = hasMatchingItem && meetsMinOrder && meetsMinQty;
                                    const isSelected = activeRule?.discountId === d.id;

                                    // Build human-friendly requirement guidance for the cashier
                                    let conditionGuidance: string | null = null;
                                    if (!meetsMinOrder && d.minOrderAmount) {
                                        const remaining = Math.max(0, d.minOrderAmount - subtotal);
                                        conditionGuidance = `🛒 Add ${format(remaining, currency)} more to unlock this discount`;
                                    } else if (!meetsMinQty && d.minQuantity) {
                                        const remainingQty = d.minQuantity - totalCartQty;
                                        conditionGuidance = `📦 Add ${remainingQty} more item(s) to qualify (Requires ${d.minQuantity})`;
                                    } else if (!hasMatchingItem && isSpecificItems) {
                                        conditionGuidance = `🏷️ Add matching item to cart to apply discount`;
                                    } else if (d.ruleType === "BUY_X_GET_Y" || (d.buyQuantity && d.getQuantity)) {
                                        conditionGuidance = `🎁 Buy ${d.buyQuantity ?? 0} Get ${d.getQuantity ?? 0} Free promotion`;
                                    }

                                    const rule: AppliedDiscountRule = {
                                        type: d.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
                                        value: d.value,
                                        maxDiscountAmount: d.maxDiscountAmount,
                                        discountId: d.id,
                                        label: d.name,
                                        scope: d.scope,
                                        targetItemIds: targetItemIds.length > 0 ? targetItemIds : undefined,
                                        targetItemGroupIds: targetItemGroupIds.length > 0 ? targetItemGroupIds : undefined,
                                        minOrderAmount: d.minOrderAmount,
                                        minQuantity: d.minQuantity,
                                        buyQuantity: d.buyQuantity,
                                        getQuantity: d.getQuantity,
                                    };

                                    return (
                                        <div
                                            key={d.id}
                                            onClick={() => handleApplyRule(rule)}
                                            className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "border-primary/60 bg-primary/5 shadow-xs"
                                                    : isEligible
                                                    ? "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                                                    : "border-amber-200 bg-amber-50/30 hover:bg-amber-50/50"
                                            }`}
                                        >
                                            <div className="space-y-1.5 flex-1 pr-3">
                                                <div className="flex items-center flex-wrap gap-1.5">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {d.name}
                                                    </span>

                                                    {/* Discount Value Badge */}
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-primary">
                                                        {d.type === "PERCENTAGE" ? `${d.value}% OFF` : `-${format(d.value, currency)}`}
                                                    </span>

                                                    {/* Condition Badges */}
                                                    {d.minOrderAmount ? d.minOrderAmount > 0 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                            Min. {format(d.minOrderAmount, currency)}
                                                        </span>
                                                    ) : null}

                                                    {d.minQuantity ? d.minQuantity > 0 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                                            Min. {d.minQuantity} Items
                                                        </span>
                                                    ) : null}

                                                    {d.buyQuantity && d.getQuantity ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                            Buy {d.buyQuantity} Get {d.getQuantity} Free
                                                        </span>
                                                    ) : null}

                                                    {isSpecificItems && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Specific Items
                                                        </span>
                                                    )}

                                                    {isSpecificCategories && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                                                            Specific Category
                                                        </span>
                                                    )}
                                                </div>

                                                {d.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-1">
                                                        {d.description}
                                                    </p>
                                                )}

                                                {/* Cashier Guidance Helper Label */}
                                                {conditionGuidance && (
                                                    <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg w-fit border border-amber-200/60">
                                                        <span>{conditionGuidance}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right shrink-0">
                                                <Button
                                                    variant={isSelected ? "default" : "ghost"}
                                                    size="sm"
                                                    disabled={isApplying}
                                                    className={`h-7 text-xs font-semibold rounded-lg ${
                                                        isSelected
                                                            ? "bg-primary text-white"
                                                            : isEligible
                                                            ? "text-primary group-hover:bg-primary group-hover:text-white"
                                                            : "text-amber-800 bg-amber-100/80 hover:bg-amber-200"
                                                    }`}
                                                >
                                                    {isSelected ? (
                                                        <>
                                                            <Check className="h-3.5 w-3.5 mr-1" /> Applied
                                                        </>
                                                    ) : isEligible ? (
                                                        "Apply"
                                                    ) : (
                                                        "Select"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {tab === "CUSTOM" && (
                        <form onSubmit={handleApplyCustom} className="space-y-4">
                            <div className="grid grid-cols-3 gap-1.5">
                                {(
                                    [
                                        { type: "PERCENTAGE", icon: Percent, label: "% Off" },
                                        { type: "FIXED", icon: DollarSign, label: "Amount Off" },
                                        { type: "FINAL_PRICE", icon: Tag, label: "Final Price" },
                                    ] as const
                                ).map(({ type, icon: Icon, label }) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setCustomType(type)}
                                        className={`h-14 rounded-xl border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all ${customType === type
                                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="custom-val" className="text-xs font-bold text-gray-700">
                                        {customType === "PERCENTAGE" && "Discount Percentage (% OFF)"}
                                        {customType === "FIXED" && "Discount Amount ($ OFF)"}
                                        {customType === "FINAL_PRICE" && "Target Price After Discount ($)"}
                                    </Label>
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        Subtotal: {format(subtotal, currency)}
                                    </span>
                                </div>
                                <Input
                                    id="custom-val"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    placeholder={
                                        customType === "PERCENTAGE"
                                            ? "e.g. 10 (10% OFF)"
                                            : customType === "FIXED"
                                                ? "e.g. 5.00 ($5.00 OFF)"
                                                : `e.g. 15.00 (Original is ${format(subtotal, currency)})`
                                    }
                                    className="h-11 text-base font-bold rounded-xl"
                                    autoFocus
                                />
                            </div>

                            {/* Live Calculation Breakdown */}
                            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Price before discount:</span>
                                    <span className="font-semibold text-gray-900">{format(subtotal, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-brand-red font-bold">
                                    <span>Calculated discount:</span>
                                    <span>-{format(calculateCustomPreview(), currency)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm font-extrabold text-primary">
                                    <span>Price after discount:</span>
                                    <span>{format(Math.max(0, subtotal - calculateCustomPreview()), currency)}</span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isApplying || calculateCustomPreview() <= 0}
                                className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md"
                            >
                                {isApplying ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <Check className="h-4 w-4 mr-1" />
                                )}
                                Apply Manual Discount
                            </Button>
                        </form>
                    )}

                    {tab === "COUPON" && (
                        <form onSubmit={handleApplyCoupon} className="space-y-4">
                            {couponError && (
                                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
                                    {couponError}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="coupon-code" className="text-xs font-bold text-gray-700">
                                    Enter Promo / Coupon Code
                                </Label>
                                <div className="relative">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="coupon-code"
                                        value={couponCodeInput}
                                        onChange={(e) => setCouponCodeInput(e.target.value)}
                                        placeholder="e.g. SUMMER10"
                                        className="pl-9 h-11 text-base font-bold uppercase rounded-xl"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isApplying || !couponCodeInput.trim()}
                                className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md"
                            >
                                {isApplying ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-1" />
                                )}
                                Validate & Apply Coupon
                            </Button>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
