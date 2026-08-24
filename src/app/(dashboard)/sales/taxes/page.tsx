"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Percent,
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type { TaxConfig, TaxType } from "@/lib/api/tax";
import { taxSchema } from "@/lib/api/tax";
import { getDefaultTax, updateDefaultTax } from "@/lib/tax-store";
import { cn } from "@/lib/utils";

import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import type { PosOrder, PosReceipt } from "@/lib/api/pos-order";
import type { Business } from "@/lib/api/business";

export default function TaxesPage() {
  const { format } = useMoney();
  const { toast } = useToast();

  const [savedConfig, setSavedConfig] = useState<TaxConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Single Default Tax Form Fields
  const [taxName, setTaxName] = useState("VAT");
  const [taxType, setTaxType] = useState<TaxType>("PERCENTAGE");
  const [taxRate, setTaxRate] = useState<number>(10);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);

  // Load default tax settings on mount
  useEffect(() => {
    const defaultTax = getDefaultTax();
    setSavedConfig(defaultTax);
    setTaxName(defaultTax.taxName || "VAT");
    setTaxType(defaultTax.taxType || "PERCENTAGE");
    setTaxRate(defaultTax.taxRate ?? 10);
    setTaxAmount(defaultTax.taxAmount ?? 0);
    setIsActive(defaultTax.isActive ?? true);
    setIsTaxInclusive(defaultTax.isTaxInclusive ?? false);
    setIsLoaded(true);
  }, []);

  const isDirty = useMemo(() => {
    if (!savedConfig) return false;
    return (
      taxName.trim() !== (savedConfig.taxName || "") ||
      taxType !== savedConfig.taxType ||
      Number(taxRate) !== savedConfig.taxRate ||
      Number(taxAmount) !== savedConfig.taxAmount ||
      isActive !== savedConfig.isActive ||
      isTaxInclusive !== (savedConfig.isTaxInclusive ?? false)
    );
  }, [savedConfig, taxName, taxType, taxRate, taxAmount, isActive, isTaxInclusive]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        taxName,
        taxType,
        taxRate: Number(taxRate),
        taxAmount: Number(taxAmount),
        showTaxOnReceipt: true,
        isDefault: true,
        isActive,
        isTaxInclusive,
      };

      // Validate with schema
      const parseResult = taxSchema.safeParse(payload);
      if (!parseResult.success) {
        const firstErr = parseResult.error.issues[0]?.message || "Invalid input";
        setFormError(firstErr);
        setIsSubmitting(false);
        return;
      }

      // Update default tax
      const updated = updateDefaultTax(parseResult.data);
      setSavedConfig(updated);

      toast({
        tone: "success",
        title: "Tax Configuration Saved",
        description: "Your default store tax settings have been updated.",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to update tax configuration.");
      toast({
        tone: "error",
        title: "Error Saving Tax Settings",
        description: err?.message || "Something went wrong while saving.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real receipt preview objects
  const mockBusiness: Business = {
    id: "biz_demo",
    name: "IPOS Store & Coffee",
    phoneNumber: "+855 23 999 888",
    address: "#123 Samdach Preah Sihanouk",
    cityOrProvince: "Phnom Penh",
  };

  const previewTaxConfig: TaxConfig = {
    id: "tax_default",
    taxName: taxName.trim() || "VAT",
    taxType,
    taxRate: Number(taxRate) || 0,
    taxAmount: Number(taxAmount) || 0,
    showTaxOnReceipt: true,
    isDefault: true,
    isActive,
    isTaxInclusive,
  };

  const subtotal = 10.0;
  const discountAmount = 1.0;
  const afterDiscount = subtotal - discountAmount;
  const rateNum = Number(taxRate) || 0;
  const previewTaxAmount = isActive
    ? isTaxInclusive
      ? rateNum > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (rateNum / 100)))).toFixed(2)) : 0
      : taxType === "PERCENTAGE"
        ? parseFloat((afterDiscount * (rateNum / 100)).toFixed(2))
        : Number(taxAmount) || 0
    : 0;
  const previewTotal = isActive && isTaxInclusive ? afterDiscount : Math.max(0, afterDiscount + previewTaxAmount);

  const previewOrder: PosOrder = {
    id: "ord_preview",
    businessId: "biz_demo",
    customerId: null,
    invoiceNumber: "INV-2026-00849",
    channel: "POS",
    status: "PAID",
    subtotal,
    discountAmount,
    taxRate: isActive ? (taxType === "PERCENTAGE" ? Number(taxRate) : 0) : 0,
    taxAmount: previewTaxAmount,
    total: previewTotal,
    currency: "USD",
    displayCurrency: "KHR",
    displayExchangeRate: 4000,
    note: "Sample Order",
    items: [
      {
        id: "item_1",
        itemId: "i1",
        variantId: null,
        itemName: "Iced Cappuccino (L)",
        quantity: 1,
        unitPrice: 4.5,
        discountAmount: 0,
        lineTotal: 4.5,
      },
      {
        id: "item_2",
        itemId: "i2",
        variantId: null,
        itemName: "Butter Croissant",
        quantity: 2,
        unitPrice: 2.75,
        discountAmount: 1.0,
        lineTotal: 4.5,
      },
    ],
    createdDate: new Date().toISOString(),
  };

  const mockReceipt: PosReceipt = {
    id: "rcpt_preview",
    orderId: "ord_preview",
    invoiceNumber: "INV-2026-00849",
    vatNumber: "VATTIN-10928374",
    type: "PHYSICAL",
    fileUrl: null,
    deviceId: null,
    printedBy: null,
    printedAt: null,
    issuedAt: new Date().toISOString(),
  };

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading tax settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Store Tax Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your store tax rule applied to POS orders and customer receipts.
          </p>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Card 1: Status Options */}
          <div data-tour="tax-status-toggle" className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tax Status</h2>
                <p className="text-xs text-muted-foreground">
                  Control whether tax calculation is active for POS checkout transactions.
                </p>
              </div>
              <span
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30 font-bold dark:bg-primary/20 dark:border-primary/40"
                    : "bg-muted text-muted-foreground border-muted"
                )}
              >
                {isActive ? "Active" : "Disabled"}
              </span>
            </div>

            <div className="space-y-6">
              {/* Enable Tax Toggle */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-base font-medium cursor-pointer">
                    Enable Tax Calculation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculate default tax on POS checkout transactions and receipts.
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Basic Tax Identity & Mode (Grayed out when tax is disabled) */}
          <div
            className={cn(
              "rounded-xl border bg-card p-6 shadow-sm space-y-6 transition-all duration-200",
              !isActive && "opacity-50 pointer-events-none select-none bg-muted/10"
            )}
          >
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-foreground">Tax Calculation & Pricing Mode</h2>
              <p className="text-xs text-muted-foreground">
                Define tax label, rate, and whether prices include tax or charge extra on top.
              </p>
            </div>

            {!isActive && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Tax calculation is disabled. Turn ON &quot;Enable Tax Calculation&quot; above to configure tax settings.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Tax Name */}
              <div data-tour="tax-name-input" className="space-y-2">
                <Label htmlFor="taxName" className="font-medium text-foreground">
                  Tax Label / Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="taxName"
                  value={taxName}
                  disabled={!isActive}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g. VAT, Sales Tax, Service Tax"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Appears on line items on printed receipts.
                </p>
              </div>

              {/* Tax Type */}
              <div data-tour="tax-type-select" className="space-y-2">
                <Label htmlFor="taxType" className="font-medium text-foreground">
                  Calculation Type
                </Label>
                <Select
                  value={taxType}
                  disabled={!isActive}
                  onValueChange={(v) => {
                    if (v) setTaxType(v as TaxType);
                  }}
                >
                  <SelectTrigger id="taxType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Dollar Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Rate or Fixed Amount */}
              {taxType === "PERCENTAGE" ? (
                <div data-tour="tax-rate-input" className="space-y-2 sm:col-span-2">
                  <Label htmlFor="taxRate" className="font-medium text-foreground">
                    Tax Rate Percentage (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      disabled={!isActive}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="pr-10"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                      <Percent className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div data-tour="tax-rate-input" className="space-y-2 sm:col-span-2">
                  <Label htmlFor="taxAmount" className="font-medium text-foreground">
                    Fixed Tax Amount ($)
                  </Label>
                  <div className="relative">
                    <Input
                      id="taxAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={taxAmount}
                      disabled={!isActive}
                      onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                      className="pl-8"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Pricing Mode (Exclusive vs Inclusive) */}
              <div data-tour="tax-mode-selection" className="space-y-2 sm:col-span-2 pt-2 border-t">
                <Label className="font-medium text-foreground">Tax Pricing Mode</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => isActive && setIsTaxInclusive(false)}
                    className={cn(
                      "rounded-lg border p-3.5 space-y-1 transition-all",
                      isActive ? "cursor-pointer" : "cursor-not-allowed",
                      !isTaxInclusive && isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : !isActive
                          ? "bg-muted/30 border-muted"
                          : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Add Tax On Top (Exclusive)</span>
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center",
                          !isTaxInclusive && isActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                        )}
                      >
                        {!isTaxInclusive && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adds tax extra above order subtotal (e.g. $9.00 + $0.90 VAT = $9.90 Total).
                    </p>
                  </div>

                  <div
                    onClick={() => isActive && setIsTaxInclusive(true)}
                    className={cn(
                      "rounded-lg border p-3.5 space-y-1 transition-all",
                      isActive ? "cursor-pointer" : "cursor-not-allowed",
                      isTaxInclusive && isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : !isActive
                          ? "bg-muted/30 border-muted"
                          : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Included in Prices (Inclusive)</span>
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center",
                          isTaxInclusive && isActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                        )}
                      >
                        {isTaxInclusive && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Product prices already include tax. No extra charge added to total.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button Action Bar */}
          <div data-tour="tax-save-btn" className="flex justify-end pt-2">
            <Button type="submit" disabled={!isDirty || isSubmitting} className="min-w-[160px] gap-2">
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Tax Settings
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Authentic Receipt Ticket Preview Panel */}
        <div data-tour="tax-receipt-preview" className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm sticky top-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Receipt Preview
              </h3>
            </div>

            {/* Receipt Ticket Render */}
            <div className="flex justify-center py-2">
              <ReceiptTicket
                business={mockBusiness}
                order={previewOrder}
                receipt={mockReceipt}
                taxConfig={previewTaxConfig}
                className="max-w-full border"
              />
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This preview uses the exact same receipt layout printed for customers after purchasing.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
