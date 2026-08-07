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
    type: "PERCENTAGE" | "FIXED";
    value: number;
    maxDiscountAmount?: number;
    discountId?: string;
    discountCode?: string;
    label?: string;
};

interface DiscountSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtotal: number;
    currency?: string;
    currentDiscountAmount: number;
    activeRule?: AppliedDiscountRule | null;
    onApplyDiscountRule: (rule: AppliedDiscountRule | null) => Promise<void>;
}

export function DiscountSelectModal({
    open,
    onOpenChange,
    subtotal,
    currency,
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
    const [customType, setCustomType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
    const [customValue, setCustomValue] = useState<string>("");

    // Coupon code state
    const [couponCodeInput, setCouponCodeInput] = useState<string>("");
    const [couponError, setCouponError] = useState<string>("");

    const activeDiscounts = useMemo(() => {
        return discounts.filter((d) => d.status === "ACTIVE");
    }, [discounts]);

    const calculateCustomPreview = (): number => {
        const val = parseFloat(customValue);
        if (isNaN(val) || val <= 0) return 0;
        if (customType === "PERCENTAGE") {
            return Math.min(subtotal, (subtotal * val) / 100);
        }
        return Math.min(subtotal, val);
    };

    const handleApplyRule = async (rule: AppliedDiscountRule | null) => {
        setIsApplying(true);
        try {
            await onApplyDiscountRule(rule);
            if (rule) {
                toast({
                    tone: "success",
                    title: "Discount applied",
                    description: `Applied ${rule.label || "discount"} to cart. It will automatically re-apply as items are added!`,
                });
            } else {
                toast({
                    tone: "neutral",
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
                title: "Invalid discount value",
                description: "Please enter a positive discount value.",
            });
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
            (c) => c.code.toUpperCase() === code && c.status === "ACTIVE"
        );

        if (!match) {
            setCouponError("Invalid or inactive coupon code.");
            return;
        }

        if (match.minPurchaseAmount && subtotal < match.minPurchaseAmount) {
            setCouponError(
                `Minimum purchase amount for this coupon is ${format(match.minPurchaseAmount, currency)}.`
            );
            return;
        }

        const type = match.discount?.type ?? "PERCENTAGE";
        const val = match.discount?.value ?? 10;

        const rule: AppliedDiscountRule = {
            type,
            value: val,
            discountId: match.discountId,
            discountCode: match.code,
            label: `Coupon ${match.code}`,
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
                    <div className="flex gap-1.5 pt-3">
                        <button
                            type="button"
                            onClick={() => setTab("ACTIVE")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "ACTIVE"
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Promotions ({activeDiscounts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("CUSTOM")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "CUSTOM"
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Custom % / $
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("COUPON")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "COUPON"
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Coupon Code
                        </button>
                    </div>
                </DialogHeader>

                <div className="p-5">
                    {/* Active Applied Discount Banner */}
                    {(currentDiscountAmount > 0 || activeRule) && (
                        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-amber-900">Applied Discount</span>
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
                                    let amt = 0;
                                    if (d.type === "PERCENTAGE") {
                                        amt = (subtotal * d.value) / 100;
                                        if (d.maxDiscountAmount && amt > d.maxDiscountAmount) {
                                            amt = d.maxDiscountAmount;
                                        }
                                    } else {
                                        amt = d.value;
                                    }
                                    amt = Math.min(subtotal, amt);

                                    const rule: AppliedDiscountRule = {
                                        type: d.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
                                        value: d.value,
                                        maxDiscountAmount: d.maxDiscountAmount,
                                        discountId: d.id,
                                        label: d.name,
                                    };

                                    return (
                                        <div
                                            key={d.id}
                                            onClick={() => handleApplyRule(rule)}
                                            className="group flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:border-primary/50 hover:bg-gray-50 cursor-pointer transition-all"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {d.name}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-primary">
                                                        {d.type === "PERCENTAGE" ? `${d.value}% OFF` : `-${format(d.value, currency)}`}
                                                    </span>
                                                </div>
                                                {d.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-1">
                                                        {d.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-brand-red block">
                                                    -{format(amt, currency)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isApplying}
                                                    className="h-7 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-white rounded-lg mt-0.5"
                                                >
                                                    Apply
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
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomType("PERCENTAGE")}
                                    className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${customType === "PERCENTAGE"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <Percent className="h-4 w-4" /> Percentage (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomType("FIXED")}
                                    className={`flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${customType === "FIXED"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <DollarSign className="h-4 w-4" /> Fixed Amount ($)
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="custom-val" className="text-xs font-bold text-gray-700">
                                    {customType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount ($)"}
                                </Label>
                                <Input
                                    id="custom-val"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    placeholder={customType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5.00"}
                                    className="h-11 text-base font-bold rounded-xl"
                                    autoFocus
                                />
                            </div>

                            {/* Live Preview */}
                            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-600">Current Order Preview:</span>
                                <span className="text-base font-bold text-brand-red">
                                    -{format(calculateCustomPreview(), currency)}
                                </span>
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
                                Apply & Keep Active
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
