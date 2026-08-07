"use client";

import { useMemo, useState } from "react";
import {
    Plus,
    Users,
    Search,
    Edit2,
    Trash2,
    Loader2,
    Mail,
    Phone,
    MapPin,
    Crown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { CustomerResponse } from "@/lib/api/customer";
import {
    useActivateCustomerMutation,
    useCreateCustomerMutation,
    useDeactivateCustomerMutation,
    useDeleteCustomerMutation,
    useGetCustomersQuery,
    useUpdateCustomerMutation,
} from "@/services/customerApi";
import { useGetMembershipTypesQuery } from "@/services/membershipTypeApi";
import { useGetSalesChannelsQuery } from "@/services/salesChannelApi";
import { ColumnSelectDropdown } from "@/components/ui/ColumnSelectDropdown";

export default function CustomerManagement() {
    const [searchQuery, setSearchQuery] = useState("");
    // Total spend is recorded in the business base currency.
    const { format: formatMoney } = useMoney();

    // --- Column Visibility State ---
    const [customerCols, setCustomerCols] = useState([
        { id: "customerInfo", label: "Customer Name & Email", visible: true },
        { id: "phoneNumber", label: "Phone Number", visible: true },
        { id: "membershipType", label: "Membership Type", visible: true },
        { id: "salesChannel", label: "Sales Channel", visible: true },
        { id: "address", label: "Address", visible: true },
        { id: "totalSpend", label: "Total Spend", visible: true },
        { id: "status", label: "Status", visible: true },
    ]);

    const isColVisible = (id: string) =>
        customerCols.find((c) => c.id === id)?.visible ?? true;

    const toggleCol = (id: string) => {
        setCustomerCols((prev) =>
            prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    };

    const resetCols = () => {
        setCustomerCols((prev) => prev.map((c) => ({ ...c, visible: true })));
    };

    // RTK Query Hooks
    const {
        data: customers = [],
        isLoading: isCustomersLoading,
        refetch,
    } = useGetCustomersQuery();
    const { data: membershipTypes = [] } = useGetMembershipTypesQuery();
    const { data: salesChannels = [] } = useGetSalesChannelsQuery();

    const [createCustomer, { isLoading: isCreating }] =
        useCreateCustomerMutation();
    const [updateCustomer, { isLoading: isUpdating }] =
        useUpdateCustomerMutation();
    const [activateCustomer] = useActivateCustomerMutation();
    const [deactivateCustomer] = useDeactivateCustomerMutation();
    const [deleteCustomer, { isLoading: isDeleting }] =
        useDeleteCustomerMutation();

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] =
        useState<CustomerResponse | null>(null);
    const [formError, setFormError] = useState("");

    // Form inputs
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [membershipTypeId, setMembershipTypeId] = useState("");
    const [salesChannelId, setSalesChannelId] = useState("");
    const [totalSpend, setTotalSpend] = useState<number | "">("");
    const [active, setActive] = useState(true);

    // Delete state
    const [deletingCustomer, setDeletingCustomer] =
        useState<CustomerResponse | null>(null);

    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return customers;
        const q = searchQuery.toLowerCase();
        return customers.filter((c) => {
            const name = c.globalCustomer?.fullName?.toLowerCase() || "";
            const mail = c.globalCustomer?.email?.toLowerCase() || "";
            const phone = c.globalCustomer?.phoneNumber?.toLowerCase() || "";
            const addr = c.address?.toLowerCase() || "";
            const tier = c.membershipType?.typeName?.toLowerCase() || "";
            return (
                name.includes(q) ||
                mail.includes(q) ||
                phone.includes(q) ||
                addr.includes(q) ||
                tier.includes(q)
            );
        });
    }, [customers, searchQuery]);

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setFormError("");
        setFullName("");
        setEmail("");
        setPhoneNumber("");
        setAddress("");
        setMembershipTypeId("");
        setSalesChannelId("");
        setTotalSpend("");
        setActive(true);
        setIsDialogOpen(true);
    };

    const openEditDialog = (c: CustomerResponse) => {
        setEditingCustomer(c);
        setFormError("");
        setFullName(c.globalCustomer?.fullName || "");
        setEmail(c.globalCustomer?.email || "");
        setPhoneNumber(c.globalCustomer?.phoneNumber || "");
        setAddress(c.address || "");
        setMembershipTypeId(c.membershipType?.id || "");
        setSalesChannelId(c.salesChannel?.id || "");
        setTotalSpend(c.totalSpend !== undefined ? c.totalSpend : "");
        setActive(c.active ?? true);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setFormError("");
        if (!fullName.trim() && !email.trim() && !phoneNumber.trim()) {
            setFormError("Please provide at least a name, email, or phone number.");
            return;
        }

        try {
            const payload = {
                fullName: fullName.trim() || undefined,
                email: email.trim() || undefined,
                phoneNumber: phoneNumber.trim() || undefined,
                address: address.trim() || undefined,
                membershipTypeId: membershipTypeId || undefined,
                salesChannelId: salesChannelId || undefined,
                totalSpend:
                    totalSpend !== "" && !isNaN(Number(totalSpend))
                        ? Number(totalSpend)
                        : undefined,
                active,
            };

            if (editingCustomer) {
                await updateCustomer({
                    id: editingCustomer.id,
                    body: payload,
                }).unwrap();
            } else {
                await createCustomer(payload).unwrap();
            }
            setIsDialogOpen(false);
            refetch();
        } catch (err) {
            setFormError(getApiErrorMessage(err, "Failed to save customer."));
        }
    };

    const handleToggleStatus = async (c: CustomerResponse) => {
        try {
            if (c.active) {
                await deactivateCustomer(c.id).unwrap();
            } else {
                await activateCustomer(c.id).unwrap();
            }
            refetch();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to change customer status."));
        }
    };

    const handleDelete = async () => {
        if (!deletingCustomer) return;
        try {
            await deleteCustomer(deletingCustomer.id).unwrap();
            setDeletingCustomer(null);
            refetch();
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to delete customer."));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Customers
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your customer database, assign membership types, track total spending, and edit profile details.
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Add Customer
                </Button>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, phone..."
                        className="h-10 pl-9 text-sm rounded-xl border border-border bg-card"
                    />
                </div>
                <ColumnSelectDropdown
                    columns={customerCols}
                    onToggleColumn={toggleCol}
                    onResetDefaults={resetCols}
                />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                {isCustomersLoading ? (
                    <div className="flex justify-center items-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading customers...
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                        <Users className="h-8 w-8 mx-auto opacity-40" />
                        <p className="font-medium text-base text-foreground">No customers found</p>
                        <p className="text-xs">Add new customers to track their sales history and membership rewards.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                {isColVisible("customerInfo") && (
                                    <TableHead>Customer</TableHead>
                                )}
                                {isColVisible("phoneNumber") && (
                                    <TableHead>Phone</TableHead>
                                )}
                                {isColVisible("membershipType") && (
                                    <TableHead>Membership Type</TableHead>
                                )}
                                {isColVisible("salesChannel") && (
                                    <TableHead>Sales Channel</TableHead>
                                )}
                                {isColVisible("address") && (
                                    <TableHead>Address</TableHead>
                                )}
                                {isColVisible("totalSpend") && (
                                    <TableHead>Total Spend</TableHead>
                                )}
                                {isColVisible("status") && (
                                    <TableHead>Status</TableHead>
                                )}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((c) => {
                                const displayName =
                                    c.globalCustomer?.fullName || "Unnamed Customer";
                                const displayEmail = c.globalCustomer?.email;
                                const displayPhone = c.globalCustomer?.phoneNumber;

                                return (
                                    <TableRow
                                        key={c.id}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        {isColVisible("customerInfo") && (
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground text-sm">
                                                            {displayName}
                                                        </div>
                                                        {displayEmail && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Mail className="h-3 w-3" />
                                                                {displayEmail}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        {isColVisible("phoneNumber") && (
                                            <TableCell>
                                                {displayPhone ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                                                        {displayPhone}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                        {isColVisible("membershipType") && (
                                            <TableCell>
                                                {c.membershipType ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400">
                                                        <Crown className="h-3 w-3" />
                                                        {c.membershipType.typeName}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        Regular
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                        {isColVisible("salesChannel") && (
                                            <TableCell>
                                                {c.salesChannel ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                                        {c.salesChannel.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                        {isColVisible("address") && (
                                            <TableCell>
                                                {c.address ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[180px] truncate" title={c.address}>
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        {c.address}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                        {isColVisible("totalSpend") && (
                                            <TableCell>
                                                <span className="font-semibold text-xs text-foreground">
                                                    {formatMoney(c.totalSpend ?? 0)}
                                                </span>
                                            </TableCell>
                                        )}
                                        {isColVisible("status") && (
                                            <TableCell>
                                                <button
                                                    onClick={() => handleToggleStatus(c)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                                        c.active
                                                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                                >
                                                    {c.active ? "Active" : "Inactive"}
                                                </button>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(c)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingCustomer(c)}
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4 text-brand-red" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* --- CREATE / EDIT CUSTOMER DIALOG --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {editingCustomer ? "Edit Customer" : "Add Customer"}
                        </DialogTitle>
                    </DialogHeader>

                    {formError && (
                        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
                            {formError}
                        </div>
                    )}

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+855 12 345 678"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street, City, Country..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="membershipType">Membership Type</Label>
                                <select
                                    id="membershipType"
                                    value={membershipTypeId}
                                    onChange={(e) => setMembershipTypeId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                    <option value="">None (Regular)</option>
                                    {membershipTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.typeName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="salesChannel">Sales Channel</Label>
                                <select
                                    id="salesChannel"
                                    value={salesChannelId}
                                    onChange={(e) => setSalesChannelId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                    <option value="">None / Direct</option>
                                    {salesChannels.map((sc) => (
                                        <option key={sc.id} value={sc.id}>
                                            {sc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="totalSpend">Total Spend ($)</Label>
                            <Input
                                id="totalSpend"
                                type="number"
                                step="0.01"
                                min="0"
                                value={totalSpend}
                                onChange={(e) =>
                                    setTotalSpend(
                                        e.target.value === "" ? "" : parseFloat(e.target.value)
                                    )
                                }
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="active" className="cursor-pointer text-sm font-medium">
                                Active Customer
                            </Label>
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
                            Save Customer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- DELETE CONFIRMATION DIALOG --- */}
            <DestructiveConfirmDialog
                open={Boolean(deletingCustomer)}
                onOpenChange={(open) => !open && setDeletingCustomer(null)}
                title="Delete Customer"
                description={`Are you sure you want to delete customer "${deletingCustomer?.globalCustomer?.fullName || "this customer"}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isPending={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    );
}
