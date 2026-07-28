"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    LoaderCircle,
    Save,
    SlidersHorizontal,
} from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    inventoryControlClassName,
    inventoryTextareaClassName,
} from "@/components/inventory/InventoryUi";
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
import { Textarea } from "@/components/ui/textarea";
import {
    stockEntrySchema,
    stockEntryTypes,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetInventoryItemsQuery,
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
                className="text-sm font-semibold text-[#424841]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-accent" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-[#7b857a]">{hint}</p>
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

export function StockAdjustmentForm() {
    const router = useRouter();
    const itemsQuery = useGetInventoryItemsQuery();
    const [createEntry, createState] =
        useCreateStockEntryMutation();
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [status, setStatus] = useState<string | null>(null);

    if (itemsQuery.isLoading) {
        return <InventoryLoading label="Loading stock form" />;
    }

    if (itemsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error,
                    "Unable to load products for stock adjustment.",
                )}
                retry={itemsQuery.refetch}
            />
        );
    }

    const items = itemsQuery.data || [];

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);

        const formData = new FormData(event.currentTarget);
        const batchText = String(formData.get("batchData") || "").trim();
        let batchData: Record<string, unknown> = {};

        if (batchText) {
            try {
                const parsed: unknown = JSON.parse(batchText);
                if (
                    typeof parsed !== "object" ||
                    parsed === null ||
                    Array.isArray(parsed)
                ) {
                    throw new Error("Batch data must be an object.");
                }
                batchData = parsed as Record<string, unknown>;
            } catch {
                setFieldErrors({
                    batchData:
                        "Batch data must be a valid JSON object.",
                });
                setStatus("Check the highlighted stock information.");
                return;
            }
        }

        const unitCostValue = String(
            formData.get("unitCost") || "",
        ).trim();
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
            setStatus("Check the highlighted stock information.");
            return;
        }

        setFieldErrors({});

        try {
            await createEntry(result.data).unwrap();
            router.push("/inventory/stock");
        } catch (error) {
            setStatus(
                getApiErrorMessage(
                    error,
                    "Unable to create the stock entry.",
                ),
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-6"
        >
            <InventoryPageHeader
                title="Adjust stock"
                description="Record a stock entry using the backend inventory contract."
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

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
                <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <SlidersHorizontal className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-[#161d16]">
                            Stock entry information
                        </h2>
                        <p className="mt-1 text-sm text-[#657064]">
                            Required fields and optional reference metadata
                            mirror CreateStockEntryRequest.
                        </p>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-[#6d5600]">
                        Create a product before adding stock.
                    </div>
                ) : (
                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <Field
                            label="Product *"
                            name="itemId"
                            error={fieldErrors.itemId}
                        >
                            <Select name="itemId">
                                <SelectTrigger
                                    id="itemId"
                                    className={`${inventoryControlClassName} w-full`}
                                    aria-invalid={Boolean(
                                        fieldErrors.itemId,
                                    )}
                                >
                                    <SelectValue placeholder="Choose a product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {items.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name || "Unnamed product"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            label="Entry type *"
                            name="entryType"
                            error={fieldErrors.entryType}
                        >
                            <Select
                                name="entryType"
                                defaultValue="ADJUSTMENT"
                            >
                                <SelectTrigger
                                    id="entryType"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {stockEntryTypes.map((entryType) => (
                                        <SelectItem
                                            key={entryType}
                                            value={entryType}
                                        >
                                            {entryType
                                                .toLowerCase()
                                                .replaceAll("_", " ")
                                                .replace(/^\w/, (letter) =>
                                                    letter.toUpperCase(),
                                                )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            label="Quantity change *"
                            name="quantityChange"
                            hint="Use a positive number to increase stock and a negative number to decrease it."
                            error={fieldErrors.quantityChange}
                        >
                            <Input
                                id="quantityChange"
                                name="quantityChange"
                                type="number"
                                step="0.01"
                                placeholder="10 or -3"
                                aria-invalid={Boolean(
                                    fieldErrors.quantityChange,
                                )}
                                className={inventoryControlClassName}
                            />
                        </Field>
                        <Field
                            label="Unit cost"
                            name="unitCost"
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
                        <div className="md:col-span-2">
                            <Field
                                label="Batch data"
                                name="batchData"
                                hint='Optional JSON object, for example {"lot":"LOT-01","expiresAt":"2026-12-31"}.'
                                error={fieldErrors.batchData}
                            >
                                <Textarea
                                    id="batchData"
                                    name="batchData"
                                    placeholder='{"lot":"LOT-01"}'
                                    aria-invalid={Boolean(
                                        fieldErrors.batchData,
                                    )}
                                    className={`${inventoryTextareaClassName} font-mono`}
                                />
                            </Field>
                        </div>
                    </div>
                )}
            </section>

            {status ? (
                <p
                    className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent"
                    role="alert"
                >
                    {status}
                </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    variant="outline"
                    render={<Link href="/inventory/stock" />}
                    nativeButton={false}
                    className="h-11 px-6"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={createState.isLoading || items.length === 0}
                    className="h-11 gap-2 px-6"
                >
                    {createState.isLoading ? (
                        <LoaderCircle className="animate-spin" />
                    ) : (
                        <Save />
                    )}
                    Save stock entry
                </Button>
            </div>
        </form>
    );
}
