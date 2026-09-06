"use client";

import { useEffect, useMemo, useState } from "react";
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
    currency?: string | null;
    items?: { itemId: string; unitPrice: number; quantity: number }[];
    currentDiscountAmount: number;
    activeRule?: AppliedDiscountRule | null;
    onApplyDiscountRule: (rule: AppliedDiscountRule | null) => Promise<void>;
    mode?: "COUPON" | "CUSTOM";
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
    mode = "COUPON",
}: DiscountSelectModalProps) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [tab, setTab] = useState<"CUSTOM" | "COUPON">("COUPON");
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        if (mode) {
            setTab(mode);
        }
    }, [mode, open]);

    // Queries
    const { data: discounts = [] } = useGetDiscountsQuery();
    const { data: coupons = [] } = useGetCouponsQuery();

    // Custom discount state
    const [customType, setCustomType] = useState<"PERCENTAGE" | "FIXED" | "FINAL_PRICE">("PERCENTAGE");
    const [customValue, setCustomValue] = useState<string>("");

    // Coupon code state
    const [couponCodeInput, setCouponCodeInput] = useState<string>("");
    const [couponError, setCouponError] = useState<string>("");

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
                    description: `Applied ${rule.label || "discount"} to cart.`,
                });
            } else {
                toast({
                    tone: "info",
                    title: "Discount removed",
                    description: "Order total reset to standard item prices.",
                });
            }
            onOpenChange(false);
        } catch (err: unknown) {
            toast({
                tone: "error",
                title: "Could not apply discount",
                description: err instanceof Error ? err.message : "Please try again",
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
                title: "Invalid value",
                description: "Please enter a valid positive discount amount.",
            });
            return;
        }

        let calculatedDiscount = 0;
        let label = "";

        if (customType === "PERCENTAGE") {
            if (val > 100) {
                toast({ tone: "error", title: "Invalid %", description: "Percentage cannot exceed 100%." });
                return;
            }
            calculatedDiscount = (subtotal * val) / 100;
            label = `${val}% OFF (Custom)`;
        } else if (customType === "FIXED") {
            if (val > subtotal) {
                toast({ tone: "error", title: "Amount too high", description: `Discount cannot exceed order subtotal (${format(subtotal, currency)}).` });
                return;
            }
            calculatedDiscount = val;
            label = `-${format(val, currency)} OFF (Custom)`;
        } else if (customType === "FINAL_PRICE") {
            if (val >= subtotal) {
                toast({ tone: "error", title: "Invalid final price", description: `Target price must be less than current subtotal (${format(subtotal, currency)}).` });
                return;
            }
            calculatedDiscount = subtotal - val;
            label = `Special Price: ${format(val, currency)}`;
        }

        const rule: AppliedDiscountRule = {
            type: customType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
            value: customType === "PERCENTAGE" ? val : calculatedDiscount,
            label,
        };

        handleApplyRule(rule);
    };

    const handleApplyCoupon = (e: React.FormEvent) => {
        e.preventDefault();
        setCouponError("");

        const code = couponCodeInput.trim().toUpperCase();
        if (!code) {
            setCouponError("Please enter a coupon code");
            return;
        }

        const match = coupons.find(
            (c) => c.code.toUpperCase() === code && c.status === "ACTIVE"
        );

        if (!match) {
            setCouponError("Invalid or inactive coupon code");
            return;
        }

        if (match.usageLimit != null && match.usedCount >= match.usageLimit) {
            setCouponError("This coupon has reached its maximum usage limit");
            return;
        }

        const discObj = discounts.find((d) => d.id === match.discountId) || discounts.find((d) => d.id === match.discount?.id);
        const discountType = discObj?.type || match.discount?.type || "PERCENTAGE";
        const discountValue = discObj?.value ?? match.discount?.value ?? 0;
        const discountId = discObj?.id || match.discountId || match.discount?.id;

        if (discObj && discObj.status !== "ACTIVE") {
            setCouponError("The discount associated with this coupon is no longer active");
            return;
        }

        if (discObj?.applicableChannels && discObj.applicableChannels.length > 0 && !discObj.applicableChannels.includes("POS")) {
            setCouponError("This coupon is not valid for in-store POS checkout");
            return;
        }

        if (discObj?.minOrderAmount && subtotal < discObj.minOrderAmount) {
            setCouponError(
                `Minimum order amount for this coupon is ${format(discObj.minOrderAmount, currency)} (Current: ${format(subtotal, currency)})`
            );
            return;
        }

        const totalCartQty = items.reduce((sum, i) => sum + i.quantity, 0);
        if (discObj?.minQuantity && totalCartQty < discObj.minQuantity) {
            setCouponError(
                `This coupon requires at least ${discObj.minQuantity} items in the cart (Current: ${totalCartQty})`
            );
            return;
        }

        const targetItemIds = discObj?.targets
            ?.filter((t) => t.targetType === "ITEM")
            .map((t) => t.targetId);

        const scope = discObj?.scope;
        if (scope === "SPECIFIC_ITEMS" || scope === "ITEM") {
            if (targetItemIds && targetItemIds.length > 0) {
                const hasMatchingItem = items.some((i) => targetItemIds.includes(i.itemId));
                if (!hasMatchingItem) {
                    setCouponError("None of the items in your cart qualify for this coupon");
                    return;
                }
            }
        }

        const maxDiscountAmount = discObj?.maxDiscountAmount;

        const rule: AppliedDiscountRule = {
            type: discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
            value: discountValue,
            discountId,
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
                            {tab === "COUPON" ? (
                                <>
                                    <Ticket className="h-5 w-5 text-primary" />
                                    Apply Coupon / Promo Code
                                </>
                            ) : (
                                <>
                                    <Percent className="h-5 w-5 text-primary" />
                                    Custom Discount (% / $)
                                </>
                            )}
                        </DialogTitle>
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
