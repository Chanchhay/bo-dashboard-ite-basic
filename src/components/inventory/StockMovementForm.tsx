"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    ArrowDownRight,
    ArrowUpRight,
    Calculator,
    Check,
    ChevronRight,
    LoaderCircle,
    Package,
    PackageOpen,
    ScanBarcode,
    SlidersHorizontal,
} from "lucide-react";

import { BarcodeScannerOverlay } from "@/components/inventory/BarcodeScannerOverlay";
import { DatePicker } from "@/components/ui/date-picker";
import {
    StockTargetSelect,
    toStockTargets,
    type StockTargetRef,
} from "@/components/inventory/stock/StockTargetSelect";
import { TourButton } from "@/components/onboarding/TourButton";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    inventoryControlClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
    clampStockInput,
    maxStockQuantity,
    type InventoryItem,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetAddOnsQuery,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";
import { useMoney } from "@/hooks/useMoney";
import {
    conversionsForOption,
    toEntryUnits,
} from "@/lib/inventory-config/entry-units";

type MovementMode = "in" | "out";

function FormField({
    label,
    name,
    hint,
    error,
    required,
    children,
}: {
    label: string;
    name: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            <Label
                htmlFor={name}
                className="text-sm font-semibold text-foreground flex items-center gap-1"
            >
                <span>{label}</span>
                {required ? <span className="text-danger">*</span> : null}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-danger font-medium" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

export function StockMovementForm({ mode }: { mode: MovementMode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramItemId = searchParams?.get("itemId") || "";
    const { toast } = useToast();
    const { format: formatMoney } = useMoney();

    const itemsQuery = useGetInventoryItemOptionsQuery();
    const addOnsQuery = useGetAddOnsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const [createEntry, createState] = useCreateStockEntryMutation();

    const [target, setTarget] = useState<StockTargetRef | null>(
        paramItemId ? { kind: "ITEM", id: paramItemId } : null,
    );
    const [optionId, setOptionId] = useState("");
    const [quantityInput, setQuantityInput] = useState("");
    const [entryUnitId, setEntryUnitId] = useState("");
    const [unitPriceInput, setUnitPriceInput] = useState("");
    const [reasonInput, setReasonInput] = useState("");
    const [batchLot, setBatchLot] = useState("");
    const [batchManufacturedAt, setBatchManufacturedAt] = useState("");
    const [batchExpiresAt, setBatchExpiresAt] = useState("");
    const [batchReceivedAt, setBatchReceivedAt] = useState("");
    const [batchOpen, setBatchOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedItemName, setScannedItemName] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const isStockIn = mode === "in";
    const todayIso = new Date().toLocaleDateString("en-CA");
    const batchAlreadyExpired =
        Boolean(batchExpiresAt) && batchExpiresAt < todayIso;
    const earliestExpiry =
        batchManufacturedAt && batchManufacturedAt > todayIso
            ? batchManufacturedAt
            : todayIso;

    if (itemsQuery.isLoading) {
        return <InventoryLoading label={`Loading stock ${mode} form`} />;
    }

    if (itemsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error,
                    `Unable to load items for stock ${mode}.`,
                )}
                retry={itemsQuery.refetch}
            />
        );
    }

    const items = (itemsQuery.data || []).filter(
        (item) => item.trackInventory !== false,
    );
    const addOns = addOnsQuery.data || [];
    const selectedItemId = target?.kind === "ITEM" ? target.id : "";
    const selectedAddOnId = target?.kind === "ADDON" ? target.id : "";
    const selectedItem = items.find((item) => item.id === selectedItemId);
    const selectedAddOn = addOns.find((addOn) => addOn.id === selectedAddOnId);
    const unitLabel =
        selectedItem?.unit?.name || selectedAddOn?.baseUnit?.name || "units";
    const onHandByTargetId = (stockQuery.data || []).reduce<
        Record<string, number>
    >((totals, summary) => {
        const id = summary.itemId || summary.addOnId || "";
        totals[id] = (totals[id] ?? 0) + (summary.quantityOnHand ?? 0);

        return totals;
    }, {});
    const targets = toStockTargets(items, addOns, onHandByTargetId);
    const unitOptions = selectedAddOn
        ? toEntryUnits(selectedAddOn.baseUnit, selectedAddOn.uomConversions || [])
        : toEntryUnits(
              selectedItem?.unit,
              conversionsForOption(selectedItem?.uomConversions || [], optionId),
          );
    const selectedUnit =
        unitOptions.find((option) => option.id === entryUnitId) ??
        unitOptions[0];
    const conversionFactor = selectedUnit?.factor || 1;

    const itemOptions = (selectedItem?.variants || [])
        .filter((variant) => variant.id && variant.name?.trim())
        .map((variant) => ({
            id: variant.id || "",
            name: variant.name || "",
        }));

    const onHand = optionId
        ? ((stockQuery.data || []).find(
              (summary) =>
                  summary.itemId === selectedItemId &&
                  summary.variantId === optionId,
          )?.quantityOnHand ?? 0)
        : ((target ? onHandByTargetId[target.id] : 0) ?? 0);

    const qty = Number(quantityInput);
    const isValidQty = quantityInput.trim() !== "" && Number.isFinite(qty) && qty > 0;
    const baseQty = isValidQty
        ? Math.round(qty * conversionFactor * 1000) / 1000
        : 0;
    const price = Number(unitPriceInput);
    const isValidPrice = unitPriceInput.trim() !== "" && Number.isFinite(price) && price >= 0;

    const resultingStock = isStockIn ? onHand + baseQty : onHand - baseQty;

    const totalValue = isValidPrice ? baseQty * price : 0;

    function handleScannedItem(item: InventoryItem) {
        if (item.trackInventory === false) {
            toast({
                tone: "error",
                title: "Inventory tracking disabled",
                description: `"${item.name || "This item"}" does not track inventory.`,
            });
            return;
        }
        setTarget({ kind: "ITEM", id: item.id });
        setScannedItemName(item.name || "Unnamed item");
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.itemId;
            return next;
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const errors: Record<string, string> = {};

        if (!target) {
            errors.itemId = "Please select an item or add-on.";
        }
        if (itemOptions.length && !optionId) {
            errors.variantId = "Please choose which option this is for.";
        }

        if (!isValidQty) {
            errors.quantity = "Please enter a valid quantity greater than 0.";
        }

        if (unitPriceInput.trim() !== "" && (!Number.isFinite(price) || price < 0)) {
            errors.unitPrice = "Unit price cannot be negative.";
        }
        if (isStockIn && unitPriceInput.trim() === "") {
            errors.unitPrice =
                "Enter what one unit cost. Put 0 if this stock was free.";
        }


        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            toast({
                tone: "error",
                title: "Incomplete stock entry",
                description: Object.values(errors)[0],
            });
            return;
        }

        setFieldErrors({});

        const quantityChange = isStockIn ? baseQty : -baseQty;

        const lotNumber = batchLot.trim();
        const manufacturedAt = batchManufacturedAt.trim();
        const expiresAt = batchExpiresAt.trim();

        const receivedAt = batchReceivedAt.trim();

        if (manufacturedAt && expiresAt && expiresAt < manufacturedAt) {
            setFieldErrors({
                batchExpiresAt: "This batch expires before it was made.",
            });
            setBatchOpen(true);
            toast({
                tone: "error",
                title: "Check the batch dates",
                description: "The expiry date falls before the manufactured date.",
            });
            return;
        }

        try {
            await createEntry({
                ...(target?.kind === "ADDON"
                    ? { addOnId: target.id }
                    : {
                          itemId: selectedItemId,
                          ...(optionId ? { variantId: optionId } : {}),
                      }),
                entryType: isStockIn ? "STOCK_IN" : "STOCK_OUT",
                quantityChange,
                unitCost: isStockIn && isValidPrice ? price : undefined,
                unitSalePrice:
                    !isStockIn && isValidPrice ? price : undefined,
                enteredQuantity: selectedUnit ? qty : undefined,
                unitId: selectedUnit?.id,
                ...(isStockIn
                    ? {
                          lotNumber: lotNumber || undefined,
                          manufacturedAt: manufacturedAt || undefined,
                          expiresAt: expiresAt || undefined,
                          receivedAt: receivedAt || undefined,
                      }
                    : {}),
                batchData: {},
                referenceType: isStockIn ? "STOCK_IN_FORM" : "STOCK_OUT_FORM",
                referenceId: "",
                referenceNumber: "",
                reason: reasonInput.trim(),
            }).unwrap();

            toast({
                tone: "success",
                title: isStockIn ? "Stock in recorded" : "Stock out recorded",
                description: `${isStockIn ? "Added" : "Deducted"} ${qty} ${unitLabel} ${isStockIn ? "to" : "from"} ${selectedItem?.name || "item"}.`,
            });

            router.push("/inventory/stock");
        } catch (error) {
            toast({
                tone: "error",
                title: `Stock ${mode} failed`,
                description: getApiErrorMessage(
                    error,
                    `Unable to save stock ${mode} movement.`,
                ),
            });
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                <InventoryPageHeader
                    title={isStockIn ? "Stock In" : "Stock Out"}
                    description={
                        isStockIn
                            ? "Record incoming inventory received into your stock."
                            : "Record outgoing inventory deductions or removals from your stock."
                    }
                    action={
                        <div className="flex items-center gap-2">
                            <TourButton />
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
                    {/* Main Form Section */}
                    <section data-tour={isStockIn ? "stock-in-form" : "stock-out-form"} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 flex flex-col gap-6">
                        <div className="flex items-center gap-3.5 border-b border-border pb-5">
                            <span
                                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                                    isStockIn
                                        ? "bg-primary/10 text-primary"
                                        : "bg-danger/10 text-danger"
                                }`}
                            >
                                {isStockIn ? (
                                    <ArrowDownRight className="size-6" />
                                ) : (
                                    <ArrowUpRight className="size-6" />
                                )}
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {isStockIn ? "Stock In Movement" : "Stock Out Movement"}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Select an item, then say how much and what it cost. A reason is worth adding but not required.
                                </p>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                                No items found. Create items in Inventory before recording stock changes.
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div data-tour="stock-item-select" className="sm:col-span-2">
                                    <FormField
                                        label="Item"
                                        name="itemId"
                                        required
                                        hint={
                                            scannedItemName
                                                ? `${scannedItemName} selected by scanner.`
                                                : "Search item by name, SKU, or barcode."
                                        }
                                        error={fieldErrors.itemId}
                                    >
                                        <div className="flex gap-2">
                                            <StockTargetSelect
                                                targets={targets}
                                                selected={target}
                                                onSelect={(picked) => {
                                                    setTarget(picked);
                                                    setEntryUnitId("");
                                                    setOptionId("");
                                                    setScannedItemName(null);
                                                    setFieldErrors((current) => {
                                                        const next = { ...current };
                                                        delete next.itemId;
                                                        return next;
                                                    });
                                                }}
                                                ariaInvalid={Boolean(
                                                    fieldErrors.itemId,
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-lg"
                                                onClick={() => setScannerOpen(true)}
                                                title="Scan item barcode"
                                            >
                                                <ScanBarcode />
                                            </Button>
                                        </div>
                                    </FormField>
                                </div>
                                {itemOptions.length ? (
                                    <div className="sm:col-span-2">
                                        <FormField
                                            label="Option"
                                            name="variantId"
                                            required
                                            hint="Each option counts its own stock, so this movement lands on the one you choose."
                                            error={fieldErrors.variantId}
                                        >
                                            <SelectField
                                                id="variantId"
                                                name="variantId"
                                                value={optionId}
                                                onValueChange={(value) => {
                                                    setOptionId(value);
                                                    setFieldErrors((current) => {
                                                        const next = { ...current };
                                                        delete next.variantId;
                                                        return next;
                                                    });
                                                }}
                                                placeholder="Choose an option"
                                                options={itemOptions.map(
                                                    (option) => ({
                                                        value: option.id,
                                                        label: option.name,
                                                    }),
                                                )}
                                                className={inventoryControlClassName}
                                            />
                                        </FormField>
                                    </div>
                                ) : null}

                                {/* Quantity Input */}
                                <div data-tour="stock-quantity-input">
                                    <FormField
                                        label="Quantity"
                                        name="quantity"
                                        required
                                        hint={
                                            selectedItemId
                                                ? `Current stock: ${onHand} ${unitLabel}`
                                                : "Number of units to adjust."
                                        }
                                        error={fieldErrors.quantity}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="quantity"
                                                name="quantity"
                                                type="number"
                                                step="1"
                                                min="1"
                                                max={maxStockQuantity}
                                                value={quantityInput}
                                                onKeyDown={(e) => {
                                                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "." || e.key === ",") {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val =
                                                        clampStockInput(
                                                            e.target.value,
                                                        );
                                                    setQuantityInput(val);
                                                    setFieldErrors((current) => {
                                                        const next = { ...current };
                                                        delete next.quantity;
                                                        return next;
                                                    });
                                                }}
                                                placeholder="e.g. 50"
                                                className={`${inventoryControlClassName} flex-1`}
                                            />
                                            {unitOptions.length > 1 ? (
                                                <select
                                                    aria-label="Unit"
                                                    value={selectedUnit?.id || ""}
                                                    onChange={(event) =>
                                                        setEntryUnitId(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground outline-none"
                                                >
                                                    {unitOptions.map((option) => (
                                                        <option
                                                            key={option.id}
                                                            value={option.id}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : selectedItemId ? (
                                                <span className="text-xs font-semibold text-muted-foreground shrink-0 bg-muted px-2.5 py-2 rounded-lg border border-border">
                                                    {unitLabel}
                                                </span>
                                            ) : null}
                                        </div>
                                        {conversionFactor !== 1 && isValidQty ? (
                                            <p className="text-xs text-muted-foreground">
                                                {qty} {selectedUnit?.label} ={" "}
                                                {baseQty} {unitLabel}
                                            </p>
                                        ) : null}
                                    </FormField>
                                </div>

                                <div data-tour="stock-price-input">
                                    <FormField
                                        label={
                                            isStockIn
                                                ? "Cost per unit"
                                                : "Sale price per unit"
                                        }
                                        name="unitPrice"
                                        required={isStockIn}
                                        hint={
                                            isStockIn
                                                ? `What one ${selectedItem?.unit?.name || "unit"} was bought for. Stock is valued from this, oldest batch first, and it is what a selling price is set against. Enter 0 if it was free.`
                                                : `What one ${selectedItem?.unit?.name || "unit"} sold for, if this is a sale made away from the till. Leave empty for waste or damage — the cost is worked out from the batches it came from.`
                                        }
                                        error={fieldErrors.unitPrice}
                                    >
                                        <Input
                                            id="unitPrice"
                                            name="unitPrice"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={unitPriceInput}
                                            onKeyDown={(e) => {
                                                if (e.key === "-" || e.key === "e") {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/-/g, "");
                                                setUnitPriceInput(val);
                                                setFieldErrors((current) => {
                                                    const next = { ...current };
                                                    delete next.unitPrice;
                                                    return next;
                                                });
                                            }}
                                            placeholder="0.00"
                                            className={inventoryControlClassName}
                                        />
                                    </FormField>
                                </div>

                                <div data-tour="stock-reason-input" className="sm:col-span-2">
                                    <FormField
                                        label="Reason"
                                        name="reason"
                                        hint={
                                            isStockIn
                                                ? "Optional. What this delivery was — supplier delivery, restock, PO-2026-001."
                                                : "Optional, but worth saying: damaged item, expired, waste."
                                        }
                                        error={fieldErrors.reason}
                                    >
                                        <Input
                                            id="reason"
                                            name="reason"
                                            value={reasonInput}
                                            onChange={(e) => {
                                                setReasonInput(e.target.value);
                                                setFieldErrors((current) => {
                                                    const next = { ...current };
                                                    delete next.reason;
                                                    return next;
                                                });
                                            }}
                                            placeholder={
                                                isStockIn
                                                    ? "e.g. Supplier purchase, Restock, Customer return"
                                                    : "e.g. Damaged item, Expired, Internal consumption"
                                            }
                                            className={inventoryControlClassName}
                                        />
                                    </FormField>
                                </div>

                                {isStockIn ? (
                                <details
                                    data-tour="stock-batch-card"
                                    open={batchOpen}
                                    onToggle={(e) =>
                                        setBatchOpen(e.currentTarget.open)
                                    }
                                    className="group sm:col-span-2 rounded-xl border border-border bg-transparent"
                                >
                                    <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <PackageOpen className="size-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="flex items-center gap-2 font-semibold text-foreground">
                                                <span>Batch details</span>
                                                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                    Optional
                                                </span>
                                            </h3>
                                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                                                For anything that goes off. Stock with an expiry date is sold before stock without one, soonest first &mdash; so a short-dated delivery leaves ahead of older stock that keeps.
                                            </p>
                                        </div>
                                        <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                                    </summary>

                                    <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
                                        <FormField
                                            label="Batch / lot number"
                                            name="batchLot"
                                            hint="The supplier's reference, for example LOT-01."
                                        >
                                            <Input
                                                id="batchLot"
                                                name="batchLot"
                                                value={batchLot}
                                                maxLength={80}
                                                onChange={(e) => setBatchLot(e.target.value)}
                                                placeholder="LOT-01"
                                                className={inventoryControlClassName}
                                            />
                                        </FormField>
                                        <FormField
                                            label="Expiration date"
                                            name="batchExpiresAt"
                                            hint={
                                                batchAlreadyExpired
                                                    ? "That date has passed. This batch will be first out and flagged as expired."
                                                    : "Leave empty if this stock does not expire."
                                            }
                                            error={fieldErrors.batchExpiresAt}
                                        >
                                            <DatePicker
                                                id="batchExpiresAt"
                                                value={batchExpiresAt}
                                                min={earliestExpiry}
                                                placeholder="Does not expire"
                                                aria-invalid={Boolean(fieldErrors.batchExpiresAt)}
                                                onValueChange={(value) => {
                                                    setBatchExpiresAt(value);
                                                    setFieldErrors((current) => {
                                                        const next = { ...current };
                                                        delete next.batchExpiresAt;
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </FormField>
                                        <FormField
                                            label="Manufactured date"
                                            name="batchManufacturedAt"
                                        >
                                            <DatePicker
                                                id="batchManufacturedAt"
                                                value={batchManufacturedAt}
                                                max={batchExpiresAt || todayIso}
                                                placeholder="Not recorded"
                                                onValueChange={(value) => {
                                                    setBatchManufacturedAt(value);
                                                    setFieldErrors((current) => {
                                                        const next = { ...current };
                                                        delete next.batchExpiresAt;
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </FormField>
                                        <FormField
                                            label="Arrived on"
                                            name="batchReceivedAt"
                                            hint="Only if you are recording this delivery late. Left empty, it arrived now."
                                        >
                                            <DatePicker
                                                id="batchReceivedAt"
                                                value={batchReceivedAt}
                                                max={todayIso}
                                                placeholder="Arrived now"
                                                onValueChange={setBatchReceivedAt}
                                            />
                                        </FormField>
                                    </div>
                                </details>
                                ) : null}
                            </div>
                        )}
                    </section>

                    <div className="flex flex-col gap-4 sticky top-6">
                        <div data-tour="stock-summary-panel" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                                <Calculator className="size-4 text-primary" />
                                <span>Movement Summary</span>
                            </h3>

                            <div className="mt-4 flex flex-col gap-3.5 text-sm">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Selected Item</span>
                                    <span className="font-medium text-foreground truncate max-w-[160px]">
                                        {selectedItem ? selectedItem.name : "None"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Current Stock</span>
                                    <span className="font-semibold text-foreground">
                                        {selectedItemId ? `${onHand} ${unitLabel}` : "-"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Adjustment</span>
                                    <span
                                        className={`font-semibold ${
                                            isStockIn ? "text-primary" : "text-danger"
                                        }`}
                                    >
                                        {isValidQty
                                            ? `${isStockIn ? "+" : "-"}${qty} ${unitLabel}`
                                            : "-"}
                                    </span>
                                </div>

                                <div className="border-t border-border pt-3 flex justify-between items-center">
                                    <span className="font-medium text-foreground">Projected Stock</span>
                                    <span
                                        className={`text-base font-bold ${
                                            !isStockIn && resultingStock < 0
                                                ? "text-danger"
                                                : "text-foreground"
                                        }`}
                                    >
                                        {selectedItemId && isValidQty
                                            ? `${resultingStock} ${unitLabel}`
                                            : selectedItemId
                                              ? `${onHand} ${unitLabel}`
                                              : "-"}
                                    </span>
                                </div>

                                {!isStockIn && isValidQty && resultingStock < 0 ? (
                                    <p className="text-xs text-danger bg-danger/10 p-2.5 rounded-lg border border-danger/20">
                                        Warning: This stock out exceeds the current on-hand quantity!
                                    </p>
                                ) : null}

                                <div className="border-t border-border pt-3 flex justify-between items-center">
                                    <span className="font-medium text-foreground">Total Value</span>
                                    <span className="text-base font-bold text-primary">
                                        {formatMoney(totalValue)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Button
                                data-tour="stock-submit-btn"
                                type="submit"
                                size="lg"
                                disabled={createState.isLoading || items.length === 0}
                                className={`w-full rounded-xl gap-2 ${
                                    !isStockIn ? "bg-danger hover:bg-danger/90 text-white" : ""
                                }`}
                            >
                                {createState.isLoading ? (
                                    <LoaderCircle className="size-4 animate-spin shrink-0" />
                                ) : (
                                    <Check className="size-4 shrink-0" />
                                )}
                                <span>{isStockIn ? "Save Stock In" : "Save Stock Out"}</span>
                            </Button>



                            <Button
                                type="button"
                                variant="outline"
                                render={<Link href="/inventory/stock" />}
                                nativeButton={false}
                                className="w-full rounded-xl"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            <BarcodeScannerOverlay
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={handleScannedItem}
            />
        </>
    );
}
