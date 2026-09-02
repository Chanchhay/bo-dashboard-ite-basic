"use client";

import { useMemo, useState } from "react";
import {
  Receipt,
  Percent,
  Save,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { TaxInclusionType } from "@/lib/api/business";
import { taxSettingsSchema } from "@/lib/api/business";
import { cn } from "@/lib/utils";
import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";
import { TourButton } from "@/components/onboarding/TourButton";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import type { PosOrder, PosReceipt, Sale } from "@/lib/api/pos-order";
import type { Business } from "@/lib/api/business";
import {
  useGetBusinessProfileQuery,
  useUpdateBusinessTaxMutation,
} from "@/services/businessApi";
import { getApiErrorMessage } from "@/lib/api-error";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Mirrors the backend's TaxCalculator exactly, so this preview never
 * promises a number a real checkout wouldn't also charge. */
function computeTax(
  netAmount: number,
  rate: number,
  inclusionType: TaxInclusionType,
  enabled: boolean,
) {
  if (!enabled || !Number.isFinite(rate) || rate <= 0) {
    return { taxAmount: 0, total: round2(netAmount) };
  }

  if (inclusionType === "INCLUSIVE") {
    const pretax = netAmount / (1 + rate / 100);
    return { taxAmount: round2(netAmount - pretax), total: round2(netAmount) };
  }

  const taxAmount = round2(netAmount * (rate / 100));
  return { taxAmount, total: round2(netAmount + taxAmount) };
}

export default function TaxesPage() {
  const { toast } = useToast();
  const businessQuery = useGetBusinessProfileQuery();
  const [updateBusinessTax, { isLoading: isSubmitting }] = useUpdateBusinessTaxMutation();

  const [formError, setFormError] = useState("");

  if (businessQuery.isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FormSkeleton rows={3} />
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (businessQuery.error || !businessQuery.data) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>
          {getApiErrorMessage(businessQuery.error, "Unable to load tax settings.")}
        </span>
      </div>
    );
  }

  const key = [
    businessQuery.data.id,
    businessQuery.data.taxEnabled,
    businessQuery.data.taxRate,
    businessQuery.data.taxInclusionType,
    businessQuery.data.taxLabel,
  ].join("|");

  return (
    <TaxesEditor
      key={key}
      business={businessQuery.data}
      isSubmitting={isSubmitting}
      formError={formError}
      setFormError={setFormError}
      updateBusinessTax={updateBusinessTax}
      toast={toast}
    />
  );
}

function TaxesEditor({
  business,
  isSubmitting,
  formError,
  setFormError,
  updateBusinessTax,
  toast,
}: {
  business: Business;
  isSubmitting: boolean;
  formError: string;
  setFormError: (message: string) => void;
  updateBusinessTax: ReturnType<typeof useUpdateBusinessTaxMutation>[0];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [isActive, setIsActive] = useState(business.taxEnabled ?? false);
  const [taxName, setTaxName] = useState(business.taxLabel || "VAT");
  const [taxRate, setTaxRate] = useState(
    business.taxRate != null ? String(business.taxRate) : "10",
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(
    (business.taxInclusionType ?? "EXCLUSIVE") === "INCLUSIVE",
  );

  const isDirty = useMemo(() => {
    return (
      isActive !== (business.taxEnabled ?? false) ||
      taxName.trim() !== (business.taxLabel || "") ||
      taxRate !== (business.taxRate != null ? String(business.taxRate) : "") ||
      isTaxInclusive !== ((business.taxInclusionType ?? "EXCLUSIVE") === "INCLUSIVE")
    );
  }, [business, isActive, taxName, taxRate, isTaxInclusive]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const inclusionType: TaxInclusionType = isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE";
    const result = taxSettingsSchema.safeParse({
      taxEnabled: isActive,
      taxRate,
      taxInclusionType: inclusionType,
      taxLabel: taxName,
    });

    if (!result.success) {
      const firstErr = result.error.issues[0]?.message || "Invalid input";
      setFormError(firstErr);
      return;
    }

    try {
      await updateBusinessTax(result.data).unwrap();
      toast({
        tone: "success",
        title: "Tax Configuration Saved",
        description: "Applied the same way on every sales channel — POS, storefront, Telegram, Messenger.",
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Something went wrong while saving.");
      setFormError(message);
      toast({
        tone: "error",
        title: "Error Saving Tax Settings",
        description: message,
      });
    }
  };

  // Real receipt preview objects — a believable two-item ticket so every
  // part of the layout (unit price, discount, subtotal) has something to show.
  const previewRate = taxRate.trim() === "" ? 10 : Number(taxRate);
  const previewLabel = taxName.trim() || "VAT";
  const previewInclusionType: TaxInclusionType = isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE";

  const previewBusiness: Business = {
    ...business,
    name: business.name || "IPOS Store & Coffee",
    taxEnabled: isActive,
    taxRate: previewRate,
    taxInclusionType: previewInclusionType,
    taxLabel: previewLabel,
  };

  const subtotal = 10.0;
  const discountAmount = 1.0;
  const afterDiscount = round2(subtotal - discountAmount);
  const { taxAmount: previewTaxAmount, total: previewTotal } = computeTax(
    afterDiscount,
    previewRate,
    previewInclusionType,
    isActive,
  );

  const previewOrder: PosOrder = {
    id: "ord_preview",
    businessId: business.id,
    customerId: null,
    invoiceNumber: "INV-2026-00849",
    channel: "POS",
    status: "PAID",
    subtotal,
    discountAmount,
    taxRate: isActive ? previewRate : 0,
    taxAmount: previewTaxAmount,
    taxInclusionType: previewInclusionType,
    total: previewTotal,
    currency: "USD",
    displayCurrency: null,
    displayExchangeRate: null,
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

  const previewSale: Sale = {
    id: "sale_preview",
    orderId: previewOrder.id,
    invoiceNumber: previewOrder.invoiceNumber,
    cashierId: null,
    customerId: null,
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    channel: "POS",
    subtotal,
    discountAmount,
    taxRate: previewOrder.taxRate,
    taxAmount: previewTaxAmount,
    taxInclusionType: previewInclusionType,
    totalAmount: previewTotal,
    paidAmount: previewTotal,
    changeAmount: 0,
    currency: "USD",
    displayCurrency: null,
    displayExchangeRate: null,
    paymentMethod: "CASH",
    itemCount: 3,
    note: previewOrder.note,
    soldAt: previewOrder.createdDate,
  };

  const mockReceipt: PosReceipt | null = isActive
    ? {
        id: "rcpt_preview",
        orderId: previewOrder.id,
        invoiceNumber: previewOrder.invoiceNumber,
        vatNumber: "VATTIN-10928374",
        type: "PHYSICAL",
        fileUrl: null,
        deviceId: null,
        printedBy: null,
        printedAt: null,
        issuedAt: new Date().toISOString(),
      }
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header (sticky on desktop only) */}
      <div className="static lg:sticky lg:top-0 lg:z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-2.5 bg-shell/95 lg:backdrop-blur-md transition-all flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Store Tax Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Configure your store tax rule — applied the same way on POS, storefront, Telegram, and Messenger orders.
          </p>
        </div>
        <TourButton />
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
                  Control whether tax calculation is active for checkout transactions on every channel.
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
                    Automatically calculate tax on every order — POS, storefront, Telegram, Messenger.
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
              <div data-tour="tax-name-input" className="space-y-2 sm:col-span-2">
                <Label htmlFor="taxName" className="font-medium text-foreground">
                  Tax Label / Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="taxName"
                  value={taxName}
                  disabled={!isActive}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g. VAT, Sales Tax, Service Tax"
                  maxLength={30}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Appears on line items on printed receipts.
                </p>
              </div>

              {/* Tax Rate */}
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
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
              </div>

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
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="h-10 flex-1 rounded-xl px-4 text-xs sm:h-11 sm:flex-initial sm:px-6 sm:text-sm gap-2"
            >
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
          <div className="rounded-xl border bg-card p-5 shadow-sm sticky top-[86px]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Receipt Preview
              </h3>
            </div>

            {/* Receipt Ticket Render */}
            <div className="flex justify-center py-2">
              <ReceiptTicket
                business={previewBusiness}
                order={previewOrder}
                sale={previewSale}
                receipt={mockReceipt}
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
