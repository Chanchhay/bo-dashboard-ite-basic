"use client";

import { useMemo, useState } from "react";
import {
    Search,
    UserPlus,
    Users,
    Crown,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CustomerResponse } from "@/lib/api/customer";
import {
    useCreateCustomerMutation,
    useGetCustomersQuery,
} from "@/services/customerApi";
import { useGetMembershipTypesQuery } from "@/services/membershipTypeApi";
import { useGetSalesChannelsQuery } from "@/services/salesChannelApi";

interface CustomerSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCustomerId?: string | null;
    onSelectCustomer: (customerId: string | null) => Promise<void>;
}

const formatLocalPhone = (phoneStr?: string | null): string => {
    if (!phoneStr) return "";
    const cleaned = phoneStr.trim();
    let digits = cleaned.replace(/\D/g, "");
    if (digits.startsWith("855") && digits.length >= 10) {
        digits = "0" + digits.slice(3);
    } else if (!digits.startsWith("0") && (digits.length === 8 || digits.length === 9)) {
        digits = "0" + digits;
    }
    return digits || cleaned;
};

export function CustomerSelectModal({
    open,
    onOpenChange,
    selectedCustomerId,
    onSelectCustomer,
}: CustomerSelectModalProps) {
    const { toast } = useToast();
    const [tab, setTab] = useState<"SELECT" | "CREATE">("SELECT");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Queries
    const { data: customers = [], isLoading: isCustomersLoading, refetch } =
        useGetCustomersQuery();
    const { data: membershipTypes = [] } = useGetMembershipTypesQuery();
    const { data: salesChannels = [] } = useGetSalesChannelsQuery();
    const [createCustomer, { isLoading: isCreating }] =
        useCreateCustomerMutation();

    // Create form states
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [membershipTypeId, setMembershipTypeId] = useState("");
    const [salesChannelId, setSalesChannelId] = useState("");
    const [formError, setFormError] = useState("");

    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return customers;
        const q = searchQuery.trim().toLowerCase();

        return customers.filter((c) => {
            const rawPhone = c.globalCustomer?.phoneNumber || "";
            const formattedPhone = formatLocalPhone(rawPhone).toLowerCase();
            const rawPhoneLower = rawPhone.toLowerCase();

            // Phone search match starting from 0 (e.g. 092...) or containing query
            const isPhoneMatch =
                formattedPhone.startsWith(q) ||
                formattedPhone.includes(q) ||
                rawPhoneLower.includes(q);

            if (isPhoneMatch) return true;

            const name = c.globalCustomer?.fullName?.toLowerCase() || "";
            const tier = c.membershipType?.typeName?.toLowerCase() || "";
            return (
                name.includes(q) ||
                tier.includes(q)
            );
        });
    }, [customers, searchQuery]);

    const handlePick = async (id: string | null) => {
        setIsSubmitting(true);
        try {
            await onSelectCustomer(id);
            onOpenChange(false);
        } catch (err) {
            toast({
                tone: "error",
                title: "Failed to select customer",
                description: getApiErrorMessage(err, "Please try again."),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!fullName.trim() && !phone.trim()) {
            setFormError("Please enter a name or phone number.");
            return;
        }

        try {
            const posChannel = salesChannels.find(
                (sc) => sc.name?.toUpperCase().includes("POS") || sc.code?.toUpperCase().includes("POS")
            );
            const effectiveChannelId = salesChannelId || posChannel?.id || salesChannels[0]?.id || undefined;

            const newCust = await createCustomer({
                fullName: fullName.trim() || undefined,
                phoneNumber: phone.trim() || undefined,
                membershipTypeId: membershipTypeId || undefined,
                salesChannelId: effectiveChannelId,
                active: true,
            }).unwrap();

            toast({
                tone: "success",
                title: "Customer created!",
                description: `Created profile for ${newCust.globalCustomer?.fullName || "Customer"}.`,
            });

            refetch();
            // Automatically select the newly created customer for this sale!
            await handlePick(newCust.id);
            // Reset form
            setFullName("");
            setPhone("");
            setMembershipTypeId("");
            setSalesChannelId("");
            setTab("SELECT");
        } catch (err) {
            setFormError(
                getApiErrorMessage(
                    err,
                    "Could not create customer.",
                    "This phone number is already registered to another customer.",
                ),
            );
        }
    };

    const posSalesChannels = useMemo(() => {
        const filtered = salesChannels.filter((sc) => {
            const name = sc.name?.toUpperCase() || "";
            const code = sc.code?.toUpperCase() || "";
            if (name.includes("ONLINE") || code.includes("ONLINE") || name.includes("WEB") || code.includes("WEB") || name.includes("APP")) {
                return false;
            }
            return (
                name.includes("POS") ||
                code.includes("POS") ||
                name.includes("POINT OF SALE") ||
                name.includes("SHOP") ||
                name.includes("DIRECT") ||
                name.includes("IN-STORE")
            );
        });
        return filtered.length > 0 ? filtered : salesChannels.filter((sc) => !sc.name?.toUpperCase().includes("ONLINE"));
    }, [salesChannels]);

    const selectedQuickMembershipLabel = useMemo(() => {
        if (!membershipTypeId || membershipTypeId === "NONE") return "Standard (No Tier)";
        const found = membershipTypes.find((mt) => mt.id === membershipTypeId);
        return found ? found.typeName : "Standard (No Tier)";
    }, [membershipTypeId, membershipTypes]);

    const selectedQuickChannelLabel = useMemo(() => {
        if (!salesChannelId || salesChannelId === "NONE") {
            return posSalesChannels[0]?.name || "POS / Direct";
        }
        const found = salesChannels.find((sc) => sc.id === salesChannelId);
        return found ? found.name : posSalesChannels[0]?.name || "POS / Direct";
    }, [salesChannelId, salesChannels, posSalesChannels]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Customer Profile & Loyalty
                        </DialogTitle>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setTab("SELECT")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                tab === "SELECT"
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Select Customer ({customers.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("CREATE")}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                tab === "CREATE"
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            <UserPlus className="h-3.5 w-3.5" /> Quick Add Customer
                        </button>
                    </div>
                </DialogHeader>

                {tab === "SELECT" ? (
                    <div className="p-5 space-y-4">
                        {/* Search & Actions */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by phone number or name..."
                                    className="pl-9 h-10 text-sm rounded-xl"
                                />
                            </div>
                            {selectedCustomerId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePick(null)}
                                    disabled={isSubmitting}
                                    className="h-10 text-xs font-bold text-brand-red border-red-200 hover:bg-red-50 rounded-xl"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" /> Detach
                                </Button>
                            )}
                        </div>

                        {/* Customer List */}
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {isCustomersLoading ? (
                                <div className="py-12 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading customer profiles...
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <Users className="h-8 w-8 mx-auto text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-700">No customers found</p>
                                    <p className="text-xs text-gray-500">
                                        Try another search or click &quot;Quick Add Customer&quot; to register one now.
                                    </p>
                                </div>
                            ) : (
                                filteredCustomers.map((c) => {
                                    const isSelected = selectedCustomerId === c.id;
                                    const name = c.globalCustomer?.fullName || "Unnamed Customer";
                                    const phoneNum = formatLocalPhone(c.globalCustomer?.phoneNumber);
                                    const tier = c.membershipType?.typeName;
                                    const channel = c.salesChannel?.name;

                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => handlePick(c.id)}
                                            className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-xs"
                                                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        isSelected
                                                            ? "bg-primary text-white"
                                                            : "bg-primary/10 text-primary"
                                                    }`}
                                                >
                                                    {name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {name}
                                                        </span>
                                                        {tier && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                                <Crown className="h-3 w-3" />
                                                                {tier}
                                                            </span>
                                                        )}
                                                        {channel && (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                                {channel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {phoneNum && (
                                                        <div className="text-xs text-gray-500">
                                                            {phoneNum}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                {isSelected ? (
                                                    <span className="size-7 rounded-full bg-primary text-white flex items-center justify-center">
                                                        <Check className="h-4 w-4" />
                                                    </span>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={isSubmitting}
                                                        className="text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-white rounded-lg"
                                                    >
                                                        Select
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    /* Quick Add Customer Form */
                    <form onSubmit={handleQuickCreate} className="p-5 space-y-4">
                        {formError && (
                            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="quick-fullName" className="text-xs font-bold text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="quick-fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. John Smith"
                                className="h-10 text-sm rounded-xl"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="quick-phone" className="text-xs font-bold text-gray-700">
                                Phone Number
                            </Label>
                            <Input
                                id="quick-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="012 345 678"
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="quick-membership" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-amber-500" /> Membership Tier
                                </Label>
                                <Select
                                    value={membershipTypeId || "NONE"}
                                    onValueChange={(val: string | null) => setMembershipTypeId(val && val !== "NONE" ? val : "")}
                                >
                                    <SelectTrigger id="quick-membership" size="sm" className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm">
                                        <SelectValue placeholder="Standard (No Tier)">
                                            {selectedQuickMembershipLabel}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">Standard (No Tier)</SelectItem>
                                        {membershipTypes.map((mt) => (
                                            <SelectItem key={mt.id} value={mt.id}>
                                                {mt.typeName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="quick-channel" className="text-xs font-bold text-gray-700">
                                    Sales Channel
                                </Label>
                                {posSalesChannels.length <= 1 ? (
                                    <Input
                                        readOnly
                                        disabled
                                        value={posSalesChannels[0]?.name || "Point of Sale"}
                                        className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 font-medium cursor-not-allowed"
                                    />
                                ) : (
                                    <Select
                                        value={salesChannelId || posSalesChannels[0]?.id || "NONE"}
                                        onValueChange={(val: string | null) => setSalesChannelId(val && val !== "NONE" ? val : "")}
                                    >
                                        <SelectTrigger id="quick-channel" size="sm" className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm">
                                            <SelectValue placeholder="Select channel">
                                                {selectedQuickChannelLabel}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {posSalesChannels.map((sc) => (
                                                <SelectItem key={sc.id} value={sc.id}>
                                                    {sc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-3 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTab("SELECT")}
                                className="flex-1 h-11 text-xs font-bold rounded-xl"
                            >
                                Back to List
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreating || isSubmitting}
                                className="flex-1 h-11 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md"
                            >
                                {(isCreating || isSubmitting) ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <UserPlus className="h-4 w-4 mr-1" />
                                )}
                                Save & Attach Customer
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
