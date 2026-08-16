"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Receipt,
  Search,
  Edit2,
  Trash2,
  Percent,
  DollarSign,
  Eye,
  EyeOff,
  Star,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { ColumnSelectDropdown } from "@/components/ui/ColumnSelectDropdown";
import { useMoney } from "@/hooks/useMoney";
import type { TaxConfig, TaxInput, TaxType } from "@/lib/api/tax";
import { taxSchema } from "@/lib/api/tax";
import {
  createTaxConfig,
  deleteTaxConfig,
  getStoredTaxes,
  setDefaultTaxConfig,
  toggleTaxConfigStatus,
  updateTaxConfig,
} from "@/lib/tax-store";
import { cn } from "@/lib/utils";

export default function TaxesPage() {
  const { format } = useMoney();
  const [taxes, setTaxes] = useState<TaxConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Column Visibility State
  const [taxCols, setTaxCols] = useState([
    { id: "taxName", label: "Tax Name (tax_name)", visible: true },
    { id: "taxType", label: "Tax Type (tax_type)", visible: true },
    { id: "taxRate", label: "Rate (tax_rate)", visible: true },
    { id: "taxAmount", label: "Fixed Amt (tax_amount)", visible: true },
    { id: "showTaxOnReceipt", label: "Show on Receipt", visible: true },
    { id: "status", label: "Default & Status", visible: true },
  ]);

  const isColVisible = (id: string) => taxCols.find((c) => c.id === id)?.visible ?? true;
  const toggleCol = (id: string) => {
    setTaxCols((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  };
  const resetCols = () => {
    setTaxCols((prev) => prev.map((c) => ({ ...c, visible: true })));
  };

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxConfig | null>(null);
  const [deletingTax, setDeletingTax] = useState<TaxConfig | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [taxName, setTaxName] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("PERCENTAGE");
  const [taxRate, setTaxRate] = useState<number>(10);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [showTaxOnReceipt, setShowTaxOnReceipt] = useState<boolean>(true);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Load taxes on client mount
  useEffect(() => {
    setTaxes(getStoredTaxes());
    setIsLoaded(true);
  }, []);

  const reloadTaxes = () => {
    setTaxes(getStoredTaxes());
  };

  const filteredTaxes = useMemo(() => {
    if (!searchQuery.trim()) return taxes;
    const q = searchQuery.toLowerCase();
    return taxes.filter(
      (t) =>
        t.taxName.toLowerCase().includes(q) ||
        t.taxType.toLowerCase().includes(q) ||
        t.taxRate.toString().includes(q)
    );
  }, [taxes, searchQuery]);

  const openCreateDialog = () => {
    setEditingTax(null);
    setTaxName("");
    setTaxType("PERCENTAGE");
    setTaxRate(10);
    setTaxAmount(0);
    setShowTaxOnReceipt(true);
    setIsDefault(taxes.length === 0);
    setIsActive(true);
    setFormError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (tax: TaxConfig) => {
    setEditingTax(tax);
    setTaxName(tax.taxName);
    setTaxType(tax.taxType);
    setTaxRate(tax.taxRate);
    setTaxAmount(tax.taxAmount);
    setShowTaxOnReceipt(tax.showTaxOnReceipt);
    setIsDefault(tax.isDefault);
    setIsActive(tax.isActive);
    setFormError("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const inputData: TaxInput = {
      taxName,
      taxType,
      taxRate: Number(taxRate),
      taxAmount: Number(taxAmount),
      showTaxOnReceipt,
      isDefault,
      isActive,
    };

    const validation = taxSchema.safeParse(inputData);
    if (!validation.success) {
      const firstErr = validation.error.issues[0]?.message || "Invalid tax configuration";
      setFormError(firstErr);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTax) {
        updateTaxConfig(editingTax.id, validation.data);
      } else {
        createTaxConfig(validation.data);
      }
      reloadTaxes();
      setIsDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save tax configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!deletingTax) return;
    deleteTaxConfig(deletingTax.id);
    reloadTaxes();
    setDeletingTax(null);
  };

  const handleSetDefault = (id: string) => {
    const updated = setDefaultTaxConfig(id);
    setTaxes(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = toggleTaxConfigStatus(id);
    setTaxes(updated);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <Receipt className="size-6 text-primary" aria-hidden="true" />
            Tax Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tax rates, types, default settings, and receipt display options for sales management.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add Tax Rule
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tax rules by name or rate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <ColumnSelectDropdown columns={taxCols} onToggleColumn={toggleCol} onResetDefaults={resetCols} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isColVisible("taxName") && <TableHead className="font-semibold">Tax Name (tax_name)</TableHead>}
              {isColVisible("taxType") && <TableHead className="font-semibold">Tax Type (tax_type)</TableHead>}
              {isColVisible("taxRate") && <TableHead className="font-semibold text-right">Tax Rate (tax_rate)</TableHead>}
              {isColVisible("taxAmount") && <TableHead className="font-semibold text-right">Fixed Amount (tax_amount)</TableHead>}
              {isColVisible("showTaxOnReceipt") && <TableHead className="font-semibold text-center">Receipt Display</TableHead>}
              {isColVisible("status") && <TableHead className="font-semibold text-center">Default & Status</TableHead>}
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoaded ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    Loading tax settings...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTaxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No tax rules found. Click "Add Tax Rule" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredTaxes.map((tax) => (
                <TableRow key={tax.id} className="hover:bg-muted/30 transition-colors">
                  {isColVisible("taxName") && (
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {tax.taxName}
                        {tax.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            <Star className="size-3 fill-primary text-primary" />
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isColVisible("taxType") && (
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                          tax.taxType === "PERCENTAGE"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        )}
                      >
                        {tax.taxType === "PERCENTAGE" ? <Percent className="size-3" /> : <DollarSign className="size-3" />}
                        {tax.taxType}
                      </span>
                    </TableCell>
                  )}
                  {isColVisible("taxRate") && (
                    <TableCell className="text-right font-mono font-medium">
                      {tax.taxType === "PERCENTAGE" ? `${tax.taxRate.toFixed(2)}%` : "—"}
                    </TableCell>
                  )}
                  {isColVisible("taxAmount") && (
                    <TableCell className="text-right font-mono font-medium">
                      {tax.taxType === "FIXED_AMOUNT" || tax.taxAmount > 0 ? format(tax.taxAmount) : "—"}
                    </TableCell>
                  )}
                  {isColVisible("showTaxOnReceipt") && (
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          tax.showTaxOnReceipt
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {tax.showTaxOnReceipt ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {tax.showTaxOnReceipt ? "Visible" : "Hidden"}
                      </span>
                    </TableCell>
                  )}
                  {isColVisible("status") && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant={tax.isDefault ? "default" : "outline"}
                          size="sm"
                          className={cn("h-7 px-2.5 text-xs", tax.isDefault && "bg-primary text-primary-foreground")}
                          onClick={() => handleSetDefault(tax.id)}
                        >
                          {tax.isDefault ? "Default" : "Set Default"}
                        </Button>
                        <Switch
                          checked={tax.isActive}
                          onCheckedChange={() => handleToggleStatus(tax.id)}
                          aria-label="Toggle tax active status"
                        />
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tax)}
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTax(tax)}
                        className="size-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTax ? "Edit Tax Rule" : "Add Tax Rule"}</DialogTitle>
            <DialogDescription>
              Configure tax rate, type, and receipt printing defaults for sales transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {formError}
              </div>
            )}

            {/* tax_name */}
            <div className="space-y-1.5">
              <Label htmlFor="taxName">Tax Name (tax_name)</Label>
              <Input
                id="taxName"
                placeholder="e.g. VAT (Value Added Tax), Sales Tax"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* tax_type */}
            <div className="space-y-1.5">
              <Label htmlFor="taxType">Tax Type (tax_type)</Label>
              <Select value={taxType} onValueChange={(v) => { if (v) setTaxType(v as TaxType); }}>
                <SelectTrigger id="taxType">
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* tax_rate */}
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">
                  {taxType === "PERCENTAGE" ? "Tax Rate (%)" : "Base Percentage (%)"}
                </Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  disabled={taxType === "FIXED_AMOUNT"}
                />
              </div>

              {/* tax_amount */}
              <div className="space-y-1.5">
                <Label htmlFor="taxAmount">
                  {taxType === "FIXED_AMOUNT" ? "Fixed Amount ($)" : "Fixed Base ($)"}
                </Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  disabled={taxType === "PERCENTAGE"}
                />
              </div>
            </div>

            {/* show_tax_on_receipt */}
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Show Tax on Receipt (show_tax_on_receipt)</Label>
                <p className="text-xs text-muted-foreground">
                  Prints tax breakdown item line on POS receipts and customer display.
                </p>
              </div>
              <Switch
                checked={showTaxOnReceipt}
                onCheckedChange={setShowTaxOnReceipt}
              />
            </div>

            {/* Default & Active toggles */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm cursor-pointer" htmlFor="isDefaultToggle">
                  Set as Default Tax
                </Label>
                <Switch id="isDefaultToggle" checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm cursor-pointer" htmlFor="isActiveToggle">
                  Active Status
                </Label>
                <Switch id="isActiveToggle" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingTax ? "Save Changes" : "Create Tax Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DestructiveConfirmDialog
        open={!!deletingTax}
        onOpenChange={(open) => !open && setDeletingTax(null)}
        title={`Delete tax rule "${deletingTax?.taxName}"?`}
        description="This action cannot be undone. Sales calculations using this default tax will fall back to zero tax."
        confirmLabel="Delete Tax Rule"
        isPending={false}
        onConfirm={handleDelete}
      />
    </div>
  );
}
