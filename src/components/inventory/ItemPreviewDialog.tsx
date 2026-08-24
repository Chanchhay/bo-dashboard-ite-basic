"use client";

import { useMoney } from "@/hooks/useMoney";

import { useState } from "react";
import {
    Check,
    ChevronLeft,
    ImageOff,
    Minus,
    Plus,
    ShoppingBag,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { attributeIcon } from "@/lib/api/attribute-icons";
import {
    type DescriptionBlockType,
    type InventoryItem,
    type StoredItemAttributePlacement,
    type StoredItemAttributeType,
    type StoredItemType,
    type itemStatuses,
} from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

export type PreviewColor = {
    value: string;
    colorHex?: string;
    imageUrl?: string;
};

export type PreviewValue = {
    value: string;
    label?: string;
    available?: boolean;
};

export type PreviewAttribute = {
    name: string;
    type: StoredItemAttributeType;
    placement: StoredItemAttributePlacement;
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
    price?: number;
    compareAtPrice?: number;
    sku: string;
    categoryName: string;
    unitName: string;
    itemType: StoredItemType;
    status: (typeof itemStatuses)[number];
    attributes: PreviewAttribute[];
    colors: PreviewColor[];
    descriptionBlocks: PreviewBlock[];
    variants: {
        name: string;
        price?: number;
        available?: boolean;
        imageUrl?: string;
        colorValues?: string[];
    }[];
    packs: PreviewPack[];
};

export type PreviewPack = {
    unitName: string;
    factor: number;
    price?: number;
    variantName?: string;
};

function foldSizes(variants: NonNullable<InventoryItem["variants"]>) {
    type Folded = NonNullable<InventoryItem["variants"]>[number] & {
        colorValues: string[];
    };

    const rows: Folded[] = [];
    const bySize = new Map<string, Folded>();

    for (const variant of variants) {
        const size = (variant.optionName || variant.name || "").trim();
        const colour = (variant.colorValue || "").trim();
        const held = bySize.get(size.toLowerCase());

        if (held) {
            if (colour && !held.colorValues.includes(colour)) {
                held.colorValues.push(colour);
            }
            continue;
        }

        const row = {
            ...variant,
            name: size,
            colorValues: colour ? [colour] : [],
        };

        bySize.set(size.toLowerCase(), row);
        rows.push(row);
    }

    return rows;
}

export function toPreviewItem(item: InventoryItem): PreviewItem {
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
        price: item.price ?? undefined,
        compareAtPrice: item.compareAtPrice ?? undefined,
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
                available: value.available,
            })),
        })),
        descriptionBlocks: toBlocks(item.descriptionBlocks || []),
        colors: (item.colors || []).map((color) => ({
            value: color.value || "",
            colorHex: color.colorHex || undefined,
            imageUrl: color.imageUrl || undefined,
        })),
        variants: foldSizes(item.variants || []).map((variant) => ({
            name: variant.name || "",
            price: variant.price ?? undefined,
            available: variant.available,
            imageUrl: variant.imageUrl || undefined,
            colorValues: variant.colorValues,
        })),
        packs: (item.uomConversions || [])
            .filter((conversion) => conversion.unit?.name)
            .map((conversion) => ({
                unitName: conversion.unit?.name || "Pack",
                factor: conversion.factor ?? 1,
                price: conversion.price ?? undefined,
                variantName: conversion.variantName || undefined,
            })),
    };
}

export function ItemPreviewDialog({
    open,
    onOpenChange,
    item,
    hideAddToCart = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PreviewItem | null;
    hideAddToCart?: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl overflow-hidden bg-[#f7f8f7] dark:bg-[#121620] p-0">
                {item ? (
                    <Storefront
                        item={item}
                        onClose={() => onOpenChange(false)}
                        hideAddToCart={hideAddToCart}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function displayOf(value: PreviewValue) {
    return value.label || value.value;
}

function PackPrice({ price }: { price?: number }) {
    const { format: formatMoney } = useMoney();

    return (
        <span className="mt-0.5 block text-xs text-[#7b857a] dark:text-[#94a3b8]">
            {formatMoney(price, undefined, { fallback: "Price not set" })}
        </span>
    );
}

function Storefront({
    item,
    onClose,
    hideAddToCart = false,
}: {
    item: PreviewItem;
    onClose: () => void;
    hideAddToCart?: boolean;
}) {
    const { format: formatMoney } = useMoney();
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
    const [colorValue, setColorValue] = useState<string | null>(null);
    const [packIndex, setPackIndex] = useState(-1);
    const [quantity, setQuantity] = useState(1);

    const variant = item.variants[variantIndex];

    const colorsOnOffer = (variant?.colorValues || [])
        .map((value) => item.colors.find((color) => color.value === value))
        .filter((color): color is PreviewColor => Boolean(color));

    const pickedColor =
        colorsOnOffer.find((color) => color.value === colorValue) ??
        colorsOnOffer[0];

    const packs = item.packs.filter((pack) =>
        variant?.name
            ? pack.variantName?.trim().toLowerCase() ===
              variant.name.trim().toLowerCase()
            : !pack.variantName,
    );
    const pack = packs[packIndex];
    const unitWord = item.unitName.trim().toLowerCase() || "unit";
    const singleLabel = variant?.name
        ? `One ${variant.name}`
        : `One ${unitWord}`;

    const galleryImages = (() => {
        const gallery: string[] = [];
        const push = (url?: string) => {
            if (url && !gallery.includes(url)) gallery.push(url);
        };

        item.images.forEach(push);
        item.colors.forEach((color) => push(color.imageUrl));
        item.variants.forEach((option) => push(option.imageUrl));

        return gallery;
    })();

    const chosenImage = pickedColor?.imageUrl ?? variant?.imageUrl;

    const shownIndex = (() => {
        if (!chosenImage) return imageIndex;
        const position = galleryImages.indexOf(chosenImage);
        return position >= 0 ? position : imageIndex;
    })();
    const singlePrice =
        variant?.price === undefined ? item.price : variant.price;
    const activePrice = pack ? pack.price : singlePrice;
    const compareAt = item.compareAtPrice;
    const discount =
        compareAt && activePrice !== undefined && compareAt > activePrice
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
                    images={galleryImages}
                    name={item.name}
                    index={shownIndex}
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
                        <span
                            className={
                                activePrice === undefined
                                    ? "text-base font-semibold text-[#657064] dark:text-[#94a3b8]"
                                    : "text-2xl font-bold text-danger"
                            }
                        >
                            {formatMoney(activePrice, undefined, {
                                fallback: "Price not set",
                            })}
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
                        {pack ? (
                            <span className="text-sm text-[#657064] dark:text-[#94a3b8]">
                                per {pack.unitName}
                            </span>
                        ) : item.unitName ? (
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
                        <OptionRow label="Option" value={variant?.name || "—"}>
                            {item.variants.map((option, index) => (
                                <Chip
                                    key={`${option.name}-${index}`}
                                    active={index === variantIndex}
                                    disabled={option.available === false}
                                    onClick={() => {
                                        setVariantIndex(index);
                                        setPackIndex(-1);
                                    }}
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

                    {colorsOnOffer.length ? (
                        <OptionRow
                            label="Color"
                            value={pickedColor?.value || "—"}
                        >
                            {colorsOnOffer.map((color) => (
                                <Swatch
                                    key={color.value}
                                    name={color.value}
                                    colorHex={color.colorHex}
                                    active={pickedColor?.value === color.value}
                                    onClick={() => setColorValue(color.value)}
                                />
                            ))}
                        </OptionRow>
                    ) : null}

                    {packs.length ? (
                        <OptionRow
                            label="Sold as"
                            value={pack ? pack.unitName : singleLabel}
                        >
                            <Chip
                                active={!pack}
                                onClick={() => setPackIndex(-1)}
                            >
                                <span>{singleLabel}</span>
                                <PackPrice price={singlePrice} />
                            </Chip>
                            {packs.map((row, index) => (
                                <Chip
                                    key={`${row.unitName}-${index}`}
                                    active={index === packIndex}
                                    onClick={() => setPackIndex(index)}
                                >
                                    <span>{row.unitName}</span>
                                    <span className="mt-0.5 block text-xs text-[#7b857a] dark:text-[#94a3b8]">
                                        Holds {formatAmount(row.factor)}{" "}
                                        {unitWord}
                                        {row.factor === 1 ? "" : "s"}
                                    </span>
                                    <PackPrice price={row.price} />
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
                                {attribute.values.map((value) => (
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
                                ))}
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
                            <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#dfe3dd] dark:bg-[#2e3748] transition-colors peer-checked:bg-primary peer-checked:[&>span]:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                                <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white dark:bg-[#f8fafc] shadow transition-transform" />
                            </span>
                        </label>
                    ))}

                    {!hideAddToCart && (
                        <>
                            <div className="flex items-center gap-3 self-start rounded-full border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] px-3 py-1.5 text-[#1a222b] dark:text-[#f8fafc]">
                                <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() =>
                                        setQuantity((current) =>
                                            Math.max(1, current - 1),
                                        )
                                    }
                                    className="text-danger"
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
                        </>
                    )}

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
            <div className="flex aspect-square items-center justify-center rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] text-center shadow-xs">
                <div className="flex flex-col items-center gap-2 text-[#a3aca1] dark:text-[#64748b]">
                    <ImageOff className="size-8" />
                    <p className="text-sm font-medium">No image available</p>
                </div>
            </div>
        );
    }

    const active = images[Math.min(index, images.length - 1)];

    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-row sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-w-full shrink-0">
                {images.map((image, position) => (
                    <button
                        key={`${image}-${position}`}
                        type="button"
                        aria-label={`Show image ${position + 1}`}
                        aria-pressed={position === index}
                        onClick={() => onSelect(position)}
                        className={cn(
                            "relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer",
                            position === index
                                ? "border-gray-900 dark:border-white shadow-xs scale-[1.02]"
                                : "border-transparent dark:border-[#242937] hover:border-gray-400 opacity-70 hover:opacity-100",
                        )}
                    >
                        <img
                            src={image}
                            alt=""
                            className="size-full object-cover"
                        />
                    </button>
                ))}
            </div>
            <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-[#f8faf8] dark:bg-[#151821] shadow-xs">
                <img
                    src={active}
                    alt={name || "Item image"}
                    className="size-full object-cover transition-all duration-300"
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
                      ? "border-gray-900 dark:border-white bg-gray-100 dark:bg-[#252a38] font-bold text-gray-900 dark:text-white"
                      : "border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] text-[#1a222b] dark:text-[#f8fafc] hover:border-[#cfd6cc] dark:hover:border-[#384252]",
            )}
        >
            {children}
        </button>
    );
}

function Swatch({
    name,
    colorHex,
    active,
    disabled,
    onClick,
}: {
    name: string;
    colorHex?: string;
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={name}
            title={name}
            className={cn(
                "grid size-9 place-items-center rounded-full border-2 transition-colors",
                active ? "border-gray-900 dark:border-white" : "border-transparent",
                disabled && "cursor-not-allowed opacity-40",
            )}
        >
            <span
                className="size-7 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: colorHex || "#d9d9d9" }}
            />
        </button>
    );
}
