"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ItemImage } from "@/components/item/item-image";
import { useMoney } from "@/hooks/useMoney";
import { itemThumbnail } from "@/lib/api/inventory";
import type { ChannelItem } from "@/lib/api/sales-channels";
import { cn } from "@/lib/utils";

/** What the cashier picked, ready to be added to the order. */
export type ItemChoice = {
    variantId?: string;
    unitId?: string;
    /** Extras ticked on this line. */
    addOnIds?: string[];
    /** For the optimistic line, before the order comes back. */
    label: string;
    unitPrice: number;
};

/** The base unit is a choice like any other, and always the first one. */
const baseUnitValue = "__base";

type Choice = {
    value: string;
    label: string;
    hint?: string;
    price?: number | null;
    disabled?: boolean;
    /**
     * The option's own picture, where it has one. A cashier picking between
     * two things that look different should be able to see them, not read
     * them — which is the whole reason an option carries an image.
     */
    imageUrl?: string;
};

function ChoiceRow({
    title,
    choices,
    value,
    onChange,
}: {
    title: string;
    choices: Choice[];
    value: string;
    onChange: (value: string) => void;
}) {
    const { format } = useMoney();

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </p>
            <div className="flex flex-wrap gap-2">
                {choices.map((choice) => {
                    const selected = choice.value === value;

                    return (
                        <button
                            key={choice.value}
                            type="button"
                            disabled={choice.disabled}
                            onClick={() => onChange(choice.value)}
                            className={cn(
                                "flex min-w-[7rem] flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                                choice.disabled
                                    ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                                    : selected
                                      ? "cursor-pointer border-primary bg-primary/10 text-foreground"
                                      : "cursor-pointer border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
                            )}
                        >
                            {choice.imageUrl ? (
                                // Decorative — the label beside it names the
                                // option already.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={choice.imageUrl}
                                    alt=""
                                    className="mb-1 h-14 w-full rounded-lg object-cover"
                                />
                            ) : null}
                            <span className="text-sm font-semibold">
                                {choice.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {choice.price == null
                                    ? choice.disabled
                                        ? "Not sold this way"
                                        : "No price set"
                                    : format(choice.price)}
                                {choice.hint ? ` · ${choice.hint}` : ""}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Which option and which unit, before a line is rung up.
 *
 * An item sold in Small and Large, or by the can and by the case, cannot be
 * added with one tap: each carries its own price and takes its own amount off
 * the shelf. The till asks once, here, rather than guessing and being wrong on
 * both counts.
 */
export function ItemChoiceModal({
    channelItem,
    open,
    onOpenChange,
    onConfirm,
    stockFor,
}: {
    channelItem: ChannelItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (choice: ItemChoice) => void;
    /** On hand for an item, or one option of it, in base units. */
    stockFor: (itemId: string, variantId?: string) => number | undefined;
}) {
    const item = channelItem?.item;
    const options = (item?.variants || []).filter((variant) => variant.id);
    const allPacks = (item?.uomConversions || []).filter(
        (conversion) => conversion.unit?.id,
    );

    const [variantValue, setVariantValue] = useState(baseUnitValue);
    const [unitValue, setUnitValue] = useState(baseUnitValue);
    const [addOnIds, setAddOnIds] = useState<string[]>([]);
    const [openedFor, setOpenedFor] = useState(item?.id);

    /**
     * The extras this item sells right now.
     *
     * An add-on switched off for this item is not offered at the till at all:
     * taking it off the menu in the back office has to mean something on the
     * floor. One with no price is not sellable either.
     */
    const addOns = (item?.addOns || []).filter(
        (addOn) => addOn.available !== false && addOn.price != null,
    );

    // Each item opens on its own defaults rather than the last one's.
    if (item && openedFor !== item.id) {
        setOpenedFor(item.id);
        setVariantValue(options[0]?.id || baseUnitValue);
        setUnitValue(baseUnitValue);
        setAddOnIds([]);
    }

    const onChooseOption = (value: string) => {
        setVariantValue(value);
        // The pack it was on may not be sold in this option at all.
        setUnitValue(baseUnitValue);
    };

    if (!item) return null;

    const chosenOption = options.find((option) => option.id === variantValue);

    /**
     * The packs this option is actually sold in.
     *
     * A six-pack of Large does not mean a six-pack of Small exists — each
     * pairing is offered and priced on its own, so the till only shows what
     * the chosen option can be bought as.
     */
    const packs = allPacks.filter(
        (conversion) =>
            conversion.price != null &&
            // A larger unit belongs to one option; the till only offers the
            // ones defined for whichever option is chosen.
            (conversion.variantId || undefined) ===
                (chosenOption?.id || undefined),
    );

    const chosenPack = packs.find(
        (conversion) => conversion.unit?.id === unitValue,
    );

    /**
     * What the line will cost.
     *
     * A pack is priced in its own right — a case is not twenty-four times a
     * can — so its price wins outright when one is chosen.
     */
    const basePrice = chosenPack
        ? (chosenPack.price ?? undefined)
        : (chosenOption?.price ?? item.price ?? undefined);

    // Each extra is charged per unit of the line, so it adds to the price.
    const extras = addOns.filter((addOn) => addOnIds.includes(addOn.id));
    const extrasTotal = extras.reduce(
        (total, addOn) => total + (addOn.price ?? 0),
        0,
    );
    const price =
        basePrice === undefined ? undefined : basePrice + extrasTotal;

    const onHand = stockFor(item.id, chosenOption?.id);
    const needed = chosenPack?.factor ?? 1;
    /**
     * A service or a download has no shelf, so a missing count is not a
     * shortage. Anything else with no count has simply never been received,
     * which is a shortage of everything.
     */
    const counted = item.trackInventory !== false && item.itemType !== "SERVICE" && item.itemType !== "DIGITAL";
    const shortOfStock = counted && (onHand ?? 0) < needed;

    /**
     * What the line being rung up looks like.
     *
     * The chosen option's own picture where it has one, so the till shows the
     * black phone once Black is picked rather than whatever the item's gallery
     * happens to lead with. Otherwise the item's thumbnail, which is what the
     * card on the grid showed a moment ago.
     */
    const lineImage = chosenOption?.imageUrl || itemThumbnail(item);

    const label = [
        item.name || "Item",
        chosenOption?.name,
        chosenPack?.unit?.name,
        ...extras.map((addOn) => `+ ${addOn.name}`),
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{item.name || "Item"}</DialogTitle>
                    <DialogDescription>
                        Pick what is being sold. Each choice has its own price
                        and comes off stock differently.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 flex flex-col gap-5">
                    {options.length ? (
                        <ChoiceRow
                            title="Option"
                            value={variantValue}
                            onChange={onChooseOption}
                            choices={options.map((option) => {
                                const optionStock = stockFor(
                                    item.id,
                                    option.id,
                                );

                                return {
                                    value: option.id || "",
                                    label: option.name || "Option",
                                    price: option.price ?? item.price,
                                    ...(option.imageUrl
                                        ? { imageUrl: option.imageUrl }
                                        : {}),
                                    hint: !counted
                                        ? undefined
                                        : `${optionStock ?? 0} left`,
                                    // An option with none on hand cannot be
                                    // picked, the same as one taken off sale:
                                    // both are things the till cannot ring up.
                                    disabled:
                                        option.available === false ||
                                        (counted && (optionStock ?? 0) <= 0),
                                };
                            })}
                        />
                    ) : null}

                    {packs.length ? (
                        <ChoiceRow
                            title="Sold as"
                            value={unitValue}
                            onChange={setUnitValue}
                            choices={[
                                {
                                    value: baseUnitValue,
                                    label: item.unit?.name || "Single",
                                    price:
                                        chosenOption?.price ??
                                        item.price ??
                                        null,
                                },
                                ...packs.map((conversion) => ({
                                    value: conversion.unit?.id || "",
                                    label: conversion.unit?.name || "Pack",
                                    price: conversion.price,
                                    hint: `Holds ${conversion.factor ?? 1}`,
                                })),
                            ]}
                        />
                    ) : null}

                    {addOns.length ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Extras
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {addOns.map((addOn) => {
                                    const ticked = addOnIds.includes(addOn.id);

                                    return (
                                        <button
                                            key={addOn.id}
                                            type="button"
                                            onClick={() =>
                                                setAddOnIds((current) =>
                                                    ticked
                                                        ? current.filter(
                                                              (id) =>
                                                                  id !== addOn.id,
                                                          )
                                                        : [...current, addOn.id],
                                                )
                                            }
                                            className={cn(
                                                "flex min-w-[7rem] cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                                                ticked
                                                    ? "border-primary bg-primary/10 text-foreground"
                                                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
                                            )}
                                        >
                                            <span className="text-sm font-semibold">
                                                {addOn.name}
                                            </span>
                                            <ExtraPrice price={addOn.price} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                            {/* Decorative — the line is named right beside it. */}
                            <ItemImage
                                src={lineImage}
                                className="size-12 shrink-0 rounded-lg"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {label}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {/* "Available" rather than "on hand":
                                        where the shop has given the counter a
                                        share of the shelf, this is that share
                                        and not what is in the stockroom. */}
                                    {!counted
                                        ? "No stock to count"
                                        : onHand === undefined
                                          ? "Never received · nothing on hand"
                                          : `${onHand} available · takes ${needed}`}
                                </p>
                            </div>
                            <PriceTag price={price} />
                        </div>

                        {shortOfStock ? (
                            <p className="mt-2 text-xs font-medium text-danger">
                                {onHand === undefined || onHand <= 0
                                    ? "None of this on hand. Receive stock for it before selling it."
                                    : `Only ${onHand} on hand, and this takes ${needed}.`}
                            </p>
                        ) : null}
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={
                            price === undefined ||
                            price === null ||
                            shortOfStock
                        }
                        title={
                            price == null
                                ? "This is not priced yet — set a price in Sale Management"
                                : shortOfStock
                                  ? "There is not enough stock on hand to sell this"
                                  : undefined
                        }
                        onClick={() =>
                            onConfirm({
                                ...(chosenOption?.id
                                    ? { variantId: chosenOption.id }
                                    : {}),
                                ...(chosenPack?.unit?.id
                                    ? { unitId: chosenPack.unit.id }
                                    : {}),
                                ...(addOnIds.length ? { addOnIds } : {}),
                                label,
                                unitPrice: price ?? 0,
                            })
                        }
                    >
                        Add to order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PriceTag({ price }: { price?: number | null }) {
    const { format } = useMoney();

    return (
        <span className="shrink-0 text-lg font-semibold text-foreground tabular-nums">
            {price == null ? "Not priced" : format(price)}
        </span>
    );
}

function ExtraPrice({ price }: { price?: number | null }) {
    const { format } = useMoney();

    return (
        <span className="text-xs text-muted-foreground">
            {price == null ? "No price set" : `+ ${format(price)}`}
        </span>
    );
}
