"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    ArrowDownRight,
    ArrowUpRight,
    Calculator,
    Check,
    LoaderCircle,
    Package,
    ScanBarcode,
} from "lucide-react";

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
    type InventoryItem,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";
import { useMoney } from "@/hooks/useMoney";

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
    const { toast } = useToast();
    const { format: formatMoney } = useMoney();

    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const [createEntry, createState] = useCreateStockEntryMutation();

    const [selectedItemId, setSelectedItemId] = useState("");
    const [quantityInput, setQuantityInput] = useState("");
    const [unitPriceInput, setUnitPriceInput] = useState("");
    const [reasonInput, setReasonInput] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedItemName, setScannedItemName] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const isStockIn = mode === "in";

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

    const items = itemsQuery.data || [];
    const selectedItem = items.find((item) => item.id === selectedItemId);
    const unitLabel = selectedItem?.unit?.name || "units";
    const onHand =
        (stockQuery.data || []).find(
            (summary) => summary.itemId === selectedItemId,
        )?.quantityOnHand ?? 0;

    const qty = Number(quantityInput);
    const isValidQty = quantityInput.trim() !== "" && Number.isFinite(qty) && qty > 0;
    const price = Number(unitPriceInput);
    const isValidPrice = unitPriceInput.trim() !== "" && Number.isFinite(price) && price >= 0;

    const resultingStock = isStockIn
        ? onHand + (isValidQty ? qty : 0)
        : onHand - (isValidQty ? qty : 0);

    const totalValue = isValidQty && isValidPrice ? qty * price : 0;

    function handleScannedItem(item: InventoryItem) {
        setSelectedItemId(item.id);
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

        if (!selectedItemId) {
            errors.itemId = "Please select an item.";
        }

        if (!isValidQty) {
            errors.quantity = "Please enter a valid quantity greater than 0.";
        }

        if (unitPriceInput.trim() !== "" && (!Number.isFinite(price) || price < 0)) {
            errors.unitPrice = "Unit price cannot be negative.";
        }

        if (!reasonInput.trim()) {
            errors.reason = "Please enter a reason for this stock change.";
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

        const quantityChange = isStockIn ? qty : -qty;

        try {
            await createEntry({
                itemId: selectedItemId,
                entryType: isStockIn ? "STOCK_IN" : "STOCK_OUT",
                quantityChange,
                unitCost: isValidPrice ? price : undefined,
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
                    {/* Main Form Section */}
                    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 flex flex-col gap-6">
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
                                    Select an item, specify quantity, price, and reason for this change.
                                </p>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                                No items found. Create items in Inventory before recording stock changes.
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2">
                                {/* Item Selector */}
                                <div className="sm:col-span-2">
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
                                                title="Scan item barcode"
                                            >
                                                <ScanBarcode />
                                            </Button>
                                        </div>
                                    </FormField>
                                </div>

                                {/* Quantity Input */}
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
                                            step="0.01"
                                            min="0.01"
                                            value={quantityInput}
                                            onChange={(e) => {
                                                setQuantityInput(e.target.value);
                                                setFieldErrors((current) => {
                                                    const next = { ...current };
                                                    delete next.quantity;
                                                    return next;
                                                });
                                            }}
                                            placeholder="e.g. 50"
                                            className={`${inventoryControlClassName} flex-1`}
                                        />
                                        {selectedItemId ? (
                                            <span className="text-xs font-semibold text-muted-foreground shrink-0 bg-muted px-2.5 py-2 rounded-lg border border-border">
                                                {unitLabel}
                                            </span>
                                        ) : null}
                                    </div>
                                </FormField>

                                {/* Unit Price Input */}
                                <FormField
                                    label="Unit Price ($)"
                                    name="unitPrice"
                                    hint="Price or cost per single unit."
                                    error={fieldErrors.unitPrice}
                                >
                                    <Input
                                        id="unitPrice"
                                        name="unitPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={unitPriceInput}
                                        onChange={(e) => {
                                            setUnitPriceInput(e.target.value);
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

                                {/* Reason Input */}
                                <div className="sm:col-span-2">
                                    <FormField
                                        label="Reason"
                                        name="reason"
                                        required
                                        hint={
                                            isStockIn
                                                ? "Enter reason for stock in (e.g. Supplier delivery, Restock, PO-2026-001)"
                                                : "Enter reason for stock out (e.g. Damaged item, Expired, Waste)"
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

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2.5">
                            <Button
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

            <BarcodeScannerDialog
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={handleScannedItem}
            />
        </>
    );
}
