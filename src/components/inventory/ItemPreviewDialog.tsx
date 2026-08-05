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
import { attributeIcon } from "@/lib/api/attribute-icons";
import {
    type DescriptionBlockType,
    type InventoryItem,
    type ItemAttributePlacement,
    type ItemAttributeType,
    type itemStatuses,
    type itemTypes,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export type PreviewValue = {
    value: string;
    label?: string;
    colorHex?: string;
    available?: boolean;
};

export type PreviewAttribute = {
    name: string;
    type: ItemAttributeType;
    placement: ItemAttributePlacement;
    icon?: string;
    values: PreviewValue[];
};

export type PreviewBlock = {
    type: DescriptionBlockType;
    text?: string;
    items?: string[];
    url?: string;
    caption?: string;
    columns?: { blocks: PreviewBlock[] }[];
};

export type PreviewItem = {
    name: string;
    description: string;
    images: string[];
    badge: string;
    price: number;
    compareAtPrice?: number;
    sku: string;
    categoryName: string;
    unitName: string;
    itemType: (typeof itemTypes)[number];
    status: (typeof itemStatuses)[number];
    attributes: PreviewAttribute[];
    descriptionBlocks: PreviewBlock[];
    variants: { name: string; price?: number; available?: boolean }[];
};

/** Saved item to preview shape, for the items table. */
export function toPreviewItem(item: InventoryItem): PreviewItem {
    // Images arrive as records; the preview only needs their URLs, in the
    // order the server assigned.
    const gallery = [...(item.images || [])]
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((image) => image.url || "");

    const toBlocks = (
        blocks: NonNullable<InventoryItem["descriptionBlocks"]>,
    ): PreviewBlock[] =>
        blocks.map((block) => ({
            type: block.type || "PARAGRAPH",
            text: block.text,
            items: block.items,
            url: block.url,
            caption: block.caption,
            columns: (block.columns || []).map((column) => ({
                blocks: toBlocks(column.blocks || []),
            })),
        }));

    return {
        name: item.name || "",
        description: item.description || "",
        images: gallery.filter(Boolean),
        badge: item.badge || "",
        price: item.price || 0,
        compareAtPrice: item.compareAtPrice,
        sku: item.sku || "",
        categoryName: item.itemGroup?.name || "",
        unitName: item.unit?.name || "",
        itemType: item.itemType || "PHYSICAL",
        status: item.status || "ACTIVE",
        attributes: (item.attributes || []).map((attribute) => ({
            name: attribute.name || "",
            type: attribute.type || "TEXT",
            placement: attribute.placement || "OPTION",
            icon: attribute.icon,
            values: (attribute.values || []).map((value) => ({
                value: value.value || "",
                label: value.label,
                colorHex: value.colorHex,
                available: value.available,
            })),
        })),
        descriptionBlocks: toBlocks(item.descriptionBlocks || []),
        variants: (item.variants || []).map((variant) => ({
            name: variant.name || "",
            price: variant.price,
            available: variant.available,
        })),
    };
}

/**
 * How the item will read on the online store, rendered from whatever the seller
 * has filled in so far. Nothing here is fabricated: every price, option, perk
 * and spec comes from the item being edited, so an empty field shows as an
 * empty state rather than sample copy.
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
            <DialogContent className="max-w-5xl overflow-hidden bg-[#f7f8f7] dark:bg-[#121620] p-0">
                {item ? (
                    <Storefront
                        item={item}
                        onClose={() => onOpenChange(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function displayOf(value: PreviewValue) {
    return value.label || value.value;
}

function Storefront({
    item,
    onClose,
}: {
    item: PreviewItem;
    onClose: () => void;
}) {
    // `placement` decides which part of the page each attribute feeds.
    const options = item.attributes.filter(
        (attribute) =>
            attribute.placement === "OPTION" &&
            attribute.type !== "TOGGLE" &&
            attribute.values.length > 0,
    );
    const highlights = item.attributes.filter(
        (attribute) => attribute.placement === "HIGHLIGHT",
    );
    const specs = item.attributes.filter(
        (attribute) => attribute.placement === "SPECIFICATION",
    );
    const toggles = item.attributes.filter(
        (attribute) =>
            attribute.placement === "OPTION" && attribute.type === "TOGGLE",
    );

    const [imageIndex, setImageIndex] = useState(0);
    const [selected, setSelected] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            options.map((attribute) => [
                attribute.name,
                (
                    attribute.values.find(
                        (value) => value.available !== false,
                    ) || attribute.values[0]
                ).value,
            ]),
        ),
    );
    const [switched, setSwitched] = useState<Record<string, boolean>>({});
    const [variantIndex, setVariantIndex] = useState(() =>
        item.variants.findIndex((variant) => variant.available !== false),
    );
    const [quantity, setQuantity] = useState(1);

    const variant = item.variants[variantIndex];
    const activePrice =
        variant?.price === undefined ? item.price : variant.price;
    // A compare-at price above the live price is what makes it a discount.
    const compareAt = item.compareAtPrice;
    const discount =
        compareAt && compareAt > activePrice
            ? Math.round(((compareAt - activePrice) / compareAt) * 100)
            : 0;

    const hasBlocks = item.descriptionBlocks.length > 0;

    return (
        <div className="max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 px-6 pt-6 text-sm text-[#657064] dark:text-[#94a3b8]">
                <ChevronLeft className="size-4" />
                <span>
                    Store / {item.categoryName || "product"} / detail
                </span>
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-2">
                <Gallery
                    images={item.images}
                    name={item.name}
                    index={imageIndex}
                    onSelect={setImageIndex}
                />

                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                            {item.badge ||
                                item.categoryName ||
                                item.itemType.toLowerCase()}
                            {item.status === "INACTIVE"
                                ? " · Hidden from store"
                                : ""}
                        </p>
                        <DialogTitle className="mt-2 text-2xl font-bold text-[#161d16] dark:text-[#f8fafc]">
                            {item.name || "Untitled item"}
                        </DialogTitle>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-bold text-[#d14341] dark:text-[#f87171]">
                            {formatMoney(activePrice)}
                        </span>
                        {discount ? (
                            <>
                                <span className="text-sm text-[#7b857a] dark:text-[#94a3b8] line-through">
                                    {formatMoney(compareAt)}
                                </span>
                                <span className="rounded-full bg-[#d14341]/10 dark:bg-[#f87171]/20 px-2 py-0.5 text-xs font-semibold text-[#d14341] dark:text-[#f87171]">
                                    {discount}% OFF
                                </span>
                            </>
                        ) : null}
                        {item.unitName ? (
                            <span className="text-sm text-[#657064] dark:text-[#94a3b8]">
                                per {item.unitName}
                            </span>
                        ) : null}
                    </div>

                    {item.description ? (
                        <p className="text-sm leading-6 text-[#657064] dark:text-[#cbd5e1]">
                            {item.description}
                        </p>
                    ) : (
                        <p className="text-sm text-[#a3aca1] dark:text-[#94a3b8] italic">
                            No description yet — shoppers will see nothing
                            here.
                        </p>
                    )}

                    {item.variants.length ? (
                        <OptionRow
                            label="Option"
                            value={variant?.name || "—"}
                        >
                            {item.variants.map((option, index) => (
                                <Chip
                                    key={`${option.name}-${index}`}
                                    active={index === variantIndex}
                                    disabled={option.available === false}
                                    onClick={() => setVariantIndex(index)}
                                >
                                    <span>{option.name}</span>
                                    {option.price === undefined ? null : (
                                        <span className="mt-0.5 block text-xs text-[#7b857a] dark:text-[#94a3b8]">
                                            {formatMoney(option.price)}
                                        </span>
                                    )}
                                </Chip>
                            ))}
                        </OptionRow>
                    ) : null}

                    {options.map((attribute) => {
                        const chosen = attribute.values.find(
                            (value) =>
                                value.value === selected[attribute.name],
                        );

                        return (
                            <OptionRow
                                key={attribute.name}
                                label={attribute.name}
                                value={chosen ? displayOf(chosen) : "—"}
                            >
                                {attribute.values.map((value) =>
                                    attribute.type === "COLOR" ? (
                                        <Swatch
                                            key={value.value}
                                            value={value}
                                            active={
                                                selected[attribute.name] ===
                                                value.value
                                            }
                                            onClick={() =>
                                                setSelected((current) => ({
                                                    ...current,
                                                    [attribute.name]:
                                                        value.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <Chip
                                            key={value.value}
                                            active={
                                                selected[attribute.name] ===
                                                value.value
                                            }
                                            disabled={
                                                value.available === false
                                            }
                                            onClick={() =>
                                                setSelected((current) => ({
                                                    ...current,
                                                    [attribute.name]:
                                                        value.value,
                                                }))
                                            }
                                        >
                                            {displayOf(value)}
                                        </Chip>
                                    ),
                                )}
                            </OptionRow>
                        );
                    })}

                    {toggles.map((attribute) => (
                        <label
                            key={attribute.name}
                            className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#1a222b] dark:text-[#f8fafc]"
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
                            <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#dfe3dd] dark:bg-[#2e3748] transition-colors peer-checked:bg-primary peer-checked:[&>span]:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                                <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white dark:bg-[#f8fafc] shadow transition-transform" />
                            </span>
                        </label>
                    ))}

                    <div className="flex items-center gap-3 self-start rounded-full border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] px-3 py-1.5 text-[#1a222b] dark:text-[#f8fafc]">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() =>
                                setQuantity((current) =>
                                    Math.max(1, current - 1),
                                )
                            }
                            className="text-[#d14341] dark:text-[#f87171]"
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

                    {/*
                     * Inert on purpose: this is a rendering of the storefront,
                     * not the storefront, so the button must not look clickable
                     * to whoever is reviewing the layout.
                     */}
                    <div
                        aria-disabled
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-primary/20"
                    >
                        <ShoppingBag className="size-4" />
                        Add to Cart
                    </div>
                    <p className="text-center text-xs text-[#7b857a] dark:text-[#94a3b8]">
                        Preview only — nothing here is live yet.
                    </p>

                    {highlights.length ? (
                        <div className="grid gap-4 border-t border-[#e4eae2] dark:border-[#242937] pt-4 sm:grid-cols-3">
                            {highlights.map((attribute) => {
                                const Glyph = attributeIcon(attribute.icon);

                                return (
                                    <div
                                        key={attribute.name}
                                        className="flex items-start gap-2"
                                    >
                                        <Glyph className="mt-0.5 size-4 shrink-0 text-primary" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-[#1a222b] dark:text-[#f8fafc]">
                                                {attribute.name}
                                            </p>
                                            {attribute.values[0] ? (
                                                <p className="text-xs text-[#7b857a] dark:text-[#94a3b8]">
                                                    {displayOf(
                                                        attribute.values[0],
                                                    )}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}

                    {item.sku ? (
                        <p className="text-xs text-[#7b857a] dark:text-[#94a3b8]">
                            SKU {item.sku}
                        </p>
                    ) : null}
                </div>
            </div>

            {hasBlocks ? (
                <div className="mx-6 mb-6 rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-6">
                    <h3 className="mb-4 inline-block border-b-2 border-secondary pb-1 text-base font-semibold text-primary">
                        Description
                    </h3>
                    <BlockList blocks={item.descriptionBlocks} specs={specs} />
                </div>
            ) : specs.length ? (
                <div className="mx-6 mb-6 rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-6">
                    <h3 className="mb-4 inline-block border-b-2 border-secondary pb-1 text-base font-semibold text-primary">
                        Specifications
                    </h3>
                    <SpecGrid specs={specs} />
                </div>
            ) : null}

            <div className="sticky bottom-0 flex justify-end border-t border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-11 rounded-full border border-[#e8e8e8] dark:border-[#384252] bg-white dark:bg-[#1e2330] px-6 text-sm font-medium text-[#1a222b] dark:text-[#f8fafc] transition-colors hover:bg-[#f7f8f7] dark:hover:bg-[#252a38]"
                >
                    Close preview
                </button>
            </div>
        </div>
    );
}

function BlockList({
    blocks,
    specs,
}: {
    blocks: PreviewBlock[];
    specs: PreviewAttribute[];
}) {
    return (
        <div className="flex flex-col gap-4">
            {blocks.map((block, index) => (
                <Block key={index} block={block} specs={specs} />
            ))}
        </div>
    );
}

function Block({
    block,
    specs,
}: {
    block: PreviewBlock;
    specs: PreviewAttribute[];
}) {
    if (block.type === "COLUMNS") {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                {(block.columns || []).map((column, index) => (
                    <BlockList
                        key={index}
                        blocks={column.blocks}
                        specs={specs}
                    />
                ))}
            </div>
        );
    }

    if (block.type === "HEADING") {
        return (
            <h4 className="text-base font-semibold text-[#161d16] dark:text-[#f8fafc]">
                {block.text}
            </h4>
        );
    }

    if (block.type === "BULLETS") {
        return (
            <ul className="grid gap-2">
                {(block.items || []).map((line, index) => (
                    <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-[#657064] dark:text-[#cbd5e1]"
                    >
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {line}
                    </li>
                ))}
            </ul>
        );
    }

    if (block.type === "IMAGE") {
        return block.url ? (
            <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={block.url}
                    alt={block.caption || ""}
                    className="w-full rounded-xl object-cover"
                />
                {block.caption ? (
                    <figcaption className="mt-2 text-xs text-[#7b857a] dark:text-[#94a3b8]">
                        {block.caption}
                    </figcaption>
                ) : null}
            </figure>
        ) : null;
    }

    if (block.type === "SPEC_GRID") {
        return <SpecGrid specs={specs} />;
    }

    return (
        <p className="text-sm leading-6 text-[#657064] dark:text-[#cbd5e1]">{block.text}</p>
    );
}

function SpecGrid({ specs }: { specs: PreviewAttribute[] }) {
    if (!specs.length) {
        return (
            <p className="text-sm text-[#a3aca1] dark:text-[#94a3b8] italic">
                No specification attributes yet — this grid stays empty.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {specs.map((attribute) => {
                const Glyph = attributeIcon(attribute.icon);

                return (
                    <div
                        key={attribute.name}
                        className="rounded-xl border border-[#e8e8e8] dark:border-[#2a3042] bg-[#f7f8f7] dark:bg-[#1e2330] p-3 text-center"
                    >
                        <Glyph className="mx-auto size-4 text-[#657064] dark:text-[#94a3b8]" />
                        <p className="mt-2 text-xs font-semibold text-[#1a222b] dark:text-[#f8fafc]">
                            {attribute.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#7b857a] dark:text-[#94a3b8]">
                            {attribute.values[0]
                                ? displayOf(attribute.values[0])
                                : "Yes"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function Gallery({
    images,
    name,
    index,
    onSelect,
}: {
    images: string[];
    name: string;
    index: number;
    onSelect: (index: number) => void;
}) {
    if (!images.length) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] text-center">
                <div className="flex flex-col items-center gap-2 text-[#a3aca1] dark:text-[#64748b]">
                    <ImageOff className="size-8" />
                    <p className="text-sm">No image yet</p>
                </div>
            </div>
        );
    }

    const active = images[Math.min(index, images.length - 1)];

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-row sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-w-full">
                {images.map((image, position) => (
                    <button
                        key={`${image}-${position}`}
                        type="button"
                        aria-label={`Show image ${position + 1}`}
                        aria-pressed={position === index}
                        onClick={() => onSelect(position)}
                        className={cn(
                            "size-16 overflow-hidden rounded-xl border-2 bg-white dark:bg-[#1a1e29] transition-colors",
                            position === index
                                ? "border-primary"
                                : "border-transparent dark:border-[#2a3042] hover:border-[#cfd6cc] dark:hover:border-[#384252]",
                        )}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={image}
                            alt=""
                            className="size-full object-cover"
                        />
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={active}
                    alt={name || "Item image"}
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
            <p className="text-xs text-[#657064] dark:text-[#94a3b8]">
                {label}:{" "}
                <span className="font-semibold text-[#1a222b] dark:text-[#f8fafc]">{value}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Chip({
    active,
    disabled,
    onClick,
    children,
}: {
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                "rounded-lg border px-4 py-2 text-center text-sm transition-colors",
                disabled
                    ? "cursor-not-allowed border-[#f0f1ef] dark:border-[#2a3042] bg-[#fafbfa] dark:bg-[#151821] text-[#c2c8c0] dark:text-[#64748b] line-through"
                    : active
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] text-[#1a222b] dark:text-[#f8fafc] hover:border-[#cfd6cc] dark:hover:border-[#384252]",
            )}
        >
            {children}
        </button>
    );
}

function Swatch({
    value,
    active,
    onClick,
}: {
    value: PreviewValue;
    active: boolean;
    onClick: () => void;
}) {
    const disabled = value.available === false;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={value.label || value.value}
            title={value.label || value.value}
            className={cn(
                "grid size-9 place-items-center rounded-full border-2 transition-colors",
                active ? "border-primary" : "border-transparent",
                disabled && "cursor-not-allowed opacity-40",
            )}
        >
            <span
                className="size-7 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: value.colorHex || "#d9d9d9" }}
            />
        </button>
    );
}
