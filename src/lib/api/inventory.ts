import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export const itemTypes = ["DIGITAL", "PHYSICAL"] as const;

export const retiredItemTypes = ["SERVICE"] as const;

export const storedItemTypes = [...itemTypes, ...retiredItemTypes] as const;

export type ItemType = (typeof itemTypes)[number];

export type StoredItemType = (typeof storedItemTypes)[number];

export const itemTypeLabels: Record<StoredItemType, string> = {
    PHYSICAL: "Physical",
    DIGITAL: "Digital",
    
    
    
    SERVICE: "Service",
};

export const itemStatuses = ["ACTIVE", "INACTIVE"] as const;

export const itemAttributeTypes = [
    "TEXT",
    "SELECTION",
    "TOGGLE",
    "NUMBER",
] as const;

export const retiredItemAttributeTypes = ["COLOR"] as const;

export const storedItemAttributeTypes = [
    ...itemAttributeTypes,
    ...retiredItemAttributeTypes,
] as const;

export type ItemAttributeType = (typeof itemAttributeTypes)[number];

export type StoredItemAttributeType = (typeof storedItemAttributeTypes)[number];

export const itemAttributeTypeLabels: Record<StoredItemAttributeType, string> = {
    TEXT: "Text",
    SELECTION: "Selection",
    TOGGLE: "Toggle",
    NUMBER: "Number",
    
    
    COLOR: "Color",
};

export const itemAttributePlacements = [
    "OPTION",
    "HIGHLIGHT",
    "SPECIFICATION",
] as const;

export const retiredItemAttributePlacements = ["HIDDEN"] as const;

export const storedItemAttributePlacements = [
    ...itemAttributePlacements,
    ...retiredItemAttributePlacements,
] as const;

export type ItemAttributePlacement =
    (typeof itemAttributePlacements)[number];

export type StoredItemAttributePlacement =
    (typeof storedItemAttributePlacements)[number];

export const itemAttributePlacementLabels: Record<
    StoredItemAttributePlacement,
    { label: string; hint: string }
> = {
    OPTION: {
        label: "Selectable option",
        hint: "Chips or swatches shoppers pick from, above Add to Cart.",
    },
    HIGHLIGHT: {
        label: "Highlight",
        hint: "A perk tile below Add to Cart, such as Free Delivery.",
    },
    SPECIFICATION: {
        label: "Specification",
        hint: "A tile in the spec grid inside the description.",
    },
    
    HIDDEN: {
        label: "Internal only",
        hint: "Kept on the item for reporting; never shown on the store.",
    },
};

export const descriptionBlockTypes = [
    "PARAGRAPH",
    "HEADING",
    "BULLETS",
    "IMAGE",
    "SPEC_GRID",
    "COLUMNS",
] as const;

export type DescriptionBlockType = (typeof descriptionBlockTypes)[number];
export const stockEntryTypes = [
    "OPENING_STOCK",
    "STOCK_IN",
    "STOCK_OUT",
    "ADJUSTMENT",
    "SALE",
    "RETURN",
] as const;

export const unitCategories = ["MASS", "VOLUME", "COUNT"] as const;

export type UnitCategory = (typeof unitCategories)[number];

export type Unit = {
    id: string;
    name?: string;
    slug?: string;
    
    symbol?: string | null;
    category?: UnitCategory | null;
    
    system?: boolean;
    note?: string | null;
};

export type ItemUomConversion = {
    id?: string;
    unit?: Unit;
    
    variantId?: string | null;
    variantName?: string | null;
    
    factor?: number;
    
    price?: number | null;
};

export type ItemSubGroup = {
    id: string;
    name?: string;
    slug?: string;
    note?: string;
    parentId?: string;
};

export type ItemGroup = {
    id: string;
    name?: string;
    slug?: string;
    note?: string;
    subGroups?: ItemSubGroup[];
};

export type OptionPreset = {
    id: string;
    name?: string;
    type?: "SELECTION" | "COLOR";
    required?: boolean;
    values?: {
        value?: string;
        colorHex?: string | null;
    
    colorName?: string | null;
        
        imageUrl?: string | null;
    }[];
};

export type ItemAttributeValue = {
    value?: string;
    label?: string;
    
    colorHex?: string;
    available?: boolean;
};

export type ItemAttribute = {
    name?: string;
    type?: ItemAttributeType;
    placement?: ItemAttributePlacement;
    icon?: string;
    values?: ItemAttributeValue[];
};

export type DescriptionBlock = {
    type?: DescriptionBlockType;
    text?: string;
    items?: string[];
    url?: string;
    caption?: string;
    columns?: { blocks?: DescriptionBlock[] }[];
};

export type ItemImage = {
    id?: string;
    url?: string;
    position?: number;
};

export type ItemColor = {
    value?: string;
    colorHex?: string | null;
    imageUrl?: string | null;
};

export type ItemVariant = {
    id?: string;
    slug?: string;
    name?: string;
    
    sku?: string | null;
    barcode?: string | null;
    
    imageUrl?: string | null;
    
    
    optionName?: string | null;
    
    colorValue?: string | null;
    
    price?: number | null;
    available?: boolean;
};

export type AddOnUomConversion = {
    id?: string;
    unit?: Unit;
    
    factor?: number;
};

export type AddOn = {
    id: string;
    name?: string;
    slug?: string;
    baseUnit?: Unit | null;
    
    usePerOrder?: number | null;
    
    price?: number | null;
    
    available?: boolean | null;
    
    uomConversions?: AddOnUomConversion[];
    note?: string | null;
};

export const addOnSelectionRules = ["ANY", "UP_TO"] as const;

export type AddOnSelectionRule = (typeof addOnSelectionRules)[number];

export type AddOnSet = {
    id: string;
    name?: string;
    rule?: AddOnSelectionRule;
    
    maxChoices?: number | null;
    required?: boolean;
    addOns?: AddOn[];
};

export type InventoryItem = {
    id: string;
    businessId?: string;
    itemGroup?: ItemSubGroup;
    unit?: Unit;
    slug?: string;
    name?: string;
    sku?: string;
    code?: string;
    description?: string;

    /**
     * The item's own picture, as a plain link.
     *
     * Distinct from `images`, which holds files uploaded into our asset store.
     * An imported item's picture is still hosted by the shop's old system and
     * only ever arrives here.
     */
    imageUrl?: string | null;
    images?: ItemImage[];
    badge?: string;
    barcode?: string;
    price?: number | null;
    
    compareAtPrice?: number | null;
    itemType?: StoredItemType;
    trackInventory?: boolean;
    attributes?: ItemAttribute[];
    
    colors?: ItemColor[];
    descriptionBlocks?: DescriptionBlock[];
    variants?: ItemVariant[];
    addOns?: AddOn[];
    uomConversions?: ItemUomConversion[];
    lowStockDefault?: number;
    status?: (typeof itemStatuses)[number];
};

export function itemImageUrls(
    item: Pick<InventoryItem, "imageUrl" | "images" | "colors" | "variants">,
): string[] {
    const gallery: string[] = [];
    const push = (url?: string | null) => {
        if (url && !gallery.includes(url)) gallery.push(url);
    };

    /*
     * The item's own picture comes first, and it is the only one that can be a
     * plain link. Uploaded images live in `images` as keys into our asset
     * store; an imported item has never been near it, and its picture is a URL
     * on the shop's old system sitting in `imageUrl` alone. Leaving that out
     * meant an imported item with options showed pictures — those hang off the
     * options — and an imported item without them showed none at all.
     */
    push(item.imageUrl);

    [...(item.images || [])]
        .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
        .forEach((image) => push(image.url));
    (item.colors || []).forEach((color) => push(color.imageUrl));
    (item.variants || []).forEach((variant) => push(variant.imageUrl));

    return gallery;
}

export function itemThumbnail(
    item: Pick<InventoryItem, "imageUrl" | "images" | "colors" | "variants">,
): string | undefined {
    return itemImageUrls(item)[0];
}

export type InventoryPageMetadata = {
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
};

export type InventoryItemPage = {
    content?: InventoryItem[];
    page?: InventoryPageMetadata;
};

export const inventoryItemSorts = [
    "name,asc",
    "name,desc",
    "price,asc",
    "price,desc",
] as const;

export type InventoryItemSort = (typeof inventoryItemSorts)[number];

const emptyQueryValueToUndefined = (value: unknown) =>
    value === "" || value === null ? undefined : value;

const optionalQueryText = (maximum: number, message: string) =>
    z.preprocess(
        emptyQueryValueToUndefined,
        z.string().trim().max(maximum, message).optional(),
    );

const optionalQueryUuid = z.preprocess(
    emptyQueryValueToUndefined,
    z.string().trim().optional(),
);

const optionalQueryNumber = z.preprocess(
    emptyQueryValueToUndefined,
    z.coerce.number().finite().min(0, "Price cannot be negative.").optional(),
);

export const inventoryItemQuerySchema = z
    .object({
        page: z.coerce.number().int().min(0).default(0),
        size: z.coerce.number().int().min(1).max(100).default(20),
        sort: z.enum(inventoryItemSorts).default("name,asc"),
        keyword: optionalQueryText(
            200,
            "Search must be 200 characters or fewer.",
        ),
        status: z.preprocess(
            emptyQueryValueToUndefined,
            z.enum(itemStatuses).optional(),
        ),
        itemGroupId: optionalQueryUuid,
        unitId: optionalQueryUuid,
        itemType: z.preprocess(
            emptyQueryValueToUndefined,
            z.enum(storedItemTypes).optional(),
        ),
        minPrice: optionalQueryNumber,
        maxPrice: optionalQueryNumber,
        sku: optionalQueryText(100, "SKU must be 100 characters or fewer."),
        barcode: optionalQueryText(
            100,
            "Barcode must be 100 characters or fewer.",
        ),
    })
    .superRefine((query, context) => {
        if (
            query.minPrice !== undefined &&
            query.maxPrice !== undefined &&
            query.minPrice > query.maxPrice
        ) {
            context.addIssue({
                code: "custom",
                message: "Maximum price must be at least the minimum price.",
                path: ["maxPrice"],
            });
        }
    });

export type InventoryItemQuery = z.infer<typeof inventoryItemQuerySchema>;

export const manualStockEntryTypes = [
    "OPENING_STOCK",
    "STOCK_IN",
    "STOCK_OUT",
    "ADJUSTMENT",
] as const;

export const stockEntryTypeLabels: Record<
    (typeof stockEntryTypes)[number],
    string
> = {
    OPENING_STOCK: "Opening stock",
    STOCK_IN: "Stock in",
    STOCK_OUT: "Stock out",
    ADJUSTMENT: "Adjustment",
    SALE: "Sale",
    RETURN: "Return",
};

export type StockState = "OUT" | "LOW" | "IN";

export function stockState(
    quantity: number | undefined,
    threshold: number | undefined,
): StockState {
    const onHand = quantity ?? 0;

    if (onHand <= 0) return "OUT";

    return onHand <= (threshold ?? 0) ? "LOW" : "IN";
}

export const stockStateLabels: Record<StockState, string> = {
    OUT: "Out of stock",
    LOW: "Low stock",
    IN: "In stock",
};

export type StockBatch = {
    id: string;
    
    variantId?: string | null;
    variantName?: string | null;
    unitCost: number;
    quantityReceived: number;
    quantityRemaining: number;
    remainingValue: number;
    receivedAt?: string | null;
    
    lotNumber?: string | null;
    manufacturedAt?: string | null;
    
    expiresAt?: string | null;
    
    expired?: boolean;
    
    position: number;
};

export type StockConsumption = {
    batchId: string;
    lotNumber?: string | null;
    expiresAt?: string | null;
    receivedAt?: string | null;
    quantity: number;
    unitCost: number;
    
    cost: number;
};

export type StockSummary = {
    
    itemId?: string;
    addOnId?: string;
    
    variantId?: string;
    variantName?: string;
    quantityOnHand?: number;
    
    stockValue?: number;
    
    unitCost?: number;
    lastEntryId?: string;
    updatedAt?: string;
};

export type StockEntry = {
    id: string;
    businessOwnerId?: string;
    itemId?: string;
    addOnId?: string;
    
    variantId?: string;
    
    variantName?: string;
    entryType?: (typeof stockEntryTypes)[number];
    quantityChange?: number;
    quantityBefore?: number;
    quantityAfter?: number;
    
    unitCost?: number;
    
    costOfGoods?: number;
    
    unitSalePrice?: number;
    
    enteredQuantity?: number;
    enteredUnit?: Unit | null;
    
    consumedBatches?: StockConsumption[];
    
    lotNumber?: string;
    manufacturedAt?: string;
    expiresAt?: string;
    batchData?: Record<string, unknown>;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    reason?: string;
    createdBy?: string;
    createdDate?: string;
};

export function entryLotNumber(entry: StockEntry): string {
    if (entry.lotNumber) return entry.lotNumber;

    const stored = entry.batchData?.lot;

    return typeof stored === "string" ? stored : "";
}

const optionalUuidSchema = z
    .string()
    .trim()
    .refine(
        (value) => !value || z.uuid().safeParse(value).success,
        "Select a valid option.",
    );

const optionalText = (maximum: number, message: string) =>
    z.string().trim().max(maximum, message);

const optionalDate = z
    .string()
    .trim()
    .refine(
        (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Enter a date as YYYY-MM-DD.",
    );

const optionalMoney = (message: string) =>
    z
        .number()
        .min(0, message)
        .nullish()
        .transform((value) => value ?? undefined);

export const itemVariantSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Variant name is required.")
        .max(150, "Variant name must be 150 characters or fewer."),
    
    
    sku: optionalText(100, "Variant SKU must be 100 characters or fewer.")
        .default(""),
    barcode: optionalText(
        100,
        "Variant barcode must be 100 characters or fewer.",
    ).default(""),
    
    
    
    
    imageUrl: optionalText(
        500,
        "Variant image URL must be 500 characters or fewer.",
    ).nullish(),
    price: optionalMoney("Variant price cannot be negative."),
    
    
    optionName: optionalText(150, "An option name must be 150 characters or fewer.")
        .default(""),
    colorValue: optionalText(150, "A colour must be 150 characters or fewer.")
        .default(""),
    available: z.boolean(),
});

export const itemAttributeValueSchema = z.object({
    value: z
        .string()
        .trim()
        .min(1, "A value cannot be blank.")
        .max(150, "A value must be 150 characters or fewer."),
    label: z
        .string()
        .trim()
        .max(150, "A label must be 150 characters or fewer."),
    
    colorHex: z
        .string()
        .trim()
        .refine(
            (value) => !value || /^#[0-9a-fA-F]{6}$/.test(value),
            "Use a six-digit hex colour such as #3a3a3c.",
        )
        .default(""),
    available: z.boolean(),
});

export type ItemAttributeValueInput = z.infer<
    typeof itemAttributeValueSchema
>;

export const itemAttributeSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Attribute name is required.")
            .max(150, "Attribute name must be 150 characters or fewer."),
        type: z.enum(storedItemAttributeTypes),
        placement: z.enum(storedItemAttributePlacements),
        icon: z
            .string()
            .trim()
            .max(40, "An icon key must be 40 characters or fewer."),
        values: z.array(itemAttributeValueSchema),
    })
    .superRefine((attribute, ctx) => {
        const count = attribute.values.length;
        const issue = (message: string) =>
            ctx.addIssue({
                code: "custom",
                message,
                path: ["values"],
            });

        if (attribute.type === "TOGGLE") {
            if (count) {
                issue("A toggle attribute cannot carry values.");
            }
            return;
        }

        if (
            attribute.placement === "HIGHLIGHT" ||
            attribute.placement === "SPECIFICATION"
        ) {
            if (count > 1) {
                issue("A highlight or specification takes a single value.");
            }
            return;
        }

        if (
            attribute.placement === "OPTION" &&
            attribute.type === "SELECTION" &&
            !count
        ) {
            issue("Add at least one option for shoppers to choose from.");
        }

        if (
            attribute.type === "NUMBER" &&
            attribute.values.some((value) => Number.isNaN(Number(value.value)))
        ) {
            issue("Number attributes only accept numeric values.");
        }
    });

export type ItemAttributeInput = z.infer<typeof itemAttributeSchema>;

const leafBlockTypes = [
    "PARAGRAPH",
    "HEADING",
    "BULLETS",
    "IMAGE",
    "SPEC_GRID",
] as const;

const blockFields = {
    text: z
        .string()
        .trim()
        .max(2000, "Block text must be 2000 characters or fewer."),
    items: z
        .array(z.string().trim().min(1))
        .max(20, "A list can hold at most 20 bullets."),
    
    
    
    url: z
        .string()
        .trim()
        .max(2048, "An image URL must be 2048 characters or fewer."),
    caption: z
        .string()
        .trim()
        .max(150, "A caption must be 150 characters or fewer."),
};

function checkBlockContent(
    block: { type: string; text: string; items: string[]; url: string },
    ctx: z.RefinementCtx,
) {
    const require = (ok: boolean, message: string, path: string) => {
        if (!ok) {
            ctx.addIssue({ code: "custom", message, path: [path] });
        }
    };

    if (block.type === "PARAGRAPH" || block.type === "HEADING") {
        require(Boolean(block.text), "Add some text for this block.", "text");
    }

    if (block.type === "BULLETS") {
        require(
            block.items.length > 0,
            "Add at least one bullet.",
            "items",
        );
    }

    if (block.type === "IMAGE") {
        require(Boolean(block.url), "Add an image to this block.", "url");
    }
}

export const leafDescriptionBlockSchema = z
    .object({ type: z.enum(leafBlockTypes), ...blockFields })
    .superRefine(checkBlockContent);

export const descriptionBlockSchema = z
    .object({
        type: z.enum(descriptionBlockTypes),
        ...blockFields,
        columns: z
            .array(
                z.object({
                    blocks: z
                        .array(leafDescriptionBlockSchema)
                        .max(20, "A column can hold at most 20 blocks."),
                }),
            )
            .max(3, "A row can hold at most three columns."),
    })
    .superRefine((block, ctx) => {
        if (block.type === "COLUMNS") {
            if (block.columns.length < 2) {
                ctx.addIssue({
                    code: "custom",
                    message: "A row needs at least two columns.",
                    path: ["columns"],
                });
            }
            return;
        }

        checkBlockContent(block, ctx);
    });

export type DescriptionBlockInput = z.infer<typeof descriptionBlockSchema>;

export const inventoryItemSchema = z.object({
    
    
    itemGroupId: z.string().trim().min(1, "Select a category."),
    unitId: z.string().trim().min(1, "Select a base unit of measure."),
    name: z
        .string()
        .trim()
        .min(1, "Item name is required.")
        .max(200, "Item name must be 200 characters or fewer."),
    sku: optionalText(100, "SKU must be 100 characters or fewer."),
    code: optionalText(100, "Code must be 100 characters or fewer."),
    description: z.string().trim(),
    badge: optionalText(40, "A badge must be 40 characters or fewer."),
    barcode: optionalText(
        100,
        "Barcode must be 100 characters or fewer.",
    ),
    price: optionalMoney("Price cannot be negative."),
    itemType: z.enum(storedItemTypes),
    attributes: z
        .array(itemAttributeSchema)
        .refine(
            (attributes) =>
                new Set(
                    attributes.map((attribute) =>
                        attribute.name.toLowerCase(),
                    ),
                ).size === attributes.length,
            "Attribute names must be unique.",
        ),
    descriptionBlocks: z
        .array(descriptionBlockSchema)
        .max(30, "A description can hold at most 30 blocks."),
    variants: z.array(itemVariantSchema),
    colors: z
        .array(
            z.object({
                value: z
                    .string()
                    .trim()
                    .min(1, "A colour needs a name.")
                    .max(150, "A colour name must be 150 characters or fewer."),
                colorHex: z
                    .string()
                    .trim()
                    .refine(
                        (value) => !value || /^#[0-9a-fA-F]{6}$/.test(value),
                        "Use a six-digit hex colour such as #3a3a3c.",
                    ),
                imageUrl: optionalText(
                    500,
                    "An image URL must be 500 characters or fewer.",
                ),
            }),
        )
        .max(50, "An item can hold at most 50 colours.")
        .default([])
        .refine(
            (colors) =>
                new Set(colors.map((color) => color.value.toLowerCase())).size ===
                colors.length,
            "Colours must be unique.",
        ),
    addOnIds: z.array(z.string().trim().min(1, "Select a valid add-on.")).default([]),
    uomConversions: z
        .array(
            z.object({
                unitId: z.string().trim().min(1, "Select a valid unit."),
                
                variantId: z.string().trim().optional(),
                
                variantName: z.string().optional(),
                factor: z
                    .number()
                    .positive("A conversion must be greater than zero."),
                
                price: z
                    .number()
                    .min(0, "A price cannot be negative.")
                    .optional(),
            }),
        )
        .default([]),
    lowStockDefault: z
        .number()
        .int("Low-stock threshold must be a whole number.")
        .min(0, "Low-stock threshold cannot be negative."),
    trackInventory: z.boolean().default(true),
    status: z.enum(itemStatuses),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const itemVariantsSchema = z.array(itemVariantSchema);

export type ItemVariantInput = z.infer<typeof itemVariantSchema>;

export const itemPricingSchema = z.object({
    price: z.number().min(0, "Price cannot be negative.").optional(),
    variants: itemVariantsSchema.optional(),
    
    uomConversions: z
        .array(
            z.object({
                unitId: z.string().trim().min(1, "Select a valid unit."),
                variantId: z.string().trim().optional(),
                variantName: z.string().optional(),
                factor: z
                    .number()
                    .positive("A conversion must be greater than zero."),
                price: z
                    .number()
                    .min(0, "A price cannot be negative.")
                    .optional(),
            }),
        )
        .optional(),
});

export type ItemPricingInput = z.infer<typeof itemPricingSchema>;

export const itemAddOnsSchema = z.object({
    addOnIds: z.array(z.string().trim().min(1, "Select a valid add-on.")),
});

export type ItemAddOnsInput = z.infer<typeof itemAddOnsSchema>;

export const itemAddOnAvailabilitySchema = z.object({
    available: z.boolean(),
});

export type ItemAddOnAvailabilityInput = z.infer<
    typeof itemAddOnAvailabilitySchema
>;

export const itemGroupSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Category name is required.")
        .max(150, "Category name must be 150 characters or fewer."),
    note: optionalText(255, "Note must be 255 characters or fewer."),
    parentId: optionalUuidSchema,
});

export type ItemGroupInput = z.infer<typeof itemGroupSchema>;

export const unitSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Unit name is required.")
        .max(50, "Unit name must be 50 characters or fewer."),
    symbol: z
        .string()
        .trim()
        .min(1, "Symbol is required.")
        .max(20, "Symbol must be 20 characters or fewer."),
    category: z.enum(unitCategories),
    note: optionalText(255, "Note must be 255 characters or fewer."),
});

export type UnitInput = z.infer<typeof unitSchema>;

export function toUnitRequest(input: UnitInput) {
    return {
        name: input.name,
        symbol: input.symbol,
        category: input.category,
        note: input.note,
    };
}

export const optionPresetSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Preset name is required.")
        .max(150, "Preset name must be 150 characters or fewer."),
    type: z.enum(["SELECTION", "COLOR"]),
    required: z.boolean(),
    values: z
        .array(
            z.object({
                value: z
                    .string()
                    .trim()
                    .min(1, "A value cannot be blank.")
                    .max(150, "A value must be 150 characters or fewer."),
                colorHex: optionalText(
                    20,
                    "A colour must be 20 characters or fewer.",
                ),
                imageUrl: optionalText(
                    255,
                    "An image URL must be 255 characters or fewer.",
                ),
            }),
        )
        .min(1, "Add at least one value.")
        .max(50, "A preset can hold at most 50 values.")
        .refine(
            (values) =>
                new Set(values.map((entry) => entry.value.toLowerCase()))
                    .size === values.length,
            "Values must be unique.",
        ),
});

export type OptionPresetInput = z.infer<typeof optionPresetSchema>;

export function toOptionPresetRequest(input: OptionPresetInput) {
    return {
        name: input.name,
        type: input.type,
        required: input.required,
        values: input.values.map((entry) => ({
            value: entry.value,
            ...(entry.colorHex ? { colorHex: entry.colorHex } : {}),
            ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
        })),
    };
}

export const uomConversionSchema = z.object({
    unitId: z.string().trim().min(1, "Select a valid unit."),
    factor: z.number().positive("A conversion must be greater than zero."),
});

export const addOnSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Add-on name is required.")
        .max(150, "Add-on name must be 150 characters or fewer."),
    baseUnitId: optionalUuidSchema,
    usePerOrder: z
        .number()
        .positive("One order must use more than zero."),
    
    price: z.number().min(0, "A price cannot be negative.").optional(),
    uomConversions: z.array(uomConversionSchema).default([]),
    note: optionalText(255, "Note must be 255 characters or fewer."),
});

export type AddOnInput = z.infer<typeof addOnSchema>;

export function toAddOnRequest(input: AddOnInput) {
    return {
        name: input.name,
        usePerOrder: input.usePerOrder,
        ...(input.price === undefined ? {} : { price: input.price }),
        uomConversions: input.uomConversions,
        note: input.note,
        ...(input.baseUnitId ? { baseUnitId: input.baseUnitId } : {}),
    };
}

export const addOnSetSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Set name is required.")
            .max(150, "Set name must be 150 characters or fewer."),
        rule: z.enum(addOnSelectionRules),
        maxChoices: z
            .number()
            .int("A limit must be a whole number.")
            .min(1, "A limit must be at least 1.")
            .optional(),
        required: z.boolean(),
        addOnIds: z
            .array(z.string().trim().min(1, "Select a valid add-on."))
            .min(1, "Add at least one add-on."),
    })
    .refine(
        (set) => set.rule !== "UP_TO" || set.maxChoices !== undefined,
        { message: "Set how many may be picked.", path: ["maxChoices"] },
    )
    .refine(
        (set) =>
            set.rule !== "UP_TO" ||
            (set.maxChoices ?? 0) <= set.addOnIds.length,
        {
            message: "The limit cannot exceed how many add-ons are in the set.",
            path: ["maxChoices"],
        },
    );

export type AddOnSetInput = z.infer<typeof addOnSetSchema>;

export function toAddOnSetRequest(input: AddOnSetInput) {
    return {
        name: input.name,
        rule: input.rule,
        required: input.required,
        addOnIds: input.addOnIds,
        
        ...(input.rule === "UP_TO" && input.maxChoices !== undefined
            ? { maxChoices: input.maxChoices }
            : {}),
    };
}

export const stockEntrySchema = z
    .object({
    
    
    itemId: z.string().trim().optional(),
    addOnId: z.string().trim().optional(),
    
    variantId: z.string().trim().optional(),
    entryType: z.enum(stockEntryTypes),
    quantityChange: z.number(),
    
    
    unitCost: z
        .number()
        .min(0, "Unit cost cannot be negative.")
        .optional(),
    unitSalePrice: z
        .number()
        .min(0, "Sale price cannot be negative.")
        .optional(),
    
    enteredQuantity: z.number().positive().optional(),
    
    unitId: optionalUuidSchema.optional(),
    
    lotNumber: optionalText(80, "Lot number must be 80 characters or fewer.")
        .optional(),
    manufacturedAt: optionalDate.optional(),
    
    expiresAt: optionalDate.optional(),
    
    receivedAt: optionalDate.optional(),
    batchData: z.record(z.string(), z.unknown()),
    referenceType: optionalText(
        40,
        "Reference type must be 40 characters or fewer.",
    ),
    referenceId: optionalUuidSchema,
    referenceNumber: optionalText(
        80,
        "Reference number must be 80 characters or fewer.",
    ),
    reason: optionalText(255, "Reason must be 255 characters or fewer."),
    })
    .refine(
        (entry) => Boolean(entry.itemId) !== Boolean(entry.addOnId),
        "Choose either an item or an add-on to move.",
    )
    .refine(
        (entry) => !entry.variantId || Boolean(entry.itemId),
        "An option belongs to an item.",
    )
    .refine(
        (entry) =>
            !entry.manufacturedAt ||
            !entry.expiresAt ||
            entry.expiresAt >= entry.manufacturedAt,
        {
            message: "This batch expires before it was made.",
            path: ["expiresAt"],
        },
    );

export type StockEntryInput = z.infer<typeof stockEntrySchema>;

function toAttributeRequest(attribute: ItemAttributeInput) {
    return {
        name: attribute.name,
        type: attribute.type,
        placement: attribute.placement,
        ...(attribute.icon ? { icon: attribute.icon } : {}),
        values: attribute.values.map((value) => ({
            value: value.value,
            available: value.available,
            ...(value.label ? { label: value.label } : {}),
            
            
            ...(value.colorHex ? { colorHex: value.colorHex } : {}),
        })),
    };
}

function toBlockRequest(
    block: DescriptionBlockInput | z.infer<typeof leafDescriptionBlockSchema>,
): DescriptionBlock {
    switch (block.type) {
        case "PARAGRAPH":
        case "HEADING":
            return { type: block.type, text: block.text };
        case "BULLETS":
            return { type: block.type, items: block.items };
        case "IMAGE":
            return {
                type: block.type,
                url: block.url,
                ...(block.caption ? { caption: block.caption } : {}),
            };
        case "SPEC_GRID":
            return { type: block.type };
        default:
            return {
                type: "COLUMNS" as const,
                columns: ("columns" in block ? block.columns : []).map(
                    (column) => ({
                        blocks: column.blocks.map(toBlockRequest),
                    }),
                ),
            };
    }
}

export function toItemRequest(input: InventoryItemInput) {
    return {
        name: input.name,
        sku: input.sku,
        code: input.code,
        description: input.description,
        badge: input.badge,
        barcode: input.barcode,
        itemType: input.itemType,
        trackInventory: input.trackInventory,
        attributes: input.attributes.map(toAttributeRequest),
        descriptionBlocks: input.descriptionBlocks.map(toBlockRequest),
        variants: input.variants,
        colors: input.colors,
        addOnIds: input.addOnIds,
        uomConversions: input.uomConversions,
        lowStockDefault: input.lowStockDefault,
        status: input.status,
        ...(input.price === undefined ? {} : { price: input.price }),
        itemGroupId: input.itemGroupId,
        unitId: input.unitId,
    };
}

export const maxItemImages = 10;

export const itemImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "each item image",
    formats: "PNG, JPG or WebP",
});

export type UploadedAsset = {
    key?: string;
    url?: string;
};

export const choiceImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "a choice image",
    formats: "PNG, JPG or WebP",
});

export const blockImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "the block image",
    formats: "PNG, JPG or WebP",
});

export type MultipartPayload = {
    body: Blob;
    contentType: string;
};

const multipartLineBreak = "\r\n";

function headerSafeFilename(filename: string) {
    return filename.replace(/[\r\n"]/g, "_") || "upload";
}

export function toItemMultipart(
    input: InventoryItemInput,
    files?: readonly File[],
): MultipartPayload {
    const boundary = `----itemBoundary${crypto.randomUUID().replace(/-/g, "")}`;
    const parts: BlobPart[] = [];

    const openPart = (headers: readonly string[]) => {
        parts.push(
            `--${boundary}${multipartLineBreak}` +
                headers
                    .map((header) => `${header}${multipartLineBreak}`)
                    .join("") +
                multipartLineBreak,
        );
    };

    for (const [name, value] of Object.entries(toItemRequest(input))) {
        if (value === undefined || value === null) {
            continue;
        }

        if (typeof value === "object") {
            openPart([
                `Content-Disposition: form-data; name="${name}"`,
                "Content-Type: application/json",
            ]);
            parts.push(JSON.stringify(value));
        } else {
            openPart([`Content-Disposition: form-data; name="${name}"`]);
            parts.push(String(value));
        }

        parts.push(multipartLineBreak);
    }

    
    for (const file of files || []) {
        openPart([
            'Content-Disposition: form-data; name="files"; ' +
                `filename="${headerSafeFilename(file.name)}"`,
            `Content-Type: ${file.type || "application/octet-stream"}`,
        ]);
        parts.push(file, multipartLineBreak);
    }

    parts.push(`--${boundary}--${multipartLineBreak}`);

    return {
        body: new Blob(parts),
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
}

export function toItemPricingMultipart(
    input: ItemPricingInput,
): MultipartPayload {
    const boundary = `----itemBoundary${crypto.randomUUID().replace(/-/g, "")}`;
    const parts: BlobPart[] = [];

    const openPart = (headers: readonly string[]) => {
        parts.push(
            `--${boundary}${multipartLineBreak}` +
                headers
                    .map((header) => `${header}${multipartLineBreak}`)
                    .join("") +
                multipartLineBreak,
        );
    };

    if (input.price !== undefined) {
        openPart(['Content-Disposition: form-data; name="price"']);
        parts.push(String(input.price), multipartLineBreak);
    }

    if (input.variants) {
        openPart([
            'Content-Disposition: form-data; name="variants"',
            "Content-Type: application/json",
        ]);
        parts.push(JSON.stringify(input.variants), multipartLineBreak);
    }

    if (input.uomConversions) {
        openPart([
            'Content-Disposition: form-data; name="uomConversions"',
            "Content-Type: application/json",
        ]);
        parts.push(JSON.stringify(input.uomConversions), multipartLineBreak);
    }

    parts.push(`--${boundary}--${multipartLineBreak}`);

    return {
        body: new Blob(parts),
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
}

export function toItemGroupRequest(input: ItemGroupInput) {
    return {
        name: input.name,
        note: input.note,
        ...(input.parentId ? { parentId: input.parentId } : {}),
    };
}

export function toStockEntryRequest(input: StockEntryInput) {
    return {
        ...(input.itemId ? { itemId: input.itemId } : {}),
        ...(input.addOnId ? { addOnId: input.addOnId } : {}),
        ...(input.variantId ? { variantId: input.variantId } : {}),
        entryType: input.entryType,
        quantityChange: input.quantityChange,
        
        
        ...(input.lotNumber ? { lotNumber: input.lotNumber } : {}),
        ...(input.manufacturedAt
            ? { manufacturedAt: input.manufacturedAt }
            : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        
        
        
        
        ...(input.receivedAt
            ? { receivedAt: `${input.receivedAt}T00:00:00` }
            : {}),
        batchData: input.batchData,
        referenceType: input.referenceType,
        referenceNumber: input.referenceNumber,
        reason: input.reason,
        ...(input.unitCost === undefined
            ? {}
            : { unitCost: input.unitCost }),
        ...(input.unitSalePrice === undefined
            ? {}
            : { unitSalePrice: input.unitSalePrice }),
        
        ...(input.enteredQuantity !== undefined && input.unitId
            ? {
                  enteredQuantity: input.enteredQuantity,
                  unitId: input.unitId,
              }
            : {}),
        ...(input.referenceId
            ? { referenceId: input.referenceId }
            : {}),
    };
}
