"use client";

import { useMemo, useState } from "react";
import {
    Plus,
    Tag,
    Ticket,
    Search,
    Edit2,
    Trash2,
    Calendar,
    Layers,
    Percent,
    DollarSign,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TourButton } from "@/components/onboarding/TourButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMoney } from "@/hooks/useMoney";
import type {
    CouponResponse,
    CouponStatus,
    CreateCouponInput,
    CreateDiscountInput,
    DiscountResponse,
    DiscountRuleType,
    DiscountScope,
    DiscountType,
    OrderChannel,
    RecordStatus,
} from "@/lib/api/discount";
import {
    useActivateCouponMutation,
    useActivateDiscountMutation,
    useCreateCouponMutation,
    useCreateDiscountMutation,
    useDeactivateCouponMutation,
    useDeactivateDiscountMutation,
    useDeleteCouponMutation,
    useDeleteDiscountMutation,
    useGetCouponsQuery,
    useGetDiscountsQuery,
    useUpdateCouponMutation,
    useUpdateDiscountMutation,
} from "@/services/discountApi";
import { useGetInventoryItemOptionsQuery } from "@/services/inventoryApi";

import { ColumnSelectDropdown } from "@/components/ui/ColumnSelectDropdown";
import { SelectField } from "@/components/ui/select-field";

function formatDateTimeForInput(dateStr?: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DiscountsAndCouponsPage() {
    const { format, base } = useMoney();
    const baseSymbol = base?.symbol ?? base?.code ?? "";
    const [activeTab, setActiveTab] = useState<"discounts" | "coupons">("discounts");
    const [searchQuery, setSearchQuery] = useState("");
    const [discountFilter, setDiscountFilter] = useState<"ALL" | "AUTO" | "COUPON">("ALL");

    // --- Column Visibility States ---
    const [discountCols, setDiscountCols] = useState([
        { id: "name", label: "Rule Name", visible: true },
        { id: "typeValue", label: "Type & Value", visible: true },
        { id: "scope", label: "Scope & Targets", visible: true },
        { id: "condition", label: "Condition", visible: true },
        { id: "channels", label: "Channels", visible: true },
        { id: "status", label: "Status", visible: true },
    ]);

    const [couponCols, setCouponCols] = useState([
        { id: "code", label: "Coupon Code", visible: true },
        { id: "discount", label: "Linked Discount", visible: true },
        { id: "usage", label: "Usage Limits", visible: true },
        { id: "minPurchase", label: "Min. Purchase", visible: true },
        { id: "validity", label: "Validity Period", visible: true },
        { id: "status", label: "Status", visible: true },
    ]);

    const isDiscColVisible = (id: string) => discountCols.find((c) => c.id === id)?.visible ?? true;
    const isCoupColVisible = (id: string) => couponCols.find((c) => c.id === id)?.visible ?? true;

    const toggleDiscountCol = (id: string) => {
        setDiscountCols((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    };

    const toggleCouponCol = (id: string) => {
        setCouponCols((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    };

    const resetDiscountCols = () => {
        setDiscountCols((prev) => prev.map((c) => ({ ...c, visible: true })));
    };

    const resetCouponCols = () => {
        setCouponCols((prev) => prev.map((c) => ({ ...c, visible: true })));
    };

    // --- RTK Queries & Mutations ---
    const { data: discounts = [], isLoading: isDiscountsLoading, refetch: refetchDiscounts } = useGetDiscountsQuery();
    const { data: coupons = [], isLoading: isCouponsLoading, refetch: refetchCoupons } = useGetCouponsQuery(undefined);
    const { data: items = [] } = useGetInventoryItemOptionsQuery();

    const [createDiscount, { isLoading: isCreatingDiscount }] = useCreateDiscountMutation();
    const [updateDiscount, { isLoading: isUpdatingDiscount }] = useUpdateDiscountMutation();
    const [activateDiscount] = useActivateDiscountMutation();
    const [deactivateDiscount] = useDeactivateDiscountMutation();
    const [deleteDiscount, { isLoading: isDeletingDiscount }] = useDeleteDiscountMutation();

    const [createCoupon, { isLoading: isCreatingCoupon }] = useCreateCouponMutation();
    const [updateCoupon, { isLoading: isUpdatingCoupon }] = useUpdateCouponMutation();
    const [activateCoupon] = useActivateCouponMutation();
    const [deactivateCoupon] = useDeactivateCouponMutation();
    const [deleteCoupon, { isLoading: isDeletingCoupon }] = useDeleteCouponMutation();

    // --- State for Discount Dialog ---
    const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountResponse | null>(null);
    const [discountFormError, setDiscountFormError] = useState("");

    // Discount Form Data
    const [dName, setDName] = useState("");
    const [dDescription, setDDescription] = useState("");
    const [dType, setDType] = useState<DiscountType>("PERCENTAGE");
    const [dRuleType, setDRuleType] = useState<DiscountRuleType>("NO_CONDITION");
    const [dValue, setDValue] = useState("");
    const [dScope, setDScope] = useState<DiscountScope>("ALL_ITEMS");
    const [dMinOrderAmount, setDMinOrderAmount] = useState("");
    const [dMaxDiscountAmount, setDMaxDiscountAmount] = useState("");
    const [dBuyQty, setDBuyQty] = useState("");
    const [dGetQty, setDGetQty] = useState("");
    const [dMinQty, setDMinQty] = useState("");
    const [dStartsAt, setDStartsAt] = useState("");
    const [dEndsAt, setDEndsAt] = useState("");
    const [dRequiresCoupon, setDRequiresCoupon] = useState(false);
    const [dStatus, setDStatus] = useState<RecordStatus>("ACTIVE");
    const [dChannels, setDChannels] = useState<OrderChannel[]>(["POS", "WEB"]);
    const [dSelectedItems, setDSelectedItems] = useState<string[]>([]);

    // --- State for Coupon Dialog ---
    const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponResponse | null>(null);
    const [couponFormError, setCouponFormError] = useState("");

    const [cDiscountId, setCDiscountId] = useState("");
    const [cCode, setCCode] = useState("");
    const [cUsageLimit, setCUsageLimit] = useState("");
    const [cUsageLimitCustomer, setCUsageLimitCustomer] = useState("");
    const [cMinPurchase, setCMinPurchase] = useState("");
    const [cStartsAt, setCStartsAt] = useState("");
    const [cEndsAt, setCEndsAt] = useState("");
    const [cStatus, setCStatus] = useState<CouponStatus>("ACTIVE");

    // --- Delete confirmation ---
    const [deletingItem, setDeletingItem] = useState<{ id: string; type: "discount" | "coupon"; name: string } | null>(null);

    // --- Filtered Data ---
    const filteredDiscounts = useMemo(() => {
        let list = discounts;
        if (discountFilter === "AUTO") {
            list = list.filter((d) => !d.requiresCoupon);
        } else if (discountFilter === "COUPON") {
            list = list.filter((d) => d.requiresCoupon);
        }
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(
            (d) =>
                d.name.toLowerCase().includes(q) ||
                (d.description && d.description.toLowerCase().includes(q)) ||
                d.type.toLowerCase().includes(q) ||
                d.scope.toLowerCase().includes(q)
        );
    }, [discounts, discountFilter, searchQuery]);

    const filteredCoupons = useMemo(() => {
        if (!searchQuery.trim()) return coupons;
        const q = searchQuery.toLowerCase();
        return coupons.filter(
            (c) =>
                c.code.toLowerCase().includes(q) ||
                (c.discount && c.discount.name.toLowerCase().includes(q))
        );
    }, [coupons, searchQuery]);

    const couponEligibleDiscounts = useMemo(() => {
        return discounts.filter((d) => d.requiresCoupon || d.id === cDiscountId);
    }, [discounts, cDiscountId]);

    // --- Open Create/Edit Handlers ---
    const openCreateDiscount = () => {
        setEditingDiscount(null);
        setDiscountFormError("");
        setDName("");
        setDDescription("");
        setDType("PERCENTAGE");
        setDRuleType("NO_CONDITION");
        setDValue("10");
        setDScope("ALL_ITEMS");
        setDMinOrderAmount("");
        setDMaxDiscountAmount("");
        setDBuyQty("");
        setDGetQty("");
        setDMinQty("");
        setDStartsAt(formatDateTimeForInput(new Date().toISOString()));
        setDEndsAt(formatDateTimeForInput(new Date(Date.now() + 30 * 86400000).toISOString()));
        setDRequiresCoupon(false);
        setDStatus("ACTIVE");
        setDChannels(["POS", "WEB"]);
        setDSelectedItems([]);
        setIsDiscountDialogOpen(true);
    };

    const openEditDiscount = (d: DiscountResponse) => {
        setEditingDiscount(d);
        setDiscountFormError("");
        setDName(d.name);
        setDDescription(d.description || "");
        setDType(d.type);
        setDRuleType(d.ruleType);
        setDValue(d.value !== undefined && d.value !== null ? String(d.value) : "0");
        setDScope(d.scope);
        setDMinOrderAmount(d.minOrderAmount ? String(d.minOrderAmount) : "");
        setDMaxDiscountAmount(d.maxDiscountAmount ? String(d.maxDiscountAmount) : "");
        setDBuyQty(d.buyQuantity ? String(d.buyQuantity) : "");
        setDGetQty(d.getQuantity ? String(d.getQuantity) : "");
        setDMinQty(d.minQuantity ? String(d.minQuantity) : "");
        setDStartsAt(formatDateTimeForInput(d.startsAt));
        setDEndsAt(formatDateTimeForInput(d.endsAt));
        setDRequiresCoupon(d.requiresCoupon ?? false);
        setDStatus(d.status || "ACTIVE");
        setDChannels(d.applicableChannels || ["POS", "WEB"]);
        setDSelectedItems(d.targets?.filter((t) => t.targetType === "ITEM").map((t) => t.targetId) || []);
        setIsDiscountDialogOpen(true);
    };

    const handleSaveDiscount = async () => {
        setDiscountFormError("");
        if (!dName.trim()) {
            setDiscountFormError("Discount name is required.");
            return;
        }

        if (dRuleType === "BUY_X_GET_Y") {
            if (!dBuyQty || Number(dBuyQty) <= 0 || !dGetQty || Number(dGetQty) <= 0) {
                setDiscountFormError("Please enter valid Buy Quantity (X) and Get Quantity (Y).");
                return;
            }
        } else {
            if (!dValue || Number(dValue) <= 0) {
                setDiscountFormError("A valid positive discount value is required.");
                return;
            }
        }

        if (!dStartsAt || !dEndsAt) {
            setDiscountFormError("Start and End dates are required.");
            return;
        }

        const isSpecificScope = dScope === "ITEM" || dScope === "SPECIFIC_ITEMS";
        if (isSpecificScope && dSelectedItems.length === 0) {
            setDiscountFormError("Please select at least one product when scope is set to Specific Products.");
            return;
        }

        const scopePayload: DiscountScope = isSpecificScope ? "SPECIFIC_ITEMS" : "ALL_ITEMS";

        const payload: CreateDiscountInput = {
            name: dName.trim(),
            description: dDescription.trim() || undefined,
            type: dType || "FIXED_AMOUNT",
            ruleType: dRuleType,
            value: dRuleType === "BUY_X_GET_Y" ? 1 : (Number(dValue) || 1),
            scope: scopePayload,
            minOrderAmount: dMinOrderAmount ? Number(dMinOrderAmount) : undefined,
            maxDiscountAmount: dMaxDiscountAmount ? Number(dMaxDiscountAmount) : undefined,
            buyQuantity: dBuyQty ? Math.floor(Math.abs(Number(dBuyQty))) : undefined,
            getQuantity: dGetQty ? Math.floor(Math.abs(Number(dGetQty))) : undefined,
            minQuantity: dMinQty ? Math.floor(Math.abs(Number(dMinQty))) : undefined,
            requiresCoupon: dRequiresCoupon,
            startsAt: new Date(dStartsAt).toISOString(),
            endsAt: new Date(dEndsAt).toISOString(),
            status: dStatus,
            applicableChannels: dChannels,
            targetItemIds: isSpecificScope ? dSelectedItems : [],
        };

        try {
            if (editingDiscount) {
                await updateDiscount({ id: editingDiscount.id, body: payload }).unwrap();
            } else {
                await createDiscount(payload).unwrap();
            }
            setIsDiscountDialogOpen(false);
            refetchDiscounts();
        } catch (err) {
            setDiscountFormError(getApiErrorMessage(err, "Failed to save discount rule."));
        }
    };

    const openCreateCoupon = () => {
        setEditingCoupon(null);
        setCouponFormError("");
        const eligible = discounts.filter((d) => d.requiresCoupon);
        setCDiscountId(eligible[0]?.id || "");
        setCCode(`SAVE${Math.floor(100 + Math.random() * 900)}`);
        setCUsageLimit("100");
        setCUsageLimitCustomer("1");
        setCMinPurchase("0");
        setCStartsAt(formatDateTimeForInput(new Date().toISOString()));
        setCEndsAt(formatDateTimeForInput(new Date(Date.now() + 30 * 86400000).toISOString()));
        setCStatus("ACTIVE");
        setIsCouponDialogOpen(true);
    };

    const openEditCoupon = (c: CouponResponse) => {
        setEditingCoupon(c);
        setCouponFormError("");
        setCDiscountId(c.discountId);
        setCCode(c.code);
        setCUsageLimit(c.usageLimit ? String(c.usageLimit) : "");
        setCUsageLimitCustomer(c.usageLimitPerCustomer ? String(c.usageLimitPerCustomer) : "");
        setCMinPurchase(c.minPurchaseAmount ? String(c.minPurchaseAmount) : "");
        setCStartsAt(formatDateTimeForInput(c.startsAt));
        setCEndsAt(formatDateTimeForInput(c.endsAt));
        setCStatus(c.status || "ACTIVE");
        setIsCouponDialogOpen(true);
    };

    const handleSaveCoupon = async () => {
        setCouponFormError("");
        if (!cDiscountId) {
            setCouponFormError("Please select a discount rule to link.");
            return;
        }
        const targetDisc = discounts.find((d) => d.id === cDiscountId);
        if (targetDisc && !targetDisc.requiresCoupon) {
            setCouponFormError(
                `"${targetDisc.name}" does not have "Requires Coupon Code" enabled. Please edit the discount rule and check "Requires Coupon Code" first.`
            );
            return;
        }
        if (!cCode.trim()) {
            setCouponFormError("Coupon code is required.");
            return;
        }
        if (!cStartsAt || !cEndsAt) {
            setCouponFormError("Validity dates are required.");
            return;
        }

        const payload: CreateCouponInput = {
            discountId: cDiscountId,
            code: cCode.trim().toUpperCase(),
            usageLimit: cUsageLimit ? Number(cUsageLimit) : undefined,
            usageLimitPerCustomer: cUsageLimitCustomer ? Number(cUsageLimitCustomer) : undefined,
            minPurchaseAmount: cMinPurchase ? Number(cMinPurchase) : undefined,
            startsAt: new Date(cStartsAt).toISOString(),
            endsAt: new Date(cEndsAt).toISOString(),
            status: cStatus,
        };

        try {
            if (editingCoupon) {
                await updateCoupon({ id: editingCoupon.id, body: payload }).unwrap();
            } else {
                await createCoupon(payload).unwrap();
            }
            setIsCouponDialogOpen(false);
            refetchCoupons();
        } catch (err) {
            setCouponFormError(getApiErrorMessage(err, "Failed to save coupon code."));
        }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            if (deletingItem.type === "discount") {
                await deleteDiscount(deletingItem.id).unwrap();
                refetchDiscounts();
            } else {
                await deleteCoupon(deletingItem.id).unwrap();
                refetchCoupons();
            }
            setDeletingItem(null);
        } catch (err) {
            alert(getApiErrorMessage(err, `Failed to delete ${deletingItem.type}.`));
        }
    };

    const handleToggleDiscountStatus = async (d: DiscountResponse) => {
        try {
            if (d.status === "ACTIVE") {
                await deactivateDiscount(d.id).unwrap();
            } else {
                await activateDiscount(d.id).unwrap();
            }
            refetchDiscounts();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to change status."));
        }
    };

    const handleToggleCouponStatus = async (c: CouponResponse) => {
        try {
            if (c.status === "ACTIVE") {
                await deactivateCoupon(c.id).unwrap();
            } else {
                await activateCoupon(c.id).unwrap();
            }
            refetchCoupons();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to change coupon status."));
        }
    };

    const toggleChannel = (channel: OrderChannel) => {
        if (dChannels.includes(channel)) {
            setDChannels(dChannels.filter((c) => c !== channel));
        } else {
            setDChannels([...dChannels, channel]);
        }
    };

    const toggleSelectedItem = (itemId: string) => {
        if (dSelectedItems.includes(itemId)) {
            setDSelectedItems(dSelectedItems.filter((id) => id !== itemId));
        } else {
            setDSelectedItems([...dSelectedItems, itemId]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div data-tour="discounts-list" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Discounts & Coupons
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage promotional discounts, custom rule conditions, and customer promo coupon codes.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <TourButton />
                    <Button
                        data-tour="create-discount-btn"
                        onClick={activeTab === "discounts" ? openCreateDiscount : openCreateCoupon}
                        className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        {activeTab === "discounts" ? "Create Discount" : "Create Coupon"}
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
                <div data-tour="discounts-tabs" className="flex items-center space-x-2">
                    <button
                        onClick={() => setActiveTab("discounts")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "discounts"
                                ? "bg-primary/10 text-primary dark:text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Tag className="h-4 w-4" />
                        Discounts ({discounts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("coupons")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "coupons"
                                ? "bg-primary/10 text-primary dark:text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Ticket className="h-4 w-4" />
                        Coupons ({coupons.length})
                    </button>
                </div>

                <div data-tour="discounts-search-bar" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab}...`}
                            className="h-10 pl-9 text-sm rounded-xl border border-border bg-card"
                        />
                    </div>
                    <ColumnSelectDropdown
                        columns={activeTab === "discounts" ? discountCols : couponCols}
                        onToggleColumn={activeTab === "discounts" ? toggleDiscountCol : toggleCouponCol}
                        onResetDefaults={activeTab === "discounts" ? resetDiscountCols : resetCouponCols}
                    />
                </div>
            </div>

            {/* Discounts Table */}
            {activeTab === "discounts" && (
                <div data-tour="discounts-table-container" className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                    {isDiscountsLoading ? (
                        <div className="flex justify-center items-center py-16 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading discount rules...
                        </div>
                    ) : filteredDiscounts.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground space-y-2">
                            <Tag className="h-8 w-8 mx-auto opacity-40" />
                            <p className="font-medium text-base text-foreground">No discount rules found</p>
                            <p className="text-xs">Create discount rules to offer promotional pricing across POS and storefront channels.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    {isDiscColVisible("name") && <TableHead>Rule Name</TableHead>}
                                    {isDiscColVisible("typeValue") && <TableHead>Type & Value</TableHead>}
                                    {isDiscColVisible("scope") && <TableHead>Scope</TableHead>}
                                    {isDiscColVisible("condition") && <TableHead>Condition</TableHead>}
                                    {isDiscColVisible("channels") && <TableHead>Channels</TableHead>}
                                    {isDiscColVisible("status") && <TableHead>Status</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDiscounts.map((d) => (
                                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                                        {isDiscColVisible("name") && (
                                            <TableCell>
                                                <div className="font-semibold text-foreground">{d.name}</div>
                                                {d.description && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                        {d.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                        {isDiscColVisible("typeValue") && (
                                            <TableCell>
                                                <div className="inline-flex items-center gap-1 font-bold text-primary">
                                                    {d.ruleType === "BUY_X_GET_Y" || String(d.type) === "BUY_X_GET_Y"
                                                        ? `Buy ${d.buyQuantity ?? "X"} Get ${d.getQuantity ?? "Y"}`
                                                        : d.type === "PERCENTAGE"
                                                        ? `${d.value}%`
                                                        : format(d.value)}
                                                </div>
                                            </TableCell>
                                        )}
                                        {isDiscColVisible("scope") && (
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                    {d.scope === "ALL_ITEMS" || d.scope === "ORDER"
                                                        ? "All Items"
                                                        : d.scope === "SPECIFIC_ITEMS" || d.scope === "ITEM"
                                                        ? "Specific Items"
                                                        : d.scope === "SPECIFIC_CATEGORIES" || d.scope === "CATEGORY"
                                                        ? "Specific Categories"
                                                        : d.scope === "SPECIFIC_MEMBERSHIP"
                                                        ? "Specific Members"
                                                        : d.scope}
                                                </span>
                                            </TableCell>
                                        )}
                                        {isDiscColVisible("condition") && (
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground">
                                                    {d.ruleType === "NO_CONDITION" && "No condition"}
                                                    {d.ruleType === "MIN_ORDER_AMOUNT" && `Min. ${format(d.minOrderAmount ?? 0)}`}
                                                    {d.ruleType === "MIN_QUANTITY" && `Min. qty ${d.minQuantity}`}
                                                    {d.ruleType === "BUY_X_GET_Y" && `Buy ${d.buyQuantity} get ${d.getQuantity}`}
                                                </div>
                                            </TableCell>
                                        )}
                                        {isDiscColVisible("channels") && (
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(d.applicableChannels && d.applicableChannels.length > 0
                                                        ? d.applicableChannels
                                                        : ["ALL"]
                                                    ).map((ch) => (
                                                        <span
                                                            key={ch}
                                                            className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium bg-muted text-muted-foreground rounded"
                                                        >
                                                            {ch}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        )}
                                        {isDiscColVisible("status") && (
                                            <TableCell>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        d.status === "ACTIVE"
                                                            ? "bg-primary/10 text-primary border border-primary/20"
                                                            : "bg-muted text-muted-foreground border border-border"
                                                    }`}
                                                >
                                                    {d.status === "ACTIVE" ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDiscount(d)}
                                                    className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
                                                    title="Edit Discount"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeletingItem({ id: d.id, type: "discount", name: d.name })}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                                                    title="Delete Discount"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

            {/* Coupons Table */}
            {activeTab === "coupons" && (
                <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                    {isCouponsLoading ? (
                        <div className="flex justify-center items-center py-16 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading coupons...
                        </div>
                    ) : filteredCoupons.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground space-y-2">
                            <Ticket className="h-8 w-8 mx-auto opacity-40" />
                            <p className="font-medium text-base text-foreground">No promo coupons found</p>
                            <p className="text-xs">Create coupon codes to share promo deals with customers.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    {isCoupColVisible("code") && <TableHead>Coupon Code</TableHead>}
                                    {isCoupColVisible("discount") && <TableHead>Linked Discount Rule</TableHead>}
                                    {isCoupColVisible("usage") && <TableHead>Usage Limits</TableHead>}
                                    {isCoupColVisible("minPurchase") && <TableHead>Min. Purchase</TableHead>}
                                    {isCoupColVisible("validity") && <TableHead>Validity</TableHead>}
                                    {isCoupColVisible("status") && <TableHead>Status</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCoupons.map((c) => (
                                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                                        {isCoupColVisible("code") && (
                                            <TableCell>
                                                <div className="font-mono font-bold text-base text-primary">
                                                    {c.code}
                                                </div>
                                            </TableCell>
                                        )}
                                        {isCoupColVisible("discount") && (
                                            <TableCell>
                                                <div className="font-medium text-foreground">
                                                    {c.discount?.name || "Linked Discount"}
                                                </div>
                                                {c.discount && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.discount.type === "PERCENTAGE" ? `${c.discount.value}% OFF` : `${format(c.discount.value)} OFF`}
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                        {isCoupColVisible("usage") && (
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground">
                                                    {c.usedCount ?? 0} used / {c.usageLimit ?? "∞"} max
                                                </div>
                                            </TableCell>
                                        )}
                                        {isCoupColVisible("minPurchase") && (
                                            <TableCell className="text-xs text-muted-foreground">
                                                {c.minPurchaseAmount ? format(c.minPurchaseAmount) : "None"}
                                            </TableCell>
                                        )}
                                        {isCoupColVisible("validity") && (
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 opacity-60" />
                                                    {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : "—"} to{" "}
                                                    {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : "—"}
                                                </div>
                                            </TableCell>
                                        )}
                                        {isCoupColVisible("status") && (
                                            <TableCell>
                                                {(() => {
                                                    if (c.status === "INACTIVE") {
                                                        return (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                                                Inactive
                                                            </span>
                                                        );
                                                    }
                                                    const now = new Date();
                                                    if (c.endsAt && new Date(c.endsAt) < now) {
                                                        return (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                Expired
                                                            </span>
                                                        );
                                                    }
                                                    if (c.usageLimit != null && (c.usedCount ?? 0) >= c.usageLimit) {
                                                        return (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                                Used Up
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                            Active
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditCoupon(c)}
                                                    className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
                                                    title="Edit Coupon"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeletingItem({ id: c.id, type: "coupon", name: c.code })}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                                                    title="Delete Coupon"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

            {/* --- CREATE / EDIT DISCOUNT DIALOG --- */}
            <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="p-6 pb-4 border-b border-border shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                                {editingDiscount ? "Edit Discount Rule" : "Create New Discount Rule"}
                            </DialogTitle>
                        </DialogHeader>

                        {discountFormError && (
                            <div className="mt-3 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                                {discountFormError}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Name, Type & Description */}
                        {dRuleType !== "BUY_X_GET_Y" ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="dName">Discount Name *</Label>
                                        <Input
                                            id="dName"
                                            value={dName}
                                            onChange={(e) => setDName(e.target.value)}
                                            placeholder="e.g. Summer Special 15%"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="dType">Discount Calculation Type *</Label>
                                        <SelectField
                                            id="dType"
                                            value={dType}
                                            onValueChange={(val) => setDType(val as DiscountType)}
                                            options={[
                                                { value: "PERCENTAGE", label: "Percentage (%)" },
                                                { value: "FIXED_AMOUNT", label: `Fixed Amount (${baseSymbol})` },
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="dDesc">Description</Label>
                                    <Textarea
                                        id="dDesc"
                                        value={dDescription}
                                        onChange={(e) => setDDescription(e.target.value)}
                                        placeholder="Describe the discount promotion..."
                                        rows={2}
                                    />
                                </div>

                                {/* Value & Scope */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="dValue">
                                            Discount Value ({dType === "PERCENTAGE" ? "%" : baseSymbol}) *
                                        </Label>
                                        <Input
                                            id="dValue"
                                            type="number"
                                            step="0.01"
                                            value={dValue}
                                            onChange={(e) => setDValue(e.target.value)}
                                            placeholder="15"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="dScope">Scope *</Label>
                                        <SelectField
                                            id="dScope"
                                            value={dScope === "ITEM" || dScope === "SPECIFIC_ITEMS" ? "SPECIFIC_ITEMS" : "ALL_ITEMS"}
                                            onValueChange={(val) => setDScope(val as DiscountScope)}
                                            options={[
                                                { value: "ALL_ITEMS", label: "Entire Order" },
                                                { value: "SPECIFIC_ITEMS", label: "Specific Products" },
                                            ]}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="dName">Discount Name *</Label>
                                        <Input
                                            id="dName"
                                            value={dName}
                                            onChange={(e) => setDName(e.target.value)}
                                            placeholder="e.g. Buy 2 Get 1 Free Promo"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="dScope">Scope *</Label>
                                        <SelectField
                                            id="dScope"
                                            value={dScope === "ITEM" || dScope === "SPECIFIC_ITEMS" ? "SPECIFIC_ITEMS" : "ALL_ITEMS"}
                                            onValueChange={(val) => setDScope(val as DiscountScope)}
                                            options={[
                                                { value: "ALL_ITEMS", label: "Entire Order" },
                                                { value: "SPECIFIC_ITEMS", label: "Specific Products" },
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="dDesc">Description</Label>
                                    <Textarea
                                        id="dDesc"
                                        value={dDescription}
                                        onChange={(e) => setDDescription(e.target.value)}
                                        placeholder="Describe the promo rules..."
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}

                        {/* Specific Items Selection when scope = SPECIFIC_ITEMS */}
                        {(dScope === "ITEM" || dScope === "SPECIFIC_ITEMS") && (
                            <div className="space-y-1.5 border border-border p-3 rounded-lg bg-muted/20">
                                <Label>Target Products</Label>
                                <p className="text-xs text-muted-foreground mb-2">Select items this discount applies to:</p>
                                <div className="max-h-36 overflow-y-auto space-y-1 border border-border p-2 rounded-md bg-background">
                                    {items.map((item) => (
                                        <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={dSelectedItems.includes(item.id)}
                                                onChange={() => toggleSelectedItem(item.id)}
                                                className="h-4 w-4 rounded border-input text-primary accent-primary focus:ring-primary"
                                            />
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="text-muted-foreground">({format(item.price)})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rule Conditions */}
                        <div className="space-y-2 border border-border p-3 rounded-lg bg-muted/10">
                            <Label htmlFor="dRuleType">Condition Rule Type</Label>
                            <SelectField
                                id="dRuleType"
                                value={dRuleType}
                                onValueChange={(val) => setDRuleType(val as DiscountRuleType)}
                                options={[
                                    { value: "NO_CONDITION", label: "No Minimum Condition" },
                                    { value: "MIN_ORDER_AMOUNT", label: "Minimum Order Amount" },
                                    { value: "MIN_QUANTITY", label: "Minimum Quantity" },
                                    { value: "BUY_X_GET_Y", label: "Buy X Get Y Free" },
                                ]}
                            />

                            {dRuleType === "MIN_ORDER_AMOUNT" && (
                                <div className="pt-2">
                                    <Label htmlFor="dMinOrder">Minimum Order Subtotal ({baseSymbol})</Label>
                                    <Input
                                        id="dMinOrder"
                                        type="number"
                                        step="0.01"
                                        value={dMinOrderAmount}
                                        onChange={(e) => setDMinOrderAmount(e.target.value)}
                                        placeholder="50.00"
                                    />
                                </div>
                            )}

                            {dRuleType === "MIN_QUANTITY" && (
                                <div className="pt-2">
                                    <Label htmlFor="dMinQty">Minimum Quantity of Items</Label>
                                    <Input
                                        id="dMinQty"
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={dMinQty}
                                        onChange={(e) => setDMinQty(e.target.value.replace(/[^0-9]/g, ""))}
                                        placeholder="3"
                                    />
                                </div>
                            )}

                            {dRuleType === "BUY_X_GET_Y" && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <Label htmlFor="dBuyQty">Buy Quantity (X)</Label>
                                        <Input
                                            id="dBuyQty"
                                            type="number"
                                            step="1"
                                            min="1"
                                            value={dBuyQty}
                                            onChange={(e) => setDBuyQty(e.target.value.replace(/[^0-9]/g, ""))}
                                            placeholder="2"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="dGetQty">Get Quantity Free (Y)</Label>
                                        <Input
                                            id="dGetQty"
                                            type="number"
                                            step="1"
                                            min="1"
                                            value={dGetQty}
                                            onChange={(e) => setDGetQty(e.target.value.replace(/[^0-9]/g, ""))}
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="dStartsAt">Starts At *</Label>
                                <Input
                                    id="dStartsAt"
                                    type="datetime-local"
                                    value={dStartsAt}
                                    onChange={(e) => setDStartsAt(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dEndsAt">Ends At *</Label>
                                <Input
                                    id="dEndsAt"
                                    type="datetime-local"
                                    value={dEndsAt}
                                    onChange={(e) => setDEndsAt(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Status Toggle Switch */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div>
                                <Label className="text-sm font-semibold">Discount Rule Status</Label>
                                <p className="text-xs text-muted-foreground">
                                    {dStatus === "ACTIVE"
                                        ? "Active — discount rule is enabled and will apply to orders"
                                        : "Inactive — discount rule is disabled"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDStatus(dStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                                    dStatus === "ACTIVE" ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                                        dStatus === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Applicable Channels */}
                        <div className="space-y-1.5">
                            <Label>Applicable Channels</Label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {(["POS", "WEB", "TELEGRAM", "MESSENGER"] as OrderChannel[]).map((ch) => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => toggleChannel(ch)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                                            dChannels.includes(ch)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background text-muted-foreground border-input hover:text-foreground"
                                        }`}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Requires Coupon Checkbox */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="dReqCoupon"
                                checked={dRequiresCoupon}
                                onChange={(e) => setDRequiresCoupon(e.target.checked)}
                                className="h-4 w-4 rounded border-input text-primary accent-primary focus:ring-primary"
                            />
                            <Label htmlFor="dReqCoupon" className="cursor-pointer text-xs">
                                Requires Coupon Code to apply at checkout
                            </Label>
                        </div>
                    </div>

                    <div className="p-4 sm:px-6 border-t border-border shrink-0 bg-card">
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveDiscount}
                                disabled={isCreatingDiscount || isUpdatingDiscount}
                                className="bg-primary hover:bg-primary/90 text-white"
                            >
                                {(isCreatingDiscount || isUpdatingDiscount) && (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                )}
                                Save Discount
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- CREATE / EDIT COUPON DIALOG --- */}
            <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="p-6 pb-4 border-b border-border shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                                {editingCoupon ? "Edit Coupon Code" : "Create New Coupon Code"}
                            </DialogTitle>
                        </DialogHeader>

                        {couponFormError && (
                            <div className="mt-3 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                                {couponFormError}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="cDiscount">Linked Discount Rule *</Label>
                            <SelectField
                                id="cDiscount"
                                value={cDiscountId}
                                onValueChange={(val) => setCDiscountId(val)}
                                placeholder={
                                    couponEligibleDiscounts.length > 0
                                        ? "Select a Coupon-enabled Discount Rule..."
                                        : "No Coupon-enabled Discount Rules"
                                }
                                options={couponEligibleDiscounts.map((d) => ({
                                    value: d.id,
                                    label: `${d.name} (${d.type === "PERCENTAGE" ? `${d.value}%` : format(d.value)})`,
                                }))}
                            />
                            {couponEligibleDiscounts.length === 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    No discounts with "Requires Coupon Code" enabled found. Please create or edit a discount rule and check "Requires Coupon Code to apply at checkout" first.
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="cCode">Coupon Promo Code *</Label>
                            <Input
                                id="cCode"
                                value={cCode}
                                onChange={(e) => setCCode(e.target.value.toUpperCase())}
                                placeholder="e.g. SAVE20"
                                className="font-mono uppercase font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cLimit">Total Usage Limit</Label>
                                <Input
                                    id="cLimit"
                                    type="number"
                                    value={cUsageLimit}
                                    onChange={(e) => setCUsageLimit(e.target.value)}
                                    placeholder="100"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cLimitCust">Limit / Customer</Label>
                                <Input
                                    id="cLimitCust"
                                    type="number"
                                    value={cUsageLimitCustomer}
                                    onChange={(e) => setCUsageLimitCustomer(e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="cMinPurchase">Minimum Purchase Amount ({baseSymbol})</Label>
                            <Input
                                id="cMinPurchase"
                                type="number"
                                step="0.01"
                                value={cMinPurchase}
                                onChange={(e) => setCMinPurchase(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cStarts">Starts At *</Label>
                                <Input
                                    id="cStarts"
                                    type="datetime-local"
                                    value={cStartsAt}
                                    onChange={(e) => setCStartsAt(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cEnds">Ends At *</Label>
                                <Input
                                    id="cEnds"
                                    type="datetime-local"
                                    value={cEndsAt}
                                    onChange={(e) => setCEndsAt(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* Status Toggle Switch */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div>
                                <Label className="text-sm font-semibold">Coupon Status</Label>
                                <p className="text-xs text-muted-foreground">
                                    {cStatus === "ACTIVE"
                                        ? "Active — coupon code can be redeemed"
                                        : "Inactive — coupon code is disabled"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCStatus(cStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                                    cStatus === "ACTIVE" ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                                        cStatus === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:px-6 border-t border-border shrink-0 bg-card">
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveCoupon}
                                disabled={isCreatingCoupon || isUpdatingCoupon}
                                className="bg-primary hover:bg-primary/90 text-white"
                            >
                                {(isCreatingCoupon || isUpdatingCoupon) && (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                )}
                                Save Coupon
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- DELETE CONFIRMATION DIALOG --- */}
            <DestructiveConfirmDialog
                open={Boolean(deletingItem)}
                onOpenChange={(open) => !open && setDeletingItem(null)}
                title={`Delete ${deletingItem?.type === "discount" ? "Discount Rule" : "Coupon Code"}`}
                description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isPending={isDeletingDiscount || isDeletingCoupon}
                onConfirm={handleDelete}
            />
        </div>
    );
}
