"use client";

import { useState } from "react";
import { Check, LoaderCircle, PlusCircle } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type { AddOn } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import {
    useGetAddOnsQuery,
    useUpdateAddOnMutation,
} from "@/services/inventoryApi";
import { cn } from "@/lib/utils";

function toAmount(draft: string | undefined, saved: number | null | undefined) {
    if (draft === undefined) return saved ?? undefined;

    const typed = draft.trim();

    if (typed === "") return undefined;

    const amount = Number(typed);

    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : undefined;
}

function AddOnRow({ addOn }: { addOn: AddOn }) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [save, saveState] = useUpdateAddOnMutation();
    const [draft, setDraft] = useState<string | undefined>(undefined);

    const value =
        draft !== undefined
            ? draft
            : addOn.price == null
              ? ""
              : String(addOn.price);
    const edited =
        draft !== undefined &&
        toAmount(draft, addOn.price) !== (addOn.price ?? undefined);

    async function handleSave() {
        const price = toAmount(draft, addOn.price);

        try {
            // The update applies each field it is given and the rest of the
            // add-on is not this screen's to change, so everything else goes
            // back exactly as it came.
            await save({
                addOnId: addOn.id,
                body: {
                    name: addOn.name || "",
                    // Required by the schema; an add-on always has one.
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

            setDraft(undefined);
            toast({
                tone: "success",
                title: `${addOn.name || "Add-on"} priced`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Price not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save that price.",
                ),
            });
        }
    }

    const unitLabel = addOn.baseUnit?.symbol || addOn.baseUnit?.name || "";

    return (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                    {addOn.name || "Unnamed add-on"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {addOn.price == null
                        ? "Not priced — cannot be sold yet"
                        : `Saved at ${format(addOn.price)}`}
                    {addOn.usePerOrder
                        ? ` · Uses ${formatAmount(addOn.usePerOrder)} ${unitLabel} per order`
                        : ""}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                <div className="relative flex max-w-[150px] items-center">
                    <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground">
                        $
                    </span>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={value}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Not priced"
                        aria-label={`${addOn.name} price`}
                        className={cn(
                            controlClassName,
                            "h-9 pr-2 pl-6 text-sm font-semibold",
                        )}
                    />
                </div>

                <Button
                    type="button"
                    size="sm"
                    variant={edited ? "default" : "outline"}
                    disabled={!edited || saveState.isLoading}
                    onClick={handleSave}
                    className="gap-2"
                >
                    {saveState.isLoading ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <Check className="size-4" />
                    )}
                    Save
                </Button>
            </div>
        </li>
    );
}

/**
 * What each add-on costs, across the whole business.
 *
 * One price per add-on rather than one per item: "Extra shot" costs the same
 * wherever it is offered, which is the standard a shop advertises. It lives in
 * the library beside the add-on itself, so pricing it once prices it on every
 * item that offers it.
 */
export function AddOnPricing() {
    const addOnsQuery = useGetAddOnsQuery();

    if (addOnsQuery.isLoading) {
        return <InventoryLoading label="Loading add-on prices" />;
    }

    if (addOnsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    addOnsQuery.error,
                    "Unable to load add-ons to price.",
                )}
                retry={addOnsQuery.refetch}
            />
        );
    }

    const addOns = addOnsQuery.data || [];

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-3 border-b border-border p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <PlusCircle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">
                        Add-ons
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        Priced once for the whole business — the same extra
                        costs the same on every item that offers it.
                    </p>
                </div>
            </div>

            {addOns.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                    No add-ons yet. Create one in Inventory → Item config →
                    Add-ons.
                </p>
            ) : (
                <ul className="divide-y divide-border/60 px-4">
                    {addOns.map((addOn) => (
                        <AddOnRow key={addOn.id} addOn={addOn} />
                    ))}
                </ul>
            )}
        </section>
    );
}
