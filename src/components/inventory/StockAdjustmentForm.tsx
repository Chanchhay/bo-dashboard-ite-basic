"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    LoaderCircle,
    PackageOpen,
    ScanBarcode,
    SlidersHorizontal,
} from "lucide-react";

import { BarcodeScannerDialog } from "@/components/inventory/BarcodeScannerDialog";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    manualStockEntryTypes,
    stockEntrySchema,
    stockEntryTypeLabels,
    type InventoryItem,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
} from "@/services/inventoryApi";

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
    const { toast } = useToast();
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const [createEntry, createState] =
        useCreateStockEntryMutation();
    const [quantityChange, setQuantityChange] = useState("");
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [selectedItemId, setSelectedItemId] = useState("");
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
    const change = Number(quantityChange);
    // Showing the balance this lands on is what turns "-40" from a guess into a
    // decision — and it is the only place a negative result becomes visible
    // before it is committed.
    const resulting =
        quantityChange.trim() !== "" && Number.isFinite(change)
            ? onHand + change
            : undefined;

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
        const batchFields = [
            ["lot", "batchLot"],
            ["manufacturedAt", "batchManufacturedAt"],
            ["expiresAt", "batchExpiresAt"],
        ] as const;

        for (const [apiKey, fieldName] of batchFields) {
            const value = getOptionalFormValue(formData, fieldName);
            if (value) {
                batchData[apiKey] = value;
            }
        }

        const unitCostValue = getOptionalFormValue(
            formData,
            "unitCost",
        );
        const result = stockEntrySchema.safeParse({
            itemId: String(formData.get("itemId") || ""),
            entryType: String(formData.get("entryType") || ""),
            quantityChange: Number(
                formData.get("quantityChange") || 0,
            ),
            unitCost:
                unitCostValue === ""
                    ? undefined
                    : Number(unitCostValue),
            batchData,
            referenceType: String(
                formData.get("referenceType") || "",
            ),
            referenceId: String(formData.get("referenceId") || ""),
            referenceNumber: String(
                formData.get("referenceNumber") || "",
            ),
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
                        className="h-10 gap-2"
                    >
                        <ArrowLeft />
                        Back to stock
                    </Button>
                }
            />

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
                                    : "Choose an item or scan its barcode."
                            }
                            error={fieldErrors.itemId}
                        >
                            <div className="flex gap-2">
                                <Select
                                    name="itemId"
                                    value={selectedItemId}
                                    onValueChange={(value) => {
                                        setSelectedItemId(value || "");
                                        setScannedItemName(null);
                                    }}
                                    items={Object.fromEntries(
                                        items.map((item) => [
                                            item.id,
                                            item.name || "Unnamed item",
                                        ]),
                                    )}
                                >
                                    <SelectTrigger
                                        id="itemId"
                                        className={`${inventoryControlClassName} w-full flex-1`}
                                        aria-invalid={Boolean(
                                            fieldErrors.itemId,
                                        )}
                                    >
                                        <SelectValue placeholder="Choose an item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name || "Unnamed item"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        <Field
                            label="Entry type *"
                            name="entryType"
                            error={fieldErrors.entryType}
                        >
                            <Select
                                name="entryType"
                                defaultValue="ADJUSTMENT"
                                items={Object.fromEntries(
                                    manualStockEntryTypes.map((entryType) => [
                                        entryType,
                                        stockEntryTypeLabels[entryType],
                                    ]),
                                )}
                            >
                                <SelectTrigger
                                    id="entryType"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {manualStockEntryTypes.map((entryType) => (
                                        <SelectItem
                                            key={entryType}
                                            value={entryType}
                                        >
                                            {stockEntryTypeLabels[entryType]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            label="Quantity change *"
                            name="quantityChange"
                            hint={
                                selectedItemId
                                    ? undefined
                                    : "Positive adds stock, negative removes it."
                            }
                            error={fieldErrors.quantityChange}
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    id="quantityChange"
                                    name="quantityChange"
                                    type="number"
                                    step="0.01"
                                    value={quantityChange}
                                    onChange={(event) =>
                                        setQuantityChange(event.target.value)
                                    }
                                    placeholder="10 or -3"
                                    aria-invalid={Boolean(
                                        fieldErrors.quantityChange,
                                    )}
                                    className={`${inventoryControlClassName} flex-1`}
                                />
                                {unitLabel ? (
                                    <span className="shrink-0 text-sm text-muted-foreground">
                                        {unitLabel}
                                    </span>
                                ) : null}
                            </div>
                            {selectedItemId ? (
                                <p
                                    className={
                                        resulting !== undefined && resulting < 0
                                            ? "text-xs text-danger"
                                            : "text-xs text-muted-foreground"
                                    }
                                    aria-live="polite"
                                >
                                    {resulting === undefined ? (
                                        `${onHand} ${unitLabel} on hand. Positive adds, negative removes.`
                                    ) : resulting < 0 ? (
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
                                placeholder="0.00"
                                aria-invalid={Boolean(
                                    fieldErrors.unitCost,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <Field
                            label="Reference type"
                            name="referenceType"
                            error={fieldErrors.referenceType}
                        >
                            <Input
                                id="referenceType"
                                name="referenceType"
                                placeholder="PURCHASE_ORDER"
                                aria-invalid={Boolean(
                                    fieldErrors.referenceType,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <Field
                            label="Reference number"
                            name="referenceNumber"
                            error={fieldErrors.referenceNumber}
                        >
                            <Input
                                id="referenceNumber"
                                name="referenceNumber"
                                placeholder="PO-2026-001"
                                aria-invalid={Boolean(
                                    fieldErrors.referenceNumber,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <Field
                            label="Reference ID"
                            name="referenceId"
                            hint="Optional UUID linking this entry to another record."
                            error={fieldErrors.referenceId}
                        >
                            <Input
                                id="referenceId"
                                name="referenceId"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                aria-invalid={Boolean(
                                    fieldErrors.referenceId,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <Field
                            label="Reason"
                            name="reason"
                            error={fieldErrors.reason}
                        >
                            <Input
                                id="reason"
                                name="reason"
                                placeholder="Cycle count correction"
                                aria-invalid={Boolean(
                                    fieldErrors.reason,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <div className="rounded-xl border border-border bg-transparent p-4 md:col-span-2 sm:p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                    <PackageOpen className="size-5" />
                                </span>
                                <div>
                                    <h3 className="font-semibold text-foreground">
                                        Batch details
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Optional. Use these fields when stock
                                        is tracked by lot or expiration date.
                                        No JSON is required.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <Field
                                    label="Batch / lot number"
                                    name="batchLot"
                                    hint="For example, LOT-01."
                                >
                                    <Input
                                        id="batchLot"
                                        name="batchLot"
                                        placeholder="LOT-01"
                                        className={
                                            inventoryControlClassName
                                        }
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
                                        className={
                                            inventoryControlClassName
                                        }
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
                                        className={
                                            inventoryControlClassName
                                        }
                                    />
                                </Field>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <div className="flex flex-row items-center justify-end gap-2.5 sm:gap-3">
                <Button
                    variant="outline"
                    render={<Link href="/inventory/stock" />}
                    nativeButton={false}
                    className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-xl flex-1 sm:flex-initial"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={createState.isLoading || items.length === 0}
                    className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm rounded-xl flex-1 sm:flex-initial"
                >
                    {createState.isLoading ? (
                        <LoaderCircle className="size-4 animate-spin shrink-0" />
                    ) : null}
                    <span>Save adjustment</span>
                </Button>
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
