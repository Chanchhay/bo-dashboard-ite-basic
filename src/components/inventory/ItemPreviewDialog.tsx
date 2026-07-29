"use client";

import { useState } from "react";
import {
    Check,
    ChevronLeft,
    ImageOff,
    Minus,
    Plus,
    ShoppingBag,
} from "lucide-react";

import { formatMoney } from "@/components/inventory/InventoryUi";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
    itemAttributeTypeLabels,
    type InventoryItem,
    type ItemAttributeType,
    type itemStatuses,
    type itemTypes,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export type PreviewAttribute = {
    name: string;
    type: ItemAttributeType;
    values: string[];
};

export type PreviewItem = {
    name: string;
    description: string;
    imageUrl: string;
    price: number;
    sku: string;
    categoryName: string;
    unitName: string;
    itemType: (typeof itemTypes)[number];
    status: (typeof itemStatuses)[number];
    attributes: PreviewAttribute[];
    variants: { name: string; price?: number }[];
};

/** Saved item to preview shape, for the items table. */
export function toPreviewItem(item: InventoryItem): PreviewItem {
    return {
        name: item.name || "",
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        price: item.price || 0,
        sku: item.sku || "",
        categoryName: item.itemGroup?.name || "",
        unitName: item.unit?.name || "",
        itemType: item.itemType || "PHYSICAL",
        status: item.status || "ACTIVE",
        attributes: (item.attributes || []).map((attribute) => ({
            name: attribute.name || "",
            type: attribute.type || "TEXT",
            values: attribute.values || [],
        })),
        variants: (item.variants || []).map((variant) => ({
            name: variant.name || "",
            price: variant.price,
        })),
    };
}

/**
 * How the item will read on the online store, rendered from whatever the seller
 * has filled in so far. Nothing here is fabricated: every price, option and
 * label comes from the item being edited, so an empty field shows as an empty
 * state rather than sample copy.
 */
export function ItemPreviewDialog({
    open,
    onOpenChange,
    item,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PreviewItem | null;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl overflow-hidden bg-[#f7f8f7] p-0">
                {item ? <Storefront item={item} onClose={() => onOpenChange(false)} /> : null}
            </DialogContent>
        </Dialog>
    );
}

function Storefront({
    item,
    onClose,
}: {
    item: PreviewItem;
    onClose: () => void;
}) {
    // Options a shopper can pick. Selection state starts on the first value of
    // each attribute, the way a storefront preselects a default.
    const choosable = item.attributes.filter(
        (attribute) =>
            attribute.type !== "TOGGLE" && attribute.values.length > 1,
    );
    const specs = item.attributes.filter(
        (attribute) =>
            attribute.type !== "TOGGLE" && attribute.values.length <= 1,
    );
    const toggles = item.attributes.filter(
        (attribute) => attribute.type === "TOGGLE",
    );

    const [selected, setSelected] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            choosable.map((attribute) => [attribute.name, attribute.values[0]]),
        ),
    );
    const [switched, setSwitched] = useState<Record<string, boolean>>({});
    const [variantIndex, setVariantIndex] = useState(
        item.variants.length ? 0 : -1,
    );
    const [quantity, setQuantity] = useState(1);

    const variant = item.variants[variantIndex];
    const activePrice =
        variant?.price === undefined ? item.price : variant.price;
    // Only a variant priced below the base price reads as a discount.
    const discount =
        activePrice < item.price
            ? Math.round(((item.price - activePrice) / item.price) * 100)
            : 0;

    const [summary, ...details] = item.description
        .split("\n")
        .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean);

    return (
        <div className="max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 px-6 pt-6 text-sm text-[#657064]">
                <ChevronLeft className="size-4" />
                <span>
                    Store / {item.categoryName || "product"} / detail
                </span>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-2">
                <Gallery item={item} />

                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                            {item.categoryName ||
                                item.itemType.toLowerCase()}
                            {item.status === "INACTIVE"
                                ? " · Hidden from store"
                                : ""}
                        </p>
                        <DialogTitle className="mt-2 text-2xl font-bold text-[#161d16]">
                            {item.name || "Untitled item"}
                        </DialogTitle>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-bold text-accent">
                            {formatMoney(activePrice)}
                        </span>
                        {discount ? (
                            <>
                                <span className="text-sm text-[#7b857a] line-through">
                                    {formatMoney(item.price)}
                                </span>
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                                    {discount}% OFF
                                </span>
                            </>
                        ) : null}
                        {item.unitName ? (
                            <span className="text-sm text-[#657064]">
                                per {item.unitName}
                            </span>
                        ) : null}
                    </div>

                    {summary ? (
                        <p className="text-sm leading-6 text-[#657064]">
                            {summary}
                        </p>
                    ) : (
                        <p className="text-sm text-[#a3aca1] italic">
                            No description yet — shoppers will see nothing
                            here.
                        </p>
                    )}

                    {item.variants.length ? (
                        <OptionRow
                            label="Option"
                            value={variant?.name || ""}
                        >
                            {item.variants.map((option, index) => (
                                <Chip
                                    key={`${option.name}-${index}`}
                                    active={index === variantIndex}
                                    onClick={() => setVariantIndex(index)}
                                >
                                    <span>{option.name}</span>
                                    {option.price === undefined ? null : (
                                        <span className="mt-0.5 block text-xs text-[#7b857a]">
                                            {formatMoney(option.price)}
                                        </span>
                                    )}
                                </Chip>
                            ))}
                        </OptionRow>
                    ) : null}

                    {choosable.map((attribute) => (
                        <OptionRow
                            key={attribute.name}
                            label={attribute.name}
                            value={selected[attribute.name] || ""}
                        >
                            {attribute.values.map((value) => (
                                <Chip
                                    key={value}
                                    active={
                                        selected[attribute.name] === value
                                    }
                                    onClick={() =>
                                        setSelected((current) => ({
                                            ...current,
                                            [attribute.name]: value,
                                        }))
                                    }
                                >
                                    {value}
                                </Chip>
                            ))}
                        </OptionRow>
                    ))}

                    {toggles.map((attribute) => (
                        <label
                            key={attribute.name}
                            className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#1a222b]"
                        >
                            {attribute.name}
                            <input
                                type="checkbox"
                                checked={Boolean(switched[attribute.name])}
                                onChange={(event) =>
                                    setSwitched((current) => ({
                                        ...current,
                                        [attribute.name]:
                                            event.target.checked,
                                    }))
                                }
                                className="peer sr-only"
                            />
                            {/* The knob is a descendant, not a sibling, so the
                                checked variant has to reach it explicitly. */}
                            <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#dfe3dd] transition-colors peer-checked:bg-primary peer-checked:[&>span]:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                                <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform" />
                            </span>
                        </label>
                    ))}

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5">
                            <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                    setQuantity((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                                className="text-accent"
                            >
                                <Minus className="size-4" />
                            </button>
                            <span className="min-w-6 text-center text-sm font-medium">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() =>
                                    setQuantity((current) => current + 1)
                                }
                                className="text-primary"
                            >
                                <Plus className="size-4" />
                            </button>
                        </div>
                    </div>

                    {/*
                     * Inert on purpose: this is a rendering of the storefront,
                     * not the storefront, so the button must not look clickable
                     * to whoever is reviewing the layout.
                     */}
                    <div
                        aria-disabled
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary/60 text-base font-medium text-white"
                    >
                        <ShoppingBag className="size-4" />
                        Add to Cart
                    </div>
                    <p className="text-center text-xs text-[#7b857a]">
                        Preview only — nothing here is live yet.
                    </p>

                    {specs.length || item.sku ? (
                        <dl className="mt-2 grid gap-2 border-t border-[#e4eae2] pt-4 text-sm">
                            {item.sku ? (
                                <div className="flex justify-between gap-4">
                                    <dt className="text-[#7b857a]">SKU</dt>
                                    <dd className="text-[#1a222b]">
                                        {item.sku}
                                    </dd>
                                </div>
                            ) : null}
                            {specs.map((attribute) => (
                                <div
                                    key={attribute.name}
                                    className="flex justify-between gap-4"
                                >
                                    <dt className="text-[#7b857a]">
                                        {attribute.name}
                                        <span className="ml-1 text-xs">
                                            (
                                            {
                                                itemAttributeTypeLabels[
                                                    attribute.type
                                                ]
                                            }
                                            )
                                        </span>
                                    </dt>
                                    <dd className="text-[#1a222b]">
                                        {attribute.values[0] || "—"}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}
                </div>
            </div>

            {details.length ? (
                <div className="mx-6 mb-6 rounded-2xl bg-white p-6">
                    <h3 className="inline-block border-b-2 border-secondary pb-1 text-base font-semibold text-primary">
                        Description
                    </h3>
                    <ul className="mt-4 grid gap-2">
                        {details.map((line, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-[#657064]"
                            >
                                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="sticky bottom-0 flex justify-end border-t border-[#e4eae2] bg-white px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-11 rounded-full border border-[#e8e8e8] bg-white px-6 text-sm font-medium text-[#1a222b] transition-colors hover:bg-[#f7f8f7]"
                >
                    Close preview
                </button>
            </div>
        </div>
    );
}

function Gallery({ item }: { item: PreviewItem }) {
    if (!item.imageUrl) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-white text-center">
                <div className="flex flex-col items-center gap-2 text-[#a3aca1]">
                    <ImageOff className="size-8" />
                    <p className="text-sm">No image yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-3">
            {/* One image URL per item today, so the rail holds a single thumb. */}
            <div className="flex flex-col gap-3">
                <span className="size-16 overflow-hidden rounded-xl border-2 border-primary bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={item.imageUrl}
                        alt=""
                        className="size-full object-cover"
                    />
                </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={item.imageUrl}
                    alt={item.name || "Item image"}
                    className="aspect-square w-full object-contain"
                />
            </div>
        </div>
    );
}

function OptionRow({
    label,
    value,
    children,
}: {
    label: string;
    value: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-xs text-[#657064]">
                {label}:{" "}
                <span className="font-semibold text-[#1a222b]">{value}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Chip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "rounded-lg border px-4 py-2 text-center text-sm transition-colors",
                active
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-[#e8e8e8] bg-white text-[#1a222b] hover:border-[#cfd6cc]",
            )}
        >
            {children}
        </button>
    );
}
