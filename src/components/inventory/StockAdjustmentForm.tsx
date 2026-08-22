"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
    ArrowLeft,
    Boxes,
    Calculator,
    Check,
    LoaderCircle,
    Minus,
    ChevronRight,
    PackageOpen,
    Plus,
    ScanBarcode,
    SlidersHorizontal,
    Tag,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { BarcodeScannerOverlay } from "@/components/inventory/BarcodeScannerOverlay";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
    stockEntrySchema,
    stockEntryTypeLabels,
    type InventoryItem,
    type StockEntry,
} from "@/lib/api/inventory";
import {
    useCreateStockEntryMutation,
    useGetAddOnsQuery,
    useGetCurrentStockQuery,
    useGetInventoryItemOptionsQuery,
    useGetStockEntriesQuery,
} from "@/services/inventoryApi";
import { useMoney } from "@/hooks/useMoney";

/**
 * The "no linked record" choice. A sentinel rather than an empty string, which
 * the select would read as nothing chosen and answer with its placeholder.
 */
const noRecordValue = "NONE";

/** Same trick for "no particular option" — see {@link noRecordValue}. */
const noOptionValue = "WHOLE_ITEM";

/**
 * What the API stores, and therefore what may be sent: quantities carry three
 * decimal places, costs two. Anything longer is rejected outright, so values
 * are rounded here rather than bounced back from the server.
 */
const quantityDecimals = 3;
const unitCostDecimals = 2;

function roundTo(value: number, decimals: number) {
    return Number(value.toFixed(decimals));
}

const entryDateFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
});

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
    /** Movements against an add-on arrive here the same way an item's do. */
    const paramAddOnId = searchParams?.get("addOnId") || "";
    /** Set when the form was opened from a movement's Adjust button. */
    const paramEntryId = searchParams?.get("entryId") || "";
    const { toast } = useToast();
    const { format: formatMoney } = useMoney();
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const stockQuery = useGetCurrentStockQuery();
    const entriesQuery = useGetStockEntriesQuery();
    const [createEntry, createState] =
        useCreateStockEntryMutation();
    const addOnsQuery = useGetAddOnsQuery();
    const [adjustmentType, setAdjustmentType] = useState<"OVERSTATED" | "UNDERSTATED" | "MANUAL">("OVERSTATED");
    const [quantityInput, setQuantityInput] = useState("");
    const [unitCostInput, setUnitPriceInput] = useState("");
    const [batchLot, setBatchLot] = useState("");
    const [batchManufacturedAt, setBatchManufacturedAt] = useState("");
    const [batchExpiresAt, setBatchExpiresAt] = useState("");
    const [overrideQuantity, setOverrideQuantity] = useState(true);
    const [overrideUnitCost, setOverrideUnitCost] = useState(false);
    const [overrideBatchLot, setOverrideBatchLot] = useState(false);
    const [overrideBatchMfg, setOverrideBatchMfg] = useState(false);
    const [overrideBatchExp, setOverrideBatchExp] = useState(false);
    const [batchReceivedAt, setBatchReceivedAt] = useState("");
    const [overrideBatchReceived, setOverrideBatchReceived] = useState(false);
    /**
     * Whether the batch section is showing.
     *
     * Held here rather than left to the browser so a validation error can open
     * it: an error on a field nobody can see is a form that will not submit
     * and will not say why.
     */
    const [batchOpen, setBatchOpen] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    // Add-ons are counted like items, so a count can be corrected on either.
    const [target, setTarget] = useState<StockTargetRef | null>(
        paramItemId
            ? { kind: "ITEM", id: paramItemId }
            : paramAddOnId
              ? { kind: "ADDON", id: paramAddOnId }
              : null,
    );
    const selectedItemId = target?.kind === "ITEM" ? target.id : "";
    const selectedAddOnId = target?.kind === "ADDON" ? target.id : "";
    /**
     * The stock in or stock out this correction is made against.
     *
     * Empty means the adjustment stands alone — a plain count correction with
     * no earlier record to blame. Anything else is written to `referenceId`, so
     * the movements ledger can say what the adjustment acts on instead of
     * showing a bare quantity nobody can trace.
     */
    const [adjustedEntryId, setAdjustedEntryId] = useState(paramEntryId);
    /**
     * Which option this adjustment is about.
     *
     * An option holds a balance of its own, so this moves that option's count
     * rather than the item's. Left empty on an item that has options, the
     * correction lands on whatever is still held against the item as a whole.
     */
    const [optionId, setOptionId] = useState(
        searchParams?.get("variantId") || "",
    );
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

    const items = (itemsQuery.data || []).filter(
        (item) => item.trackInventory !== false,
    );
    const selectedItem = items.find((item) => item.id === selectedItemId);
    const addOns = addOnsQuery.data || [];
    const selectedAddOn = addOns.find((addOn) => addOn.id === selectedAddOnId);
    const unitLabel =
        selectedItem?.unit?.name || selectedAddOn?.baseUnit?.name || "";
    /**
     * What each item and add-on holds in total, for the picker.
     *
     * An item sold in options has one summary per option, so these are summed
     * rather than keyed straight across — keying by item id alone would keep
     * only the last option's figure and call it the item's.
     */
    const onHandByTargetId = (stockQuery.data || []).reduce<
        Record<string, number>
    >((totals, summary) => {
        const id = summary.itemId || summary.addOnId || "";
        totals[id] = (totals[id] ?? 0) + (summary.quantityOnHand ?? 0);

        return totals;
    }, {});
    const targets = toStockTargets(items, addOns, onHandByTargetId);
    /**
     * What the target being corrected currently stands at.
     *
     * An option keeps its own balance, so a correction to Large is measured
     * against Large — reading the item's total here would have the form
     * proposing changes against a number that is the sum of every option.
     */
    const onHand =
        (stockQuery.data || []).find(
            (summary) =>
                (summary.itemId || summary.addOnId) === (target?.id || "") &&
                (summary.variantId || "") === optionId,
        )?.quantityOnHand ?? 0;
    const entries = entriesQuery.data || [];

    /**
     * The records this item already has, newest first — what an adjustment can
     * be made against. Adjustments are excluded: correcting a correction tells
     * nobody where the count actually went wrong.
     */
    const adjustableEntries = entries
        .filter(
            (entry) =>
                (entry.itemId || entry.addOnId) === (target?.id || "") &&
                // A correction acts on a movement of the same option; one
                // against Small says nothing about what Large stands at.
                (entry.variantId || "") === optionId &&
                entry.entryType !== "ADJUSTMENT",
        )
        .sort(
            (left, right) =>
                new Date(right.createdDate || 0).getTime() -
                new Date(left.createdDate || 0).getTime(),
        );

    const adjustedEntry = adjustableEntries.find(
        (entry) => entry.id === adjustedEntryId,
    );

    // Options belong to an item; an add-on has none to break down by.
    const itemOptions = (selectedItem?.variants || [])
        .filter((variant) => variant.id && variant.name?.trim())
        .map((variant) => ({
            id: variant.id || "",
            name: variant.name || "",
        }));
    const selectedOption = itemOptions.find(
        (option) => option.id === optionId,
    );
    /**
     * Whether anything is still counted against the item rather than an option.
     *
     * Only stock recorded before the item gained options sits there. It has to
     * stay correctable — otherwise the quantity is stranded, with no way to
     * move it onto an option or write it off — but nothing new may be added to
     * it, which is what the API enforces.
     */
    const unassignedOnHand =
        (stockQuery.data || []).find(
            (summary) => summary.itemId === selectedItemId && !summary.variantId,
        )?.quantityOnHand ?? 0;

    function describeEntry(entry: StockEntry) {
        const change = entry.quantityChange || 0;

        return [
            entry.entryType
                ? stockEntryTypeLabels[entry.entryType]
                : "Stock entry",
            `${change > 0 ? "+" : ""}${change} ${unitLabel}`.trim(),
            entry.createdDate
                ? entryDateFormat.format(new Date(entry.createdDate))
                : "",
            entry.referenceNumber,
        ]
            .filter(Boolean)
            .join(" · ");
    }

    /**
     * What a unit costs right now: the oldest batch still holding stock, which
     * is the one the next unit out is drawn from.
     *
     * The API works this out from the batches themselves. Reading the ledger's
     * last `unitCost` instead — as this used to — quoted whatever a recent
     * stock-out was costed at, not what the stock on the shelf is worth.
     */
    const existingUnitCost = target
        ? (stockQuery.data || []).find(
              (summary) =>
                  (summary.itemId || summary.addOnId) === target.id &&
                  (summary.variantId || "") === optionId,
          )?.unitCost
        : undefined;

    const isManual = adjustmentType === "MANUAL";
    const rawNum = Number(quantityInput);
    const parsedQty = Math.abs(rawNum);
    const quantityEditable = !isManual || overrideQuantity;
    const qtyValid =
        quantityEditable &&
        quantityInput.trim() !== "" &&
        Number.isFinite(rawNum) &&
        roundTo(rawNum, quantityDecimals) !== 0;
    // Overstated decreases stock (-), Understated increases stock (+), Manual allows direct +/- input
    const change = qtyValid
        ? roundTo(
              adjustmentType === "OVERSTATED"
                  ? -parsedQty
                  : adjustmentType === "UNDERSTATED"
                    ? parsedQty
                    : rawNum,
              quantityDecimals,
          )
        : 0;
    const resulting =
        selectedItemId &&
        quantityEditable &&
        quantityInput.trim() !== "" &&
        Number.isFinite(rawNum)
            ? roundTo(onHand + change, quantityDecimals)
            : selectedItemId
              ? onHand
              : undefined;
    // The backend refuses an entry that would take the count below zero, so the
    // form refuses it first and says so where the number was typed.
    const goesNegative = resulting !== undefined && resulting < 0;
    // Stock cannot have arrived in the future.
    const todayIso = new Date().toLocaleDateString("en-CA");
    /**
     * Whether an arrival date would actually go anywhere.
     *
     * Only an adjustment that adds stock opens a batch, and the arrival date
     * belongs to that batch. On a correction downwards, or one that leaves the
     * count alone, there is no batch being opened for it to describe — so the
     * field is offered but says why it is doing nothing.
     */
    const opensBatch = change > 0;
    /*
     * The earliest day an expiry may name: never in the past, and never
     * before the batch was made.
     *
     * A stocktake corrects what a batch is, and a batch still on the shelf
     * has not gone off yet — if it had, the correction to record is a
     * write-off, not a date. So the same floor applies here as on the way in.
     */
    const earliestExpiry =
        batchManufacturedAt && batchManufacturedAt > todayIso
            ? batchManufacturedAt
            : todayIso;

    /**
     * A correction with the count left alone: the quantity on the shelf is
     * already right and what is wrong is the cost or the batch details beside
     * it. The entry still goes to the ledger, carrying a change of zero.
     */
    const preservesQuantity = isManual && !overrideQuantity;
    const hasCostEdit =
        isManual && overrideUnitCost && unitCostInput.trim() !== "";
    const hasBatchEdit =
        isManual &&
        ((overrideBatchLot && batchLot.trim() !== "") ||
            (overrideBatchMfg && batchManufacturedAt.trim() !== "") ||
            (overrideBatchExp && batchExpiresAt.trim() !== "") ||
            (overrideBatchReceived && batchReceivedAt.trim() !== ""));
    /**
     * Preserving the quantity is only a saveable entry when something else is
     * actually being corrected — otherwise it records nothing at all.
     */
    const canSubmit = preservesQuantity
        ? hasCostEdit || hasBatchEdit
        : qtyValid && !goesNegative;

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
        setAdjustedEntryId("");
        setOptionId("");
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

        // An item sold in options is corrected through one of them. The only
        // exception is stock still held against the item itself, and there is
        // none of that here.
        if (itemOptions.length && !optionId && unassignedOnHand <= 0) {
            const message = "Choose which option this correction is for.";
            setFieldErrors({ variantId: message });
            toast({
                tone: "error",
                title: "Option not chosen",
                description: message,
            });
            return;
        }

        const formData = new FormData(event.currentTarget);

        // Real fields on the movement now rather than a free-form blob, so a
        // date corrected at stocktake is the same kind of thing as the date
        // recorded on the way in. Only what was ticked is sent; an untouched
        // field is left off rather than sent blank, which would read as
        // clearing it.
        const lotNumber =
            isManual && overrideBatchLot ? batchLot.trim() : "";
        const manufacturedAt =
            isManual && overrideBatchMfg ? batchManufacturedAt.trim() : "";
        const expiresAt =
            isManual && overrideBatchExp ? batchExpiresAt.trim() : "";
        // Only meaningful on an adjustment that adds stock, since that is the
        // only one that opens a batch for it to belong to.
        const receivedAt =
            isManual && overrideBatchReceived ? batchReceivedAt.trim() : "";
        const batchEdits = [
            lotNumber,
            manufacturedAt,
            expiresAt,
            receivedAt,
        ].filter(Boolean);

        if (manufacturedAt && expiresAt && expiresAt < manufacturedAt) {
            const message = "This batch expires before it was made.";
            setFieldErrors({ batchExpiresAt: message });
            // The offending field sits in the collapsed section on any form
            // the operator has since tidied away.
            setBatchOpen(true);
            toast({
                tone: "error",
                title: "Check the batch dates",
                description: message,
            });
            return;
        }

        const typedUnitCost =
            isManual && overrideUnitCost
                ? getOptionalFormValue(formData, "unitCost")
                : "";

        if (
            preservesQuantity &&
            typedUnitCost === "" &&
            batchEdits.length === 0
        ) {
            const message =
                "Nothing is being changed. Enter a new cost or batch detail, or tick \u201cEdit quantity\u201d to change the count.";
            setFieldErrors({ quantityChange: message });
            toast({
                tone: "error",
                title: "Nothing to adjust",
                description: message,
            });
            return;
        }

        // Every adjustment is a new entry; the API has no way to amend one
        // already written. A change of zero is only meaningful when something
        // else on the entry is being corrected, which is checked above.
        const typedQuantity = Number(quantityInput);
        if (
            !preservesQuantity &&
            (!quantityInput.trim() ||
                !Number.isFinite(typedQuantity) ||
                roundTo(typedQuantity, quantityDecimals) === 0)
        ) {
            const message = "Please enter a non-zero quantity change.";
            setFieldErrors({ quantityChange: message });
            toast({
                tone: "error",
                title: "Check the highlighted stock information",
                description: message,
            });
            return;
        }

        const calculatedChange = preservesQuantity
            ? 0
            : roundTo(
                  adjustmentType === "OVERSTATED"
                      ? -Math.abs(typedQuantity)
                      : adjustmentType === "UNDERSTATED"
                        ? Math.abs(typedQuantity)
                        : typedQuantity,
                  quantityDecimals,
              );

        if (roundTo(onHand + calculatedChange, quantityDecimals) < 0) {
            const message = `Only ${onHand} ${unitLabel} on hand — this would take stock below zero.`;
            setFieldErrors({ quantityChange: message });
            toast({
                tone: "error",
                title: "Check the highlighted stock information",
                description: message,
            });
            return;
        }

        /**
         * The cost carries forward unless it is being changed on purpose.
         *
         * The item's cost is
         * read off its newest entry, so an adjustment that
         * sends none would leave the item looking as if it cost nothing, and
         * every valuation built on it would be wrong.
         */
        const unitCost =
            typedUnitCost === "" ? existingUnitCost : Number(typedUnitCost);

        // An adjustment upward is stock appearing, so it opens a batch and a
        // cost belongs on it. An adjustment downward consumes existing batches
        // oldest first, and is costed from them — a typed cost there is refused
        // by the API rather than quietly overriding what the stock was worth.
        //
        // A correction that moves nothing sits outside both: the cost is the
        // whole point of it, and only what was typed is sent — falling back to
        // the cost already on file would record a correction to nothing.
        const sendsUnitCost = preservesQuantity
            ? typedUnitCost !== ""
            : calculatedChange > 0;

        const result = stockEntrySchema.safeParse({
            ...(target?.kind === "ADDON"
                ? { addOnId: target.id }
                : {
                      itemId: selectedItemId,
                      // The option moves its own balance now, rather than
                      // being noted in the reason where nothing could read it.
                      ...(optionId ? { variantId: optionId } : {}),
                  }),
            entryType: "ADJUSTMENT",
            quantityChange: calculatedChange,
            unitCost:
                !sendsUnitCost ||
                unitCost === undefined ||
                !Number.isFinite(unitCost)
                    ? undefined
                    : roundTo(unitCost, unitCostDecimals),
            lotNumber: lotNumber || undefined,
            manufacturedAt: manufacturedAt || undefined,
            expiresAt: expiresAt || undefined,
            receivedAt: receivedAt || undefined,
            batchData: {},
            referenceType: "ADJUSTMENT_FORM",
            referenceId: adjustedEntryId,
            referenceNumber: "",
            reason: String(formData.get("reason") || "").trim(),
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
                data-tour="stock-adjust-form"
                className="flex flex-col gap-6"
            >
            <InventoryPageHeader
                title="Adjust stock"
                description="Every change to stock is recorded as a movement, so the history stays complete."
                action={
                    <div className="flex items-center gap-2">
                        <TourButton />
                        <Button
                            variant="outline"
                            render={<Link href="/inventory/stock" />}
                            nativeButton={false}
                            className="h-10 gap-2 rounded-xl"
                        >
                            <ArrowLeft className="size-4" />
                            Back to stock
                        </Button>
                    </div>
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
                        <div data-tour="adjust-item-select">
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
                                    <StockTargetSelect
                                        targets={targets}
                                        selected={target}
                                        onSelect={(picked) => {
                                            setTarget(picked);
                                            setAdjustedEntryId("");
                                            setOptionId("");
                                            setScannedItemName(null);
                                            setFieldErrors((current) => {
                                                const next = { ...current };
                                                delete next.itemId;
                                                return next;
                                            });
                                        }}
                                        ariaInvalid={Boolean(fieldErrors.itemId)}
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
                        </div>

                        {/* Adjustment Action Dropdown */}
                        <div data-tour="adjust-action-select">
                            <Field
                                label="Adjustment Action *"
                                name="adjustmentAction"
                                hint={
                                    adjustmentType === "OVERSTATED"
                                        ? "Overstated deducts stock from current balance."
                                        : adjustmentType === "UNDERSTATED"
                                          ? "Understated adds stock to current balance."
                                          : "Manual mode allows entering positive or negative quantity change."
                                }
                            >
                                <SelectField
                                    id="adjustmentAction"
                                    name="adjustmentAction"
                                    value={adjustmentType}
                                    onValueChange={(val) =>
                                        setAdjustmentType(val as "OVERSTATED" | "UNDERSTATED" | "MANUAL")
                                    }
                                    options={[
                                        { value: "OVERSTATED", label: "Overstated" },
                                        { value: "UNDERSTATED", label: "Understated" },
                                        { value: "MANUAL", label: "Manual" },
                                    ]}
                                    className={inventoryControlClassName}
                                />
                            </Field>
                        </div>

                        {/* Which option, when the item is sold in options */}
                        {itemOptions.length ? (
                            <div className="sm:col-span-2 md:col-span-2">
                                <Field
                                    label="Option"
                                    name="variantId"
                                    hint="Each option counts its own stock, so the correction moves that option's balance."
                                    error={fieldErrors.variantId}
                                >
                                    <SelectField
                                        id="variantId"
                                        name="variantId"
                                        value={optionId || noOptionValue}
                                        onValueChange={(value) => {
                                            setOptionId(
                                                value === noOptionValue
                                                    ? ""
                                                    : value,
                                            );
                                            // Each option has its own history,
                                            // so a record chosen under the last
                                            // one no longer applies.
                                            setAdjustedEntryId("");
                                        }}
                                        options={[
                                            // Offered only where such stock
                                            // exists: nothing new may be added
                                            // to it, only corrected away.
                                            ...(unassignedOnHand > 0
                                                ? [
                                                      {
                                                          value: noOptionValue,
                                                          label: `The item as a whole (${unassignedOnHand} ${unitLabel} unassigned)`,
                                                      },
                                                  ]
                                                : []),
                                            ...itemOptions.map((option) => ({
                                                value: option.id,
                                                label: option.name,
                                            })),
                                        ]}
                                        className={inventoryControlClassName}
                                    />
                                </Field>
                            </div>
                        ) : null}

                        {/* Which record this correction is made against */}
                        <div data-tour="adjust-record-link" className="sm:col-span-2 md:col-span-2">
                            <Field
                                label="Adjust against record"
                                name="adjustedEntryId"
                                hint={
                                    !selectedItemId
                                        ? "Select an item to see the records it already has."
                                        : adjustableEntries.length === 0
                                          ? "This item has no stock in or stock out yet, so the correction stands alone."
                                          : "Pick the stock in or stock out this correction applies to. It is shown against the adjustment in the movements ledger."
                                }
                            >
                                <SelectField
                                    id="adjustedEntryId"
                                    name="adjustedEntryId"
                                    value={adjustedEntryId || noRecordValue}
                                    onValueChange={(value) =>
                                        setAdjustedEntryId(
                                            value === noRecordValue
                                                ? ""
                                                : value,
                                        )
                                    }
                                    disabled={
                                        !selectedItemId ||
                                        adjustableEntries.length === 0
                                    }
                                    options={[
                                        {
                                            value: noRecordValue,
                                            label: "Not linked — plain count correction",
                                        },
                                        ...adjustableEntries.map((entry) => ({
                                            value: entry.id,
                                            label: describeEntry(entry),
                                        })),
                                    ]}
                                    className={inventoryControlClassName}
                                />
                            </Field>
                        </div>

                        {/* Quantity Field with Manual edit checkbox */}
                        <div data-tour="adjust-quantity-input" className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="quantity" className="text-sm font-semibold text-foreground">
                                    Quantity *
                                </Label>
                                {isManual ? (
                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={overrideQuantity}
                                            onChange={(e) => setOverrideQuantity(e.target.checked)}
                                            className="size-3.5 rounded border-border text-primary"
                                        />
                                        <span>Edit quantity</span>
                                    </label>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="quantity"
                                    name="quantity"
                                    type="number"
                                    step="0.01"
                                    disabled={isManual && !overrideQuantity}
                                    value={quantityInput}
                                    onKeyDown={(e) => {
                                        if (!isManual && (e.key === "-" || e.key === "e")) {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(event) => {
                                        const val = isManual ? event.target.value : event.target.value.replace(/-/g, "");
                                        setQuantityInput(val);
                                        setFieldErrors((current) => {
                                            const next = { ...current };
                                            delete next.quantityChange;
                                            return next;
                                        });
                                    }}
                                    placeholder={isManual && !overrideQuantity ? "Unchecked (Preserved / 0 change)" : isManual ? "e.g. 10 or -5" : "e.g. 10"}
                                    aria-invalid={Boolean(
                                        fieldErrors.quantityChange,
                                    )}
                                    className={`${inventoryControlClassName} flex-1 disabled:opacity-50 disabled:bg-muted/50 disabled:cursor-not-allowed`}
                                />
                                {unitLabel ? (
                                    <span className="shrink-0 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border">
                                        {unitLabel}
                                    </span>
                                ) : null}
                            </div>
                            {fieldErrors.quantityChange ? (
                                <p className="text-xs text-danger" role="alert">
                                    {fieldErrors.quantityChange}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {preservesQuantity
                                        ? "Quantity preserved — only the cost and batch details below are corrected."
                                        : selectedItemId
                                          ? `Current stock: ${onHand} ${unitLabel} · ${
                                                adjustmentType === "OVERSTATED"
                                                    ? "Overstated (- deducts stock)"
                                                    : adjustmentType === "UNDERSTATED"
                                                      ? "Understated (+ adds stock)"
                                                      : "Manual quantity change"
                                            }`
                                        : "Enter number of units."}
                                </p>
                            )}
                            {selectedItemId && (!isManual || overrideQuantity) ? (
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
                        </div>

                        {/* Unit cost field */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="unitCost" className="text-sm font-semibold text-foreground">
                                    Unit cost ($)
                                </Label>
                                {isManual ? (
                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={overrideUnitCost}
                                            onChange={(e) => setOverrideUnitCost(e.target.checked)}
                                            className="size-3.5 rounded border-border text-primary"
                                        />
                                        <span>Edit unit cost</span>
                                    </label>
                                ) : null}
                            </div>
                            <Input
                                id="unitCost"
                                name="unitCost"
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!isManual || !overrideUnitCost}
                                value={unitCostInput}
                                onChange={(e) => setUnitPriceInput(e.target.value)}
                                placeholder={
                                    existingUnitCost === undefined
                                        ? "None recorded yet"
                                        : formatMoney(existingUnitCost)
                                }
                                aria-invalid={Boolean(fieldErrors.unitCost)}
                                className={`${inventoryControlClassName} disabled:opacity-50 disabled:bg-muted/50 disabled:cursor-not-allowed`}
                            />
                            <p className="text-xs text-muted-foreground">
                                {(resulting ?? onHand) < onHand
                                    ? "Only used when stock is found. Stock going the other way is costed from the batches it came from."
                                    : isManual && overrideUnitCost
                                      ? "Enter new unit cost for this adjustment."
                                      : existingUnitCost === undefined
                                        ? "No cost recorded for this item yet, so this adjustment records none."
                                        : `Carries forward the last cost recorded, ${formatMoney(existingUnitCost)}.`}
                            </p>
                        </div>
                        <div data-tour="adjust-reason-input" className="sm:col-span-2">
                            <Field
                                label="Reason"
                                name="reason"
                                error={fieldErrors.reason}
                            >
                                <Input
                                    id="reason"
                                    name="reason"
                                    maxLength={255}
                                    placeholder="e.g. Cycle count correction, Damaged stock, Spoilage"
                                    aria-invalid={Boolean(
                                        fieldErrors.reason,
                                    )}
                                    className={inventoryControlClassName}
                                />
                            </Field>
                        </div>

                        {/* Batch Details Card */}
                        <details
                            data-tour="adjust-batch-card"
                            open={batchOpen}
                            onToggle={(e) => setBatchOpen(e.currentTarget.open)}
                            className={cn("group sm:col-span-2 rounded-xl border border-border bg-transparent transition-opacity", !isManual && "opacity-60")}
                        >
                            <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                    <PackageOpen className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <span>Batch details</span>
                                        {!isManual ? (
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                Locked (Select Manual to edit)
                                            </span>
                                        ) : (
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                Optional
                                            </span>
                                        )}
                                    </h3>
                                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                                        {!isManual
                                            ? "Locked. Select Manual mode to enable editing."
                                            : "Correct a lot number or date read off the carton. Tick the box above any field you want to change; the rest are left alone."}
                                    </p>
                                </div>
                                <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                            </summary>

                            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
                                {/* Batch Lot Number */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="batchLot" className="text-xs font-semibold text-foreground">
                                            Batch / lot number
                                        </Label>
                                        {isManual ? (
                                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideBatchLot}
                                                    onChange={(e) => setOverrideBatchLot(e.target.checked)}
                                                    className="size-3.5 rounded border-border text-primary"
                                                />
                                                <span>Edit lot #</span>
                                            </label>
                                        ) : null}
                                    </div>
                                    <Input
                                        id="batchLot"
                                        name="batchLot"
                                        disabled={!isManual || !overrideBatchLot}
                                        value={batchLot}
                                        onChange={(e) => setBatchLot(e.target.value)}
                                        placeholder={!isManual ? "Locked" : overrideBatchLot ? "LOT-01" : "Unchanged"}
                                        className={`${inventoryControlClassName} disabled:opacity-50 disabled:bg-muted/50 disabled:cursor-not-allowed`}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        {!isManual
                                            ? "Locked"
                                            : !overrideBatchLot
                                              ? "Existing lot # kept unchanged"
                                              : "For example, LOT-01"}
                                    </p>
                                </div>

                                {/* Expiration Date */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="batchExpiresAt" className="text-xs font-semibold text-foreground">
                                            Expiration date
                                        </Label>
                                        {isManual ? (
                                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideBatchExp}
                                                    onChange={(e) => setOverrideBatchExp(e.target.checked)}
                                                    className="size-3.5 rounded border-border text-primary"
                                                />
                                                <span>Edit Exp date</span>
                                            </label>
                                        ) : null}
                                    </div>
                                    <DatePicker
                                        id="batchExpiresAt"
                                        disabled={!isManual || !overrideBatchExp}
                                        value={batchExpiresAt}
                                        min={earliestExpiry}
                                        aria-invalid={Boolean(fieldErrors.batchExpiresAt)}
                                        placeholder={!isManual || !overrideBatchExp ? "Unchanged" : "Pick a date"}
                                        onValueChange={(value) => {
                                            setBatchExpiresAt(value);
                                            setFieldErrors((current) => {
                                                const next = { ...current };
                                                delete next.batchExpiresAt;
                                                return next;
                                            });
                                        }}
                                    />
                                    <p className={cn("text-[11px]", fieldErrors.batchExpiresAt ? "text-danger" : "text-muted-foreground")}>
                                        {fieldErrors.batchExpiresAt
                                            ? fieldErrors.batchExpiresAt
                                            : !isManual
                                              ? "Locked"
                                              : !overrideBatchExp
                                                ? "Existing date kept unchanged"
                                                : "Sold before stock with no date, soonest first"}
                                    </p>
                                </div>
                                {/* Manufactured Date */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="batchManufacturedAt" className="text-xs font-semibold text-foreground">
                                            Manufactured date
                                        </Label>
                                        {isManual ? (
                                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideBatchMfg}
                                                    onChange={(e) => setOverrideBatchMfg(e.target.checked)}
                                                    className="size-3.5 rounded border-border text-primary"
                                                />
                                                <span>Edit Mfg date</span>
                                            </label>
                                        ) : null}
                                    </div>
                                    <DatePicker
                                        id="batchManufacturedAt"
                                        disabled={!isManual || !overrideBatchMfg}
                                        value={batchManufacturedAt}
                                        max={batchExpiresAt || todayIso}
                                        placeholder={!isManual || !overrideBatchMfg ? "Unchanged" : "Pick a date"}
                                        onValueChange={(value) => {
                                            setBatchManufacturedAt(value);
                                            setFieldErrors((current) => {
                                                const next = { ...current };
                                                delete next.batchExpiresAt;
                                                return next;
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        {!isManual ? "Locked" : !overrideBatchMfg ? "Existing date kept unchanged" : "Select date"}
                                    </p>
                                </div>

                                {/* Arrived On */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="batchReceivedAt" className="text-xs font-semibold text-foreground">
                                            Arrived on
                                        </Label>
                                        {isManual ? (
                                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideBatchReceived}
                                                    onChange={(e) => setOverrideBatchReceived(e.target.checked)}
                                                    className="size-3.5 rounded border-border text-primary"
                                                />
                                                <span>Edit arrival</span>
                                            </label>
                                        ) : null}
                                    </div>
                                    <DatePicker
                                        id="batchReceivedAt"
                                        disabled={!isManual || !overrideBatchReceived}
                                        value={batchReceivedAt}
                                        max={todayIso}
                                        placeholder={!isManual || !overrideBatchReceived ? "Unchanged" : "Pick a date"}
                                        onValueChange={setBatchReceivedAt}
                                    />
                                    <p className={cn("text-[11px]", isManual && overrideBatchReceived && !opensBatch ? "text-warning" : "text-muted-foreground")}>
                                        {!isManual
                                            ? "Locked"
                                            : !overrideBatchReceived
                                              ? "Existing date kept unchanged"
                                              : opensBatch
                                                ? "Where the added stock sits in the queue"
                                                : "Only applies when the count goes up — this adjustment opens no batch"}
                                    </p>
                                </div>
                            </div>
                        </details>
                    </div>
                )}
            </section>

            {/* Side Live Summary Panel */}
            <div className="flex flex-col gap-4 sticky top-6">
                <div data-tour="adjust-summary-panel" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                        <Calculator className="size-4 text-primary" />
                        <span>Movement Summary</span>
                    </h3>

                    <div className="mt-4 flex flex-col gap-3.5 text-sm">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span>Selected Item</span>
                            <span className="font-medium text-foreground truncate max-w-[160px]">
                                {selectedItem?.name ||
                                    selectedAddOn?.name ||
                                    "None"}
                            </span>
                        </div>

                        <div className="flex justify-between items-start gap-3 text-muted-foreground">
                            <span className="shrink-0">Adjusting</span>
                            <span className="text-right text-xs font-medium text-foreground">
                                {adjustedEntry
                                    ? describeEntry(adjustedEntry)
                                    : "No linked record"}
                            </span>
                        </div>

                        {itemOptions.length ? (
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Option</span>
                                <span className="font-medium text-foreground">
                                    {selectedOption?.name || "The item as a whole"}
                                </span>
                            </div>
                        ) : null}

                        <div className="flex justify-between items-center text-muted-foreground">
                            <span>Current Stock</span>
                            <span className="font-semibold text-foreground">
                                {selectedItemId ? `${onHand} ${unitLabel}` : "-"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-muted-foreground">
                            <span>Quantity Adjustment</span>
                            <span
                                className={`font-semibold ${
                                    change > 0 ? "text-emerald-600 dark:text-emerald-400" : change < 0 ? "text-rose-600 dark:text-rose-400" : ""
                                }`}
                            >
                                {qtyValid
                                    ? `${change > 0 ? "+" : ""}${change} ${unitLabel}`
                                    : preservesQuantity
                                      ? "No change"
                                      : "-"}
                            </span>
                        </div>

                        {isManual && overrideUnitCost && unitCostInput.trim() !== "" ? (
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>New Unit Cost</span>
                                <span className="font-semibold text-foreground">
                                    {formatMoney(Number(unitCostInput))}
                                </span>
                            </div>
                        ) : null}

                        <div className="border-t border-border pt-3 flex justify-between items-center">
                            <span className="font-medium text-foreground">Projected Stock</span>
                            <span
                                className={`text-base font-bold ${
                                    resulting !== undefined && resulting < 0
                                        ? "text-rose-600 dark:text-rose-400"
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
                            <p className="text-xs text-rose-600 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                                Warning: This adjustment takes stock below zero!
                            </p>
                        ) : null}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                    <Button
                        data-tour="adjust-submit-btn"
                        type="submit"
                        size="lg"
                        disabled={
                            createState.isLoading ||
                            items.length === 0 ||
                            !selectedItemId ||
                            !canSubmit
                        }
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
            <BarcodeScannerOverlay
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onItemFound={handleScannedItem}
            />
        </>
    );
}
