"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    Calculator,
    Check,
    LoaderCircle,
    Minus,
    PackageOpen,
    Plus,
    ScanBarcode,
    SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { BarcodeScannerDialog } from "@/components/inventory/BarcodeScannerDialog";
import { SearchableItemSelect } from "@/components/inventory/SearchableItemSelect";
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
import { useToast } from "@/components/ui/toast";
import {
    stockEntrySchema,
    type InventoryItem,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";
import { useMoney } from "@/hooks/useMoney";

function Field({
    label,
    name,
    hint,
    error,
    children,
}: {
    label: string;
    name: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            <Label
                htmlFor={name}
                className="text-sm font-semibold text-foreground"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

function issueMap(
    issues: { path: PropertyKey[]; message: string }[],
) {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
        errors[String(issue.path[0] || "form")] ||= issue.message;
    }
    return errors;
}

function getOptionalFormValue(formData: FormData, name: string) {
    return String(formData.get(name) || "").trim();
}

export function StockAdjustmentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramItemId = searchParams?.get("itemId") || "";
    const { toast } = useToast();
    const { format: formatMoney } = useMoney();
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const [createEntry, createState] =
        useCreateStockEntryMutation();
    const [adjustmentType, setAdjustmentType] = useState<"ADD" | "REMOVE">("ADD");
    const [quantityInput, setQuantityInput] = useState("");
    const [unitCostInput, setUnitPriceInput] = useState("");
    const [batchLot, setBatchLot] = useState("");
    const [batchManufacturedAt, setBatchManufacturedAt] = useState("");
    const [batchExpiresAt, setBatchExpiresAt] = useState("");
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [selectedItemId, setSelectedItemId] = useState(paramItemId);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedItemName, setScannedItemName] = useState<string | null>(null);

    if (itemsQuery.isLoading) {
        return <InventoryLoading label="Loading stock form" />;
    }

    if (itemsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error,
                    "Unable to load items for stock adjustment.",
                )}
                retry={itemsQuery.refetch}
            />
        );
    }

    const items = itemsQuery.data || [];
    const selectedItem = items.find((item) => item.id === selectedItemId);
    const unitLabel = selectedItem?.unit?.name || "";
    const onHand =
        (stockQuery.data || []).find(
            (summary) => summary.itemId === selectedItemId,
        )?.quantityOnHand ?? 0;
    const parsedQty = Math.abs(Number(quantityInput));
    const qtyValid = quantityInput.trim() !== "" && Number.isFinite(parsedQty) && parsedQty > 0;
    const change = qtyValid ? (adjustmentType === "ADD" ? parsedQty : -parsedQty) : 0;
    const resulting =
        selectedItemId && quantityInput.trim() !== "" && Number.isFinite(parsedQty)
            ? onHand + change
            : selectedItemId
              ? onHand
              : undefined;

    const cost = Number(unitCostInput);
    const isValidPrice = unitCostInput.trim() !== "" && Number.isFinite(cost) && cost >= 0;
    const totalValue = qtyValid && isValidPrice ? parsedQty * cost : 0;

    function handleScannedItem(item: InventoryItem) {
        setSelectedItemId(item.id);
        setScannedItemName(item.name || "Unnamed item");
        setFieldErrors((current) => {
            if (!current.itemId) {
                return current;
            }

            const next = { ...current };
            delete next.itemId;
            return next;
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const batchData: Record<string, string> = {};
        if (batchLot.trim()) batchData.lot = batchLot.trim();
        if (batchManufacturedAt.trim()) batchData.manufacturedAt = batchManufacturedAt.trim();
        if (batchExpiresAt.trim()) batchData.expiresAt = batchExpiresAt.trim();

        const unitCostValue = getOptionalFormValue(
            formData,
            "unitCost",
        );
        const parsedQty = Math.abs(Number(quantityInput));
        const calculatedChange = adjustmentType === "ADD" ? parsedQty : -parsedQty;

        const result = stockEntrySchema.safeParse({
            itemId: String(formData.get("itemId") || ""),
            entryType: "ADJUSTMENT",
            quantityChange: calculatedChange,
            unitCost:
                unitCostValue === ""
                    ? undefined
                    : Number(unitCostValue),
            batchData,
            referenceType: "ADJUSTMENT_FORM",
            referenceId: "",
            referenceNumber: "",
            reason: String(formData.get("reason") || ""),
        });

        if (!result.success) {
            setFieldErrors(issueMap(result.error.issues));
            toast({
                tone: "error",
                title: "Check the highlighted stock information",
                description: result.error.issues[0]?.message,
            });
            return;
        }

        setFieldErrors({});

        try {
            await createEntry(result.data).unwrap();
            toast({
                tone: "success",
                title: "Stock entry recorded",
            });
            router.push("/inventory/stock");
        } catch (error) {
            toast({
                tone: "error",
                title: "Stock entry not recorded",
                description: getApiErrorMessage(
                    error,
                    "Unable to create the stock entry.",
                ),
            });
        }
    }

    return (
        <>
            <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-6"
            >
            <InventoryPageHeader
                title="Adjust stock"
                description="Every change to stock is recorded as a movement, so the history stays complete."
                action={
                    <Button
                        variant="outline"
                        render={<Link href="/inventory/stock" />}
                        nativeButton={false}
                        className="h-10 gap-2 rounded-xl"
                    >
                        <ArrowLeft className="size-4" />
                        Back to stock
                    </Button>
                }
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
                <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <SlidersHorizontal className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            Stock entry information
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the quantity and any tracking details for
                            this stock change.
                        </p>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-warning">
                        Create an item before adding stock.
                    </div>
                ) : (
                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <Field
                            label="Item *"
                            name="itemId"
                            hint={
                                scannedItemName
                                    ? `${scannedItemName} selected by barcode.`
                                    : "Search item by name, SKU, or barcode."
                            }
                            error={fieldErrors.itemId}
                        >
                            <div className="flex gap-2">
                                <SearchableItemSelect
                                    items={items}
                                    selectedItemId={selectedItemId}
                                    onSelect={(id) => {
                                        setSelectedItemId(id);
                                        setScannedItemName(null);
                                        setFieldErrors((current) => {
                                            const next = { ...current };
                                            delete next.itemId;
                                            return next;
                                        });
                                    }}
                                    stockSummaryMap={Object.fromEntries(
                                        (stockQuery.data || []).map((s) => [
                                            s.itemId,
                                            s.quantityOnHand,
                                        ]),
                                    )}
                                    placeholder="Search item by name, SKU, or barcode..."
                                    ariaInvalid={Boolean(fieldErrors.itemId)}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-lg"
                                    onClick={() => setScannerOpen(true)}
                                    aria-label="Scan an item barcode"
                                    title="Scan item barcode"
                                >
                                    <ScanBarcode />
                                </Button>
                            </div>
                        </Field>

                        {/* Adjustment Action Toggle */}
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Adjustment Action *
                            </Label>
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-border bg-muted/30">
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType("ADD")}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                        adjustmentType === "ADD"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    <Plus className="size-4 shrink-0" />
                                    <span>Increase Stock (+)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType("REMOVE")}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                        adjustmentType === "REMOVE"
                                            ? "bg-danger text-danger-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    <Minus className="size-4 shrink-0" />
                                    <span>Decrease Stock (-)</span>
                                </button>
                            </div>
                        </div>

                        {/* Quantity Field */}
                        <Field
                            label="Quantity *"
                            name="quantity"
                            hint={
                                selectedItemId
                                    ? `Current stock: ${onHand} ${unitLabel}`
                                    : "Number of units to adjust."
                            }
                            error={fieldErrors.quantityChange}
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    id="quantity"
                                    name="quantity"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={quantityInput}
                                    onChange={(event) => {
                                        setQuantityInput(event.target.value);
                                        setFieldErrors((current) => {
                                            const next = { ...current };
                                            delete next.quantityChange;
                                            return next;
                                        });
                                    }}
                                    placeholder="e.g. 10"
                                    aria-invalid={Boolean(
                                        fieldErrors.quantityChange,
                                    )}
                                    className={`${inventoryControlClassName} flex-1`}
                                />
                                {unitLabel ? (
                                    <span className="shrink-0 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border">
                                        {unitLabel}
                                    </span>
                                ) : null}
                            </div>
                            {selectedItemId ? (
                                <p
                                    className={
                                        resulting !== undefined && resulting < 0
                                            ? "text-xs text-danger font-medium"
                                            : "text-xs text-muted-foreground"
                                    }
                                    aria-live="polite"
                                >
                                    {quantityInput.trim() === "" ? (
                                        `${onHand} ${unitLabel} on hand.`
                                    ) : resulting !== undefined && resulting < 0 ? (
                                        <>
                                            {onHand} → <strong>{resulting}</strong>{" "}
                                            {unitLabel} — this takes stock below
                                            zero.
                                        </>
                                    ) : (
                                        <>
                                            {onHand} → <strong>{resulting}</strong>{" "}
                                            {unitLabel}
                                        </>
                                    )}
                                </p>
                            ) : null}
                        </Field>
                        <Field
                            label="Unit cost"
                            name="unitCost"
                            hint={
                                unitLabel
                                    ? `What one ${unitLabel.toLowerCase()} cost you. Feeds stock value.`
                                    : "What one unit cost you. Feeds stock value."
                            }
                            error={fieldErrors.unitCost}
                        >
                                <Input
                                    id="unitCost"
                                    name="unitCost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitCostInput}
                                    onChange={(e) => setUnitPriceInput(e.target.value)}
                                    placeholder="0.00"
                                    aria-invalid={Boolean(
                                        fieldErrors.unitCost,
                                    )}
                                    className={inventoryControlClassName}
                                />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field
                                label="Reason"
                                name="reason"
                                error={fieldErrors.reason}
                            >
                                <Input
                                    id="reason"
                                    name="reason"
                                    placeholder="e.g. Cycle count correction, Damaged stock, Spoilage"
                                    aria-invalid={Boolean(
                                        fieldErrors.reason,
                                    )}
                                    className={inventoryControlClassName}
                                />
                            </Field>
                        </div>

                        {/* Batch Details Card */}
                        <div className="sm:col-span-2 rounded-xl border border-border bg-transparent p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                    <PackageOpen className="size-5" />
                                </span>
                                <div>
                                    <h3 className="font-semibold text-foreground">
                                        Batch details
                                    </h3>
                                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                                        Optional. Use these fields when stock is tracked by lot or expiration date. No JSON is required.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <Field
                                    label="Batch / lot number"
                                    name="batchLot"
                                    hint="For example, LOT-01."
                                >
                                    <Input
                                        id="batchLot"
                                        name="batchLot"
                                        value={batchLot}
                                        onChange={(e) => setBatchLot(e.target.value)}
                                        placeholder="LOT-01"
                                        className={inventoryControlClassName}
                                    />
                                </Field>
                                <Field
                                    label="Manufactured date"
                                    name="batchManufacturedAt"
                                >
                                    <Input
                                        id="batchManufacturedAt"
                                        name="batchManufacturedAt"
                                        type="date"
                                        value={batchManufacturedAt}
                                        onChange={(e) => setBatchManufacturedAt(e.target.value)}
                                        className={inventoryControlClassName}
                                    />
                                </Field>
                                <Field
                                    label="Expiration date"
                                    name="batchExpiresAt"
                                >
                                    <Input
                                        id="batchExpiresAt"
                                        name="batchExpiresAt"
                                        type="date"
                                        value={batchExpiresAt}
                                        onChange={(e) => setBatchExpiresAt(e.target.value)}
                                        className={inventoryControlClassName}
                                    />
                                </Field>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Side Live Summary Panel */}
            <div className="flex flex-col gap-4 sticky top-6">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
                                    adjustmentType === "ADD" ? "text-primary" : "text-danger"
                                }`}
                            >
                                {qtyValid
                                    ? `${adjustmentType === "ADD" ? "+" : "-"}${parsedQty} ${unitLabel}`
                                    : "-"}
                            </span>
                        </div>

                        <div className="border-t border-border pt-3 flex justify-between items-center">
                            <span className="font-medium text-foreground">Projected Stock</span>
                            <span
                                className={`text-base font-bold ${
                                    resulting !== undefined && resulting < 0
                                        ? "text-danger"
                                        : "text-foreground"
                                }`}
                            >
                                {selectedItemId && resulting !== undefined
                                    ? `${resulting} ${unitLabel}`
                                    : selectedItemId
                                      ? `${onHand} ${unitLabel}`
                                      : "-"}
                            </span>
                        </div>

                        {resulting !== undefined && resulting < 0 ? (
                            <p className="text-xs text-danger bg-danger/10 p-2.5 rounded-lg border border-danger/20">
                                Warning: This adjustment takes stock below zero!
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

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={createState.isLoading || items.length === 0}
                        className="w-full rounded-xl gap-2"
                    >
                        {createState.isLoading ? (
                            <LoaderCircle className="size-4 animate-spin shrink-0" />
                        ) : (
                            <Check className="size-4 shrink-0" />
                        )}
                        <span>Save adjustment</span>
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
            <BarcodeScannerDialog
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={handleScannedItem}
            />
        </>
    );
}
