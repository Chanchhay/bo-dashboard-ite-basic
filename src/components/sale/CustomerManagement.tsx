"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import {
    Plus,
    Users,
    Search,
    Edit2,
    Trash2,
    Loader2,
    Crown,
    Filter,
    Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { DatePicker } from "@/components/ui/date-picker";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { TourButton } from "@/components/onboarding/TourButton";
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
  useGetCustomersPageQuery,
    useUpdateCustomerMutation,
} from "@/services/customerApi";
import { useGetMembershipTypesQuery } from "@/services/membershipTypeApi";
import { useGetSalesChannelsQuery } from "@/services/salesChannelApi";
import { ColumnSelectDropdown } from "@/components/ui/ColumnSelectDropdown";

const formatLocalPhone = (phoneStr?: string | null): string => {
    if (!phoneStr) return "";
    let cleaned = phoneStr.trim();
    let digits = cleaned.replace(/\D/g, "");
    if (digits.startsWith("855") && digits.length >= 10) {
        digits = "0" + digits.slice(3);
    } else if (!digits.startsWith("0") && (digits.length === 8 || digits.length === 9)) {
        digits = "0" + digits;
    }
    return digits || cleaned;
};

export default function CustomerManagement() {
    const [searchQuery, setSearchQuery] = useState("");
    // Total spend is recorded in the business base currency.
    const { format: formatMoney } = useMoney();

    // --- Column Visibility State ---
    const [customerCols, setCustomerCols] = useState([
        { id: "customerInfo", label: "Customer Name", visible: true },
        { id: "phoneNumber", label: "Phone Number", visible: true },
        { id: "membershipType", label: "Membership Type", visible: true },
        { id: "salesChannel", label: "Sales Channel", visible: true },
        { id: "totalSpend", label: "Total Spend", visible: true },
        { id: "status", label: "Status", visible: true },
    ]);

    const isColVisible = (id: string) =>
        customerCols.find((c) => c.id === id)?.visible ?? true;

    const toggleCol = (id: string) => {
        setCustomerCols((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
        );
    };

    const resetCols = () => {
        setCustomerCols((prev) => prev.map((c) => ({ ...c, visible: true })));
    };

    // RTK Query Hooks
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
    const {
    data,
        isLoading: isCustomersLoading,
    isFetching: isCustomersFetching,
        refetch,
  } = useGetCustomersPageQuery({ page, size: pageSize });
  const customers = data?.content ?? [];
  const currentPage = data?.page?.number ?? page;
  const totalPages = data?.page?.totalPages ?? (customers.length ? 1 : 0);
  const totalElements = data?.page?.totalElements ?? customers.length;
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
    const [phoneNumber, setPhoneNumber] = useState("");
    const [membershipTypeId, setMembershipTypeId] = useState("");
    const [salesChannelId, setSalesChannelId] = useState("");
    const [totalSpend, setTotalSpend] = useState<number | "">("");
    const [active, setActive] = useState(true);

    // Delete state
    const [deletingCustomer, setDeletingCustomer] =
        useState<CustomerResponse | null>(null);

    // Filter states
    const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [datePreset, setDatePreset] = useState<string>("ALL");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        if (preset === "ALL") {
            setFromDate("");
            setToDate("");
        } else if (preset === "TODAY") {
            setFromDate(todayStr);
            setToDate(todayStr);
        } else if (preset === "7DAYS") {
            const d = new Date(today);
            d.setDate(d.getDate() - 7);
            setFromDate(d.toISOString().split("T")[0]);
            setToDate(todayStr);
        } else if (preset === "30DAYS") {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            setFromDate(d.toISOString().split("T")[0]);
            setToDate(todayStr);
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter((c) => {
            // 1. Status Filter
            if (statusFilter === "ACTIVE" && !c.active) return false;
            if (statusFilter === "INACTIVE" && c.active) return false;

            // 2. Channel Filter
            if (selectedChannelFilter !== "ALL") {
                if (selectedChannelFilter === "NONE") {
                    if (c.salesChannel) return false;
                } else {
                    if (c.salesChannel?.id !== selectedChannelFilter) return false;
                }
            }

            // 3. Date Range Filter (Registered Date)
            if (fromDate || toDate) {
                const gc = c.globalCustomer as unknown as { createdDate?: string; createdAt?: string } | undefined;
                const createdStr =
                    c.createdDate ||
                    (c as unknown as { createdAt?: string }).createdAt ||
                    gc?.createdDate ||
                    gc?.createdAt;

                if (createdStr) {
                    const createdTime = new Date(createdStr).getTime();
                    if (!isNaN(createdTime)) {
                        if (fromDate) {
                            const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
                            if (createdTime < fromTime) return false;
                        }
                        if (toDate) {
                            const toTime = new Date(`${toDate}T23:59:59.999`).getTime();
                            if (createdTime > toTime) return false;
                        }
                    }
                }
            }

            // 4. Search Query Filter
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();

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
            const channel = c.salesChannel?.name?.toLowerCase() || "";
            return (
                name.includes(q) ||
                tier.includes(q) ||
                channel.includes(q)
            );
        });
    }, [customers, searchQuery, selectedChannelFilter, statusFilter, fromDate, toDate]);

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setFormError("");
        setFullName("");
        setPhoneNumber("");
        setMembershipTypeId("");
        const posChannel = salesChannels.find(
            (sc) => sc.name?.toUpperCase().includes("POS") || sc.code?.toUpperCase().includes("POS")
        );
        setSalesChannelId(posChannel?.id || salesChannels[0]?.id || "");
        setTotalSpend("");
        setActive(true);
        setIsDialogOpen(true);
    };

    const openEditDialog = (c: CustomerResponse) => {
        setEditingCustomer(c);
        setFormError("");
        setFullName(c.globalCustomer?.fullName || "");
        setPhoneNumber(c.globalCustomer?.phoneNumber || "");
        setMembershipTypeId(c.membershipType?.id || "");
        setSalesChannelId(c.salesChannel?.id || "");
        setTotalSpend(c.totalSpend !== undefined ? c.totalSpend : "");
        setActive(c.active ?? true);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setFormError("");
        if (!fullName.trim() && !phoneNumber.trim()) {
            setFormError("Please provide at least a customer name or phone number.");
            return;
        }

        try {
            const posChannel = salesChannels.find(
                (sc) => sc.name?.toUpperCase().includes("POS") || sc.code?.toUpperCase().includes("POS")
            );
            const effectiveChannelId = salesChannelId || posChannel?.id || salesChannels[0]?.id || undefined;

            const payload = {
                fullName: fullName.trim() || undefined,
                phoneNumber: phoneNumber.trim() || undefined,
                membershipTypeId: membershipTypeId ? membershipTypeId : null,
                salesChannelId: effectiveChannelId,
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

    const selectedMembershipTypeLabel = useMemo(() => {
        if (!membershipTypeId || membershipTypeId === "NONE") return "None (Regular)";
        const found = membershipTypes.find((t) => t.id === membershipTypeId);
        return found ? found.typeName : "None (Regular)";
    }, [membershipTypeId, membershipTypes]);

    const selectedSalesChannelLabel = useMemo(() => {
        if (!salesChannelId || salesChannelId === "NONE") {
            return posSalesChannels[0]?.name || "POS / Direct";
        }
        const found = salesChannels.find((sc) => sc.id === salesChannelId);
        return found ? found.name : posSalesChannels[0]?.name || "POS / Direct";
    }, [salesChannelId, salesChannels, posSalesChannels]);

    return (
        <div className="flex flex-col gap-6">
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-4 pb-4 bg-shell/95 backdrop-blur-md transition-all flex flex-col gap-4">
                <InventoryPageHeader
                    title="Customers"
                    description="Manage customer profiles, phone numbers, lifetime spending, and loyalty visit records."
                    action={
                        <div className="flex items-center gap-3">
                            <Button
                                data-tour="add-customer-btn"
                                onClick={openCreateDialog}
                                className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-xs cursor-pointer"
                            >
                                <Plus className="h-4 w-4" /> Add Customer
                            </Button>
                            <TourButton />
                        </div>
                    }
                />

                {/* Controls Bar & Filters */}
                <div data-tour="customers-search-bar" className="flex flex-col gap-3 pt-1">
                    {/* Top Control Row: Search + Status Filter + Column Dropdown */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or phone..."
                                    className="h-10 pl-9 text-sm rounded-xl border border-border bg-card"
                                />
                            </div>

                            {/* Status Filter Dropdown */}
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => setStatusFilter((val || "ALL") as "ALL" | "ACTIVE" | "INACTIVE")}
                            >
                                <SelectTrigger size="sm" className="!h-10 w-36 rounded-xl bg-card border-border text-sm font-medium">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <ColumnSelectDropdown
                            columns={customerCols}
                            onToggleColumn={toggleCol}
                            onResetDefaults={resetCols}
                        />
                    </div>

                    {/* Date Filter Toolbar Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-foreground mr-1 flex items-center gap-1.5">
                                <Calendar className="size-4 text-primary" />
                                <span>Date:</span>
                            </span>
                            {[
                                { id: "ALL", label: "All Time" },
                                { id: "TODAY", label: "Today" },
                                { id: "7DAYS", label: "Last 7 Days" },
                                { id: "30DAYS", label: "Last 30 Days" },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleDatePresetChange(p.id)}
                                    className={cn(
                                        "px-3 py-1 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer",
                                        datePreset === p.id && !fromDate && !toDate
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : datePreset === p.id
                                              ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">From:</span>
                                <div className="w-36 sm:w-40">
                                    <DatePicker
                                        value={fromDate}
                                        max={toDate || undefined}
                                        placeholder="Any date"
                                        className="h-9"
                                        onValueChange={(val) => {
                                            setFromDate(val);
                                            setDatePreset("CUSTOM");
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">To:</span>
                                <div className="w-36 sm:w-40">
                                    <DatePicker
                                        value={toDate}
                                        min={fromDate || undefined}
                                        placeholder="Any date"
                                        className="h-9"
                                        onValueChange={(val) => {
                                            setToDate(val);
                                            setDatePreset("CUSTOM");
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div data-tour="customers-table-container" className="rounded-xl border border-border bg-card shadow-xs overflow-clip">
                {isCustomersLoading ? (
                    <TableSkeleton rows={6} cols={6} />
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                        <Users className="h-8 w-8 mx-auto opacity-40" />
            <p className="font-medium text-base text-foreground">
              No customers found
            </p>
            <p className="text-xs">
              Add new customers to track their sales history and membership
              rewards.
            </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                {isColVisible("customerInfo") && (
                                    <TableHead>Customer Name</TableHead>
                                )}
                                {isColVisible("phoneNumber") && <TableHead>Phone Number</TableHead>}
                                {isColVisible("membershipType") && (
                                    <TableHead>Membership Type</TableHead>
                                )}
                                {isColVisible("salesChannel") && (
                                    <TableHead>Sales Channel</TableHead>
                                )}
                                {isColVisible("totalSpend") && (
                                    <TableHead>Total Spend</TableHead>
                                )}
                                {isColVisible("status") && <TableHead>Status</TableHead>}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((c) => {
                                const displayName =
                                    c.globalCustomer?.fullName || "Unnamed Customer";
                                const displayPhone = formatLocalPhone(c.globalCustomer?.phoneNumber);

                                return (
                                    <TableRow
                                        key={c.id}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        {isColVisible("customerInfo") && (
                                            <TableCell>
                                                <div className="font-bold text-foreground text-sm">
                                                    {displayName}
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
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

      {/* --- PAGINATION --- */}
      {totalPages > 0 && (
        <PaginationBar
          page={currentPage}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setPageSize}
          isLoading={isCustomersFetching}
          itemLabel="customer"
        />
      )}

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

                        <div className="space-y-1.5">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="012 345 678"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="membershipType">Membership Type</Label>
                                <Select
                                    value={membershipTypeId || "NONE"}
                                    onValueChange={(val: string | null) => setMembershipTypeId(val && val !== "NONE" ? val : "")}
                                >
                                    <SelectTrigger id="membershipType" size="sm" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                                        <SelectValue placeholder="Select type...">
                                            {selectedMembershipTypeLabel}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">None (Regular)</SelectItem>
                                        {membershipTypes.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.typeName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="salesChannel">Sales Channel</Label>
                                {posSalesChannels.length <= 1 ? (
                                    <Input
                                        readOnly
                                        disabled
                                        value={posSalesChannels[0]?.name || "Point of Sale"}
                                        className="h-10 rounded-md border border-input bg-muted/60 px-3 text-sm text-muted-foreground font-medium cursor-not-allowed"
                                    />
                                ) : (
                                    <Select
                                        value={salesChannelId || posSalesChannels[0]?.id || "NONE"}
                                        onValueChange={(val: string | null) => setSalesChannelId(val && val !== "NONE" ? val : "")}
                                    >
                                        <SelectTrigger id="salesChannel" size="sm" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                                            <SelectValue placeholder="Select channel...">
                                                {selectedSalesChannelLabel}
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
                    e.target.value === "" ? "" : parseFloat(e.target.value),
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
              <Label
                htmlFor="active"
                className="cursor-pointer text-sm font-medium"
              >
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
