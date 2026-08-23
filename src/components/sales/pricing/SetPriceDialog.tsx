"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, PackageSearch } from "lucide-react";

import { getApiErrorMessage } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type {
    AddOn,
    InventoryItem,
    ItemPricingInput,
} from "@/lib/api/inventory";
import {
    addOnKey,
    draftAmount,
    PriceInput,
    soldAsKey,
    soldAsRowsOf,
    type UnitCostLookup,
    type PriceDrafts,
    type SoldAsRow,
} from "@/components/sales/pricing/sold-as";
import {
    useUpdateAddOnMutation,
    useUpdateItemPricingMutation,
} from "@/services/inventoryApi";
import { cn } from "@/lib/utils";

/**
 * Said in the shop's words, not the system's.
 *
 * A standalone item has one line and no need of a heading over it — being
 * told it is "sold by the can" above a row called "Can" is the kind of label
 * that only makes sense to whoever built the thing.
 */
const sectionTitles: Record<SoldAsRow["kind"], string> = {
    BASE: "On its own",
    OPTION: "Sizes and options",
    PACK: "Packs and cases",
};

/** A line under each heading, so the heading does not have to explain itself. */
const sectionBlurbs: Record<SoldAsRow["kind"], string> = {
    BASE: "What a customer pays for one.",
    OPTION: "A customer picks one of these. Each is priced on its own.",
    PACK: "Sold by the pack or case. Priced against what the whole pack cost.",
};

/**
 * What is left over at the typed price, as one thing to read.
 *
 * Cost and margin were two lines of small grey text, which reads as a footnote
 * to the price rather than as the reason for it. The margin is the answer the
 * shop is actually looking for, so it is the one that carries colour.
 */
function MarginCell({
    cost,
    price,
    format,
    isUntracked = false,
}: {
    cost?: number;
    price?: number;
    format: (value: number) => string;
    isUntracked?: boolean;
}) {
    if (cost === undefined) {
        if (isUntracked) {
            return (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    No stock tracking
                </span>
            );
        }
        return (
            <span className="text-xs text-muted-foreground">
                Not stocked in yet
            </span>
        );
    }

    const margin = price === undefined ? undefined : price - cost;

    return (
        <div className="flex flex-col items-start gap-1">
            <span className="text-xs text-muted-foreground">
                Cost {format(cost)}
            </span>
            {margin === undefined ? null : (
                <span
                    className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        margin < 0
                            ? "bg-danger/10 text-danger"
                            : margin === 0
                                ? "bg-muted text-muted-foreground"
                                : "bg-success/10 text-success",
                    )}
                >
                    {margin < 0
                        ? `${format(Math.abs(margin))} under cost`
                        : margin === 0
                            ? "No profit"
                            : `Keeps ${format(margin)}`}
                </span>
            )}
        </div>
    );
}

/** The column headings, said once per card rather than once per row. */
function PriceColumns({ isUntracked = false }: { isUntracked?: boolean }) {
    return (
        <div className="flex items-center gap-4 border-b border-border bg-muted/20 px-4 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span className="min-w-0 flex-1">What they buy</span>
            <span className="w-36 shrink-0">Selling price</span>
            {isUntracked ? <span className="w-32 shrink-0">Item cost</span> : null}
            <span className="hidden w-36 shrink-0 sm:block">Your margin</span>
        </div>
    );
}

/** One priced line: what it is, what it sells for, what that leaves. */
function PriceRow({
    label,
    description,
    value,
    ariaLabel,
    cost,
    costValue,
    price,
    format,
    disabled,
    disabledHint,
    isUntracked = false,
    onChange,
    onCostChange,
}: {
    label: string;
    description: string;
    value: string;
    ariaLabel: string;
    cost?: number;
    costValue?: string;
    price?: number;
    format: (value: number) => string;
    disabled?: boolean;
    disabledHint?: string;
    isUntracked?: boolean;
    onChange: (value: string) => void;
    onCostChange?: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
            <div className="min-w-40 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                </p>
            </div>

            <div className="w-36 shrink-0">
                <PriceInput
                    value={value}
                    label={ariaLabel}
                    disabled={disabled}
                    disabledHint={disabledHint}
                    onChange={onChange}
                />
            </div>

            {isUntracked ? (
                <div className="w-32 shrink-0">
                    <PriceInput
                        value={costValue ?? ""}
                        label={`${ariaLabel} cost`}
                        disabled={false}
                        onChange={onCostChange || (() => {})}
                    />
                </div>
            ) : null}

            <div className="w-36 shrink-0">
                <MarginCell cost={cost} price={price} format={format} isUntracked={isUntracked} />
            </div>
        </div>
    );
}

/**
 * One item's master prices: every way it is sold, and every extra on it.
 *
 * Two sections because they are two different things. The first is what the
 * item itself sells for — as a single, as an option, or by the pack — and each
 * is priced in its own right against what its stock cost. The second is the
 * extras, which are priced once for the whole business: the same shot costs
 * the same wherever it is added, so editing it here changes it everywhere.
 *
 * It is a form on its own rather than a card in a list because an item can
 * carry a dozen of these lines: opened one at a time, the prices being set are
 * the only prices on screen.
 */
export function SetPriceDialog({
    item,
    unitCostFor,
    addOnCosts,
    drafts,
    open,
    onOpenChange,
    onDraftChange,
}: {
    item: InventoryItem;
    /** What one base unit of a given option cost, from the batch it comes out of. */
    unitCostFor: UnitCostLookup;
    /** The same, per add-on. An add-on is stocked and costed in its own right. */
    addOnCosts: Map<string, number>;
    drafts: PriceDrafts;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDraftChange: (key: string, value: string) => void;
}) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [savePricing, pricingState] = useUpdateItemPricingMutation();
    const [saveAddOn, addOnState] = useUpdateAddOnMutation();

    const options = (item.variants || []).filter(
        (variant) => variant.id && variant.name?.trim(),
    );
    const packs = (item.uomConversions || []).filter(
        (conversion) => conversion.unit?.id,
    );
    const addOns = item.addOns || [];
    const soldAs = soldAsRowsOf(item, unitCostFor);

    /**
     * Nothing is priced before its stock cost is known.
     *
     * A selling price is set against what the stock cost — that is the whole
     * point of the cost column beside it. Until the item has been received
     * with a unit cost there is nothing to price against, and a number typed
     * here would be a guess dressed up as a decision.
     */
    const isUntracked = item.trackInventory === false;
    const canPrice = isUntracked || soldAs.some((row) => row.unitCost !== undefined);
    const blockedHint =
        "Record a stock in with a unit cost for this item before pricing it";

    const [costDrafts, setCostDrafts] = useState<Record<string, string>>(() => {
        if (typeof window === "undefined" || !item?.id) return {};
        const saved: Record<string, string> = {};
        for (const row of soldAs) {
            const val = localStorage.getItem(`untracked_cost_${item.id}_${row.key}`);
            if (val !== null) saved[row.key] = val;
        }
        return saved;
    });

    const initialCosts = useMemo(() => {
        if (typeof window === "undefined" || !item?.id) return {};
        const saved: Record<string, string> = {};
        for (const row of soldAs) {
            const val = localStorage.getItem(`untracked_cost_${item.id}_${row.key}`);
            if (val !== null) saved[row.key] = val;
        }
        return saved;
    }, [item?.id, soldAs]);

    const handleCostChange = (key: string, value: string) => {
        setCostDrafts((prev: Record<string, string>) => ({
            ...prev,
            [key]: value,
        }));
    };

    const kindCount = new Set(soldAs.map((row) => row.kind)).size;

    /** The lines grouped under their heading, in the order they are sold. */
    const sections = (["BASE", "OPTION", "PACK"] as const)
        .map((kind) => ({
            kind,
            rows: soldAs.filter((row) => row.kind === kind),
        }))
        .filter((section) => section.rows.length > 0);

    const changedRows = !canPrice
        ? []
        : soldAs.filter((row) => {
            const draft = drafts[row.key];

            return (
                draft !== undefined &&
                draftAmount(draft, row.saved) !== (row.saved ?? undefined)
            );
        });
    const changedAddOns = addOns.filter((addOn) => {
        // An add-on is costed on its own, so it is gated on its own stock.
        if (!addOnCosts.has(addOn.id)) return false;

        const draft = drafts[addOnKey(addOn.id)];

        return (
            draft !== undefined &&
            draftAmount(draft, addOn.price) !== (addOn.price ?? undefined)
        );
    });

    const changedCostRows = isUntracked
        ? soldAs.filter((row) => {
            const draft = costDrafts[row.key];
            const initial = initialCosts[row.key] ?? "";
            return draft !== undefined && draft !== initial;
        })
        : [];

    const edited = changedRows.length > 0 || changedAddOns.length > 0 || changedCostRows.length > 0;
    const saving = pricingState.isLoading || addOnState.isLoading;

    function valueFor(key: string, saved: number | null | undefined) {
        const draft = drafts[key];

        if (draft !== undefined) return draft;

        return saved == null ? "" : String(saved);
    }

    /** An add-on is shared, so its price is saved on its own record. */
    async function saveAddOnPrice(addOn: AddOn) {
        const price = draftAmount(drafts[addOnKey(addOn.id)], addOn.price);

        await saveAddOn({
            addOnId: addOn.id,
            body: {
                name: addOn.name || "",
                baseUnitId: addOn.baseUnit?.id || "",
                usePerOrder: addOn.usePerOrder ?? 1,
                ...(price === undefined ? {} : { price }),
                uomConversions: (addOn.uomConversions || [])
                    .filter((conversion) => conversion.unit?.id)
                    .map((conversion) => ({
                        unitId: conversion.unit?.id || "",
                        factor: conversion.factor ?? 1,
                    })),
                note: addOn.note || "",
            },
        }).unwrap();
    }

    async function handleSave() {
        const basePrice = draftAmount(
            drafts[soldAsKey(item.id, "BASE")],
            item.price,
        );

        const pricing: ItemPricingInput = {
            // Sent only when there is one: the API keeps what it has when a
            // field is absent, so a price can be set but not cleared here.
            ...(basePrice === undefined ? {} : { price: basePrice }),
            ...(options.length
                ? {
                    // Saving variants replaces the list, so what this screen
                    // never edits goes back exactly as it came.
                    variants: options.map((option) => ({
                        name: option.name || "",
                        sku: option.sku || "",
                        barcode: option.barcode || "",
                        // The option's own picture is one of those things:
                        // left out, pricing an item would strip every
                        // picture its options carry.
                        imageUrl: option.imageUrl || "",
                        // So is the pair it stands for: pricing an item must
                        // not turn Large/Red back into a loose "Large" and
                        // merge two shelves into one.
                        optionName: option.optionName || option.name || "",
                        colorValue: option.colorValue || "",
                        available: option.available !== false,
                        price: draftAmount(
                            drafts[soldAsKey(item.id, "OPTION", option.id)],
                            option.price,
                        ),
                    })),
                }
                : {}),
            ...(packs.length
                ? {
                    uomConversions: packs.map((conversion) => {
                        const price = draftAmount(
                            drafts[
                            soldAsKey(
                                item.id,
                                "PACK",
                                conversion.unit?.id,
                                conversion.variantId || undefined,
                            )
                            ],
                            conversion.price,
                        );

                        return {
                            unitId: conversion.unit?.id || "",
                            // Which option it is for is part of what the
                            // conversion is; sent back or it would be lost.
                            ...(conversion.variantId
                                ? { variantId: conversion.variantId }
                                : {}),
                            factor: conversion.factor ?? 1,
                            ...(price === undefined ? {} : { price }),
                        };
                    }),
                }
                : {}),
        };

        try {
            if (changedRows.length) {
                await savePricing({ itemId: item.id, pricing }).unwrap();
            }

            for (const addOn of changedAddOns) {
                await saveAddOnPrice(addOn);
            }

            if (changedCostRows.length) {
                for (const row of changedCostRows) {
                    const val = costDrafts[row.key];
                    if (val !== undefined && typeof window !== "undefined" && item?.id) {
                        localStorage.setItem(`untracked_cost_${item.id}_${row.key}`, val);
                    }
                }
            }

            toast({
                tone: "success",
                title: `${item.name || "Item"} priced`,
                ...(changedAddOns.length
                    ? {
                        description:
                            "Add-on prices apply everywhere they are offered.",
                    }
                    : {}),
            });

            // Closed on success only: a save that failed leaves the form open
            // with the typed prices still in it, ready to try again.
            onOpenChange(false);
        } catch (error) {
            toast({
                tone: "error",
                title: "Prices not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save these prices.",
                ),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl gap-4">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        {item.name || "Unnamed item"}
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                item.status === "INACTIVE"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-success/10 text-success",
                            )}
                            title="Set in Inventory — an inactive item cannot be sold on any channel"
                        >
                            {item.status === "INACTIVE"
                                ? "Unavailable"
                                : "Available"}
                        </span>
                        {item.sku ? (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                                {item.sku}
                            </span>
                        ) : null}
                    </DialogTitle>
                    <DialogDescription>
                        What this item sells for everywhere. A channel starts
                        from these prices and only overrides what it needs to.
                    </DialogDescription>
                </DialogHeader>

                {canPrice || item.trackInventory === false ? null : (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5">
                        <PackageSearch className="size-4 shrink-0 text-warning" />
                        <p className="text-xs font-medium text-foreground sm:text-sm">
                            You have not recorded what this cost you yet. Add
                            stock and enter its cost price, then you can set
                            what it sells for.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            className="ml-auto"
                            render={
                                <Link
                                    href={`/inventory/stock/in?itemId=${item.id}`}
                                />
                            }
                        >
                            Stock in
                        </Button>
                    </div>
                )}

                {/* What the item itself sells as, one card per kind. Each is a
                    different question — which size, or how big a pack — and a
                    single run of rows made the reader work out where one ended
                    and the next began. */}
                {sections.map((section) => (
                    <section
                        key={section.kind}
                        className="overflow-hidden rounded-xl border border-border"
                    >
                        {/* Only worth heading when there is more than one kind
                            of line to tell apart. A single item priced on its
                            own needs no label. */}
                        {kindCount < 2 ? null : (
                            <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                                <p className="text-sm font-semibold text-foreground">
                                    {sectionTitles[section.kind]}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {sectionBlurbs[section.kind]}
                                </p>
                            </div>
                        )}

                        <PriceColumns isUntracked={isUntracked} />

                        <div className="divide-y divide-border/60">
                            {section.rows.map((row) => {
                                const costDraft = costDrafts[row.key];
                                const effectiveCost = isUntracked
                                    ? (costDraft !== undefined && costDraft !== "" ? parseFloat(costDraft) : (row.unitCost ?? 0))
                                    : row.unitCost;

                                return (
                                    <PriceRow
                                        key={row.key}
                                        label={row.label}
                                        description={row.description}
                                        value={valueFor(row.key, row.saved)}
                                        ariaLabel={`${item.name} ${row.label} selling price`}
                                        cost={effectiveCost}
                                        costValue={costDraft ?? (row.unitCost !== undefined ? String(row.unitCost) : "")}
                                        price={draftAmount(
                                            drafts[row.key],
                                            row.saved,
                                        )}
                                        format={format}
                                        disabled={!isUntracked && row.unitCost === undefined}
                                        disabledHint={blockedHint}
                                        isUntracked={isUntracked}
                                        onChange={(next) =>
                                            onDraftChange(row.key, next)
                                        }
                                        onCostChange={(next) =>
                                            handleCostChange(row.key, next)
                                        }
                                    />
                                );
                            })}
                        </div>
                    </section>
                ))}

                {/* The extras on it. Shared, so a price here applies everywhere. */}
                {addOns.length ? (
                    <section className="overflow-hidden rounded-xl border border-border">
                        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                            <p className="text-sm font-semibold text-foreground">
                                Add ons
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                An add on is priced once for the whole business,
                                so this is what it adds on every item that
                                offers it.
                            </p>
                        </div>

                        <PriceColumns />

                        <div className="divide-y divide-border/60">
                            {addOns.map((addOn) => (
                                <PriceRow
                                    key={addOn.id}
                                    label={addOn.name || "Add on"}
                                    description={
                                        addOn.available === false
                                            ? "Not on the menu for this item right now."
                                            : `Adds to the price of every ${item.name || "item"} it goes on.`
                                    }
                                    value={valueFor(
                                        addOnKey(addOn.id),
                                        addOn.price,
                                    )}
                                    ariaLabel={`${addOn.name} selling price`}
                                    cost={addOnCosts.get(addOn.id)}
                                    price={draftAmount(
                                        drafts[addOnKey(addOn.id)],
                                        addOn.price,
                                    )}
                                    format={format}
                                    disabled={!addOnCosts.has(addOn.id)}
                                    disabledHint={`Record a stock in with a unit cost for ${addOn.name} before pricing it`}
                                    onChange={(next) =>
                                        onDraftChange(addOnKey(addOn.id), next)
                                    }
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                <DialogFooter>
                    {edited ? (
                        <span className="mr-auto text-xs font-medium text-warning">
                            Unsaved changes
                        </span>
                    ) : null}
                    <Button
                        type="button"
                        disabled={!edited || saving}
                        onClick={handleSave}
                        className="gap-2"
                    >
                        {saving ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        Save prices
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
