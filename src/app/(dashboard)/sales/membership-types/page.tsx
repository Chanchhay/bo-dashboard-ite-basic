"use client";

import { useMemo, useState } from "react";
import {
    Plus,
    Users,
    Search,
    Edit2,
    Trash2,
    Tag,
    Award,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { TourButton } from "@/components/onboarding/TourButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import type { MembershipTypeResponse } from "@/lib/api/membership-type";
import {
    useActivateMembershipTypeMutation,
    useCreateMembershipTypeMutation,
    useDeactivateMembershipTypeMutation,
    useDeleteMembershipTypeMutation,
    useGetMembershipTypesQuery,
    useUpdateMembershipTypeMutation,
} from "@/services/membershipTypeApi";
import { useGetDiscountsQuery } from "@/services/discountApi";

import { ColumnSelectDropdown } from "@/components/ui/ColumnSelectDropdown";

export default function MembershipTypesPage() {
    const { format, base } = useMoney();
    const [searchQuery, setSearchQuery] = useState("");

    // --- Column Visibility State ---
    const [memberTypeCols, setMemberTypeCols] = useState([
        { id: "typeName", label: "Member Type Name", visible: true },
        { id: "discount", label: "Assigned Discount", visible: true },
        { id: "remark", label: "Remark / Notes", visible: true },
        { id: "status", label: "Status", visible: true },
    ]);

    const isColVisible = (id: string) => memberTypeCols.find((c) => c.id === id)?.visible ?? true;

    const toggleCol = (id: string) => {
        setMemberTypeCols((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    };

    const resetCols = () => {
        setMemberTypeCols((prev) => prev.map((c) => ({ ...c, visible: true })));
    };

    // RTK Query Hooks
    const { data: membershipTypes = [], isLoading: isTypesLoading, refetch } = useGetMembershipTypesQuery();
    const { data: discounts = [] } = useGetDiscountsQuery();

    const [createMembershipType, { isLoading: isCreating }] = useCreateMembershipTypeMutation();
    const [updateMembershipType, { isLoading: isUpdating }] = useUpdateMembershipTypeMutation();
    const [activateMembershipType] = useActivateMembershipTypeMutation();
    const [deactivateMembershipType] = useDeactivateMembershipTypeMutation();
    const [deleteMembershipType, { isLoading: isDeleting }] = useDeleteMembershipTypeMutation();

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<MembershipTypeResponse | null>(null);
    const [formError, setFormError] = useState("");

    const [typeName, setTypeName] = useState("");
    const [remark, setRemark] = useState("");
    const [discountId, setDiscountId] = useState("");

    // Delete state
    const [deletingType, setDeletingType] = useState<MembershipTypeResponse | null>(null);

    const filteredTypes = useMemo(() => {
        if (!searchQuery.trim()) return membershipTypes;
        const q = searchQuery.toLowerCase();
        return membershipTypes.filter(
            (t) =>
                t.typeName.toLowerCase().includes(q) ||
                (t.remark && t.remark.toLowerCase().includes(q)) ||
                (t.discount && t.discount.name.toLowerCase().includes(q))
        );
    }, [membershipTypes, searchQuery]);

    const posEligibleDiscounts = useMemo(() => {
        return discounts.filter((d) => {
            if (discountId && d.id === discountId) return true;
            if (d.status !== "ACTIVE" || d.requiresCoupon) return false;
            if (d.applicableChannels && d.applicableChannels.length > 0) {
                return d.applicableChannels.includes("POS");
            }
            return false;
        });
    }, [discounts, discountId]);

    const selectedDiscountLabel = useMemo(() => {
        if (!discountId || discountId === "NONE") return "None (No special discount)";
        const found = discounts.find((d) => d.id === discountId);
        if (!found) return "None (No special discount)";
        const isBuyXGetY = found.ruleType === "BUY_X_GET_Y" || String(found.type) === "BUY_X_GET_Y";
        return isBuyXGetY
            ? `${found.name} (Buy ${found.buyQuantity ?? "X"} get ${found.getQuantity ?? "Y"})`
            : found.type === "PERCENTAGE"
            ? `${found.name} (${found.value}%)`
            : `${found.name} (${format(found.value)})`;
    }, [discountId, discounts, format]);

    const openCreateDialog = () => {
        setEditingType(null);
        setFormError("");
        setTypeName("");
        setRemark("");
        setDiscountId("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (t: MembershipTypeResponse) => {
        setEditingType(t);
        setFormError("");
        setTypeName(t.typeName);
        setRemark(t.remark || "");
        setDiscountId(t.discountId || "");
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setFormError("");
        if (!typeName.trim()) {
            setFormError("Membership type name is required.");
            return;
        }

        try {
            if (editingType) {
                await updateMembershipType({
                    id: editingType.id,
                    body: {
                        typeName: typeName.trim(),
                        remark: remark.trim() || undefined,
                        discountId: discountId || undefined,
                    },
                }).unwrap();
            } else {
                await createMembershipType({
                    typeName: typeName.trim(),
                    remark: remark.trim() || undefined,
                    discountId: discountId || undefined,
                    status: "ACTIVE",
                }).unwrap();
            }
            setIsDialogOpen(false);
            refetch();
        } catch (err) {
            setFormError(getApiErrorMessage(err, "Failed to save membership type."));
        }
    };

    const handleToggleStatus = async (t: MembershipTypeResponse) => {
        try {
            if (t.status === "ACTIVE") {
                await deactivateMembershipType(t.id).unwrap();
            } else {
                await activateMembershipType(t.id).unwrap();
            }
            refetch();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to change membership type status."));
        }
    };

    const handleDelete = async () => {
        if (!deletingType) return;
        try {
            await deleteMembershipType(deletingType.id).unwrap();
            setDeletingType(null);
            refetch();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to delete membership type."));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div data-tour="membership-tiers-list" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Member Types
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Define customer membership types (e.g. VIP, Gold, Silver) and assign automatic discount pricing to them.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <TourButton />
                    <Button
                        data-tour="add-member-type-btn"
                        onClick={openCreateDialog}
                        className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> Add Member Type
                    </Button>
                </div>
            </div>

            {/* Controls Bar */}
            <div data-tour="member-types-search-bar" className="flex items-center justify-between border-b border-border pb-3 gap-2">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search member type name or remark..."
                        className="h-10 pl-9 text-sm rounded-xl border border-border bg-card"
                    />
                </div>
                <ColumnSelectDropdown
                    columns={memberTypeCols}
                    onToggleColumn={toggleCol}
                    onResetDefaults={resetCols}
                />
            </div>

            {/* Table */}
            <div data-tour="member-types-table-container" className="rounded-xl border border-border bg-card shadow-xs overflow-clip">
                {isTypesLoading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : filteredTypes.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                        <Award className="h-8 w-8 mx-auto opacity-40" />
                        <p className="font-medium text-base text-foreground">No member types found</p>
                        <p className="text-xs">Create membership types (e.g. VIP, Regular) and attach discount rules to reward loyal customers.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                {isColVisible("typeName") && <TableHead>Member Type Name</TableHead>}
                                {isColVisible("discount") && <TableHead>Assigned Discount</TableHead>}
                                {isColVisible("remark") && <TableHead>Remark / Notes</TableHead>}
                                {isColVisible("status") && <TableHead>Status</TableHead>}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTypes.map((t) => (
                                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                                    {isColVisible("typeName") && (
                                        <TableCell>
                                            <div className="font-bold text-foreground text-base">
                                                {t.typeName}
                                            </div>
                                        </TableCell>
                                    )}
                                    {isColVisible("discount") && (
                                        <TableCell>
                                            {t.discount ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                    <Tag className="h-3 w-3" />
                                                    {t.discount.name} (
                                                    {t.discount.type === "PERCENTAGE"
                                                        ? `${t.discount.value}%`
                                                        : format(t.discount.value)}
                                                    )
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No Discount Assigned</span>
                                            )}
                                        </TableCell>
                                    )}
                                    {isColVisible("remark") && (
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {t.remark || "—"}
                                            </span>
                                        </TableCell>
                                    )}
                                    {isColVisible("status") && (
                                        <TableCell>
                                            <button
                                                onClick={() => handleToggleStatus(t)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                                    t.status === "ACTIVE"
                                                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }`}
                                            >
                                                {t.status === "ACTIVE" ? "Active" : "Inactive"}
                                            </button>
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(t)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeletingType(t)}
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* --- CREATE / EDIT MEMBER TYPE DIALOG --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {editingType ? "Edit Member Type" : "Add Member Type"}
                        </DialogTitle>
                    </DialogHeader>

                    {formError && (
                        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                            {formError}
                        </div>
                    )}

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="typeName">Type Name *</Label>
                            <Input
                                id="typeName"
                                value={typeName}
                                onChange={(e) => setTypeName(e.target.value)}
                                placeholder="e.g. VIP Member, Gold Customer"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="discount">Assign Discount Rule</Label>
                            <Select
                                value={discountId || "NONE"}
                                onValueChange={(val: string | null) => setDiscountId(val && val !== "NONE" ? val : "")}
                            >
                                <SelectTrigger id="discount" size="sm" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                                    <SelectValue placeholder="Select discount rule...">
                                        {selectedDiscountLabel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">None (No special discount)</SelectItem>
                                    {posEligibleDiscounts.map((d) => {
                                        const isBuyXGetY = d.ruleType === "BUY_X_GET_Y" || String(d.type) === "BUY_X_GET_Y";
                                        const label = isBuyXGetY
                                            ? `${d.name} (Buy ${d.buyQuantity ?? "X"} get ${d.getQuantity ?? "Y"})`
                                            : d.type === "PERCENTAGE"
                                            ? `${d.name} (${d.value}%)`
                                            : `${d.name} (${format(d.value)})`;
                                        return (
                                            <SelectItem key={d.id} value={d.id}>
                                                {label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                Members holding this type will automatically receive this discount rate at checkout.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="remark">Remark / Notes</Label>
                            <Textarea
                                id="remark"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Additional notes or criteria for this membership type..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isCreating || isUpdating}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            {(isCreating || isUpdating) && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            Save Member Type
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- DELETE CONFIRMATION DIALOG --- */}
            <DestructiveConfirmDialog
                open={Boolean(deletingType)}
                onOpenChange={(open) => !open && setDeletingType(null)}
                title="Delete Member Type"
                description={`Are you sure you want to delete member type "${deletingType?.typeName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isPending={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    );
}
