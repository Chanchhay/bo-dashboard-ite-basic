import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export const itemTypes = ["DIGITAL", "SERVICE", "PHYSICAL"] as const;
export const itemStatuses = ["ACTIVE", "INACTIVE"] as const;
export const itemAttributeTypes = [
    "TEXT",
    "SELECTION",
    "TOGGLE",
    "NUMBER",
    "COLOR",
] as const;

export type ItemAttributeType = (typeof itemAttributeTypes)[number];

export const itemAttributeTypeLabels: Record<ItemAttributeType, string> = {
    TEXT: "Text",
    SELECTION: "Selection",
    TOGGLE: "Toggle",
    NUMBER: "Number",
    COLOR: "Color",
};

/** Where an attribute renders on the storefront item page. */
export const itemAttributePlacements = [
    "OPTION",
    "HIGHLIGHT",
    "SPECIFICATION",
    "HIDDEN",
] as const;

export type ItemAttributePlacement =
    (typeof itemAttributePlacements)[number];

export const itemAttributePlacementLabels: Record<
    ItemAttributePlacement,
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

export type Unit = {
    id: string;
    name?: string;
    slug?: string;
    note?: string;
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

/** A stored image: the API owns the URL and the position, we only send files. */
export type ItemImage = {
    id?: string;
    url?: string;
    position?: number;
};

export type ItemVariant = {
    id?: string;
    slug?: string;
    name?: string;
    price?: number;
    available?: boolean;
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
    images?: ItemImage[];
    badge?: string;
    barcode?: string;
    price?: number;
    compareAtPrice?: number;
    itemType?: (typeof itemTypes)[number];
    attributes?: ItemAttribute[];
    descriptionBlocks?: DescriptionBlock[];
    variants?: ItemVariant[];
    lowStockDefault?: number;
    status?: (typeof itemStatuses)[number];
};

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
    z.uuid("Select a valid option.").optional(),
);

const optionalQueryNumber = z.preprocess(
    emptyQueryValueToUndefined,
    z.coerce.number().finite().min(0, "Price cannot be negative.").optional(),
);

/**
 * The item search and pageable contracts exposed by the inventory API. This
 * schema is shared by the browser-facing BFF and the filter UI so malformed
 * values never reach the backend.
 */
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
            z.enum(itemTypes).optional(),
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

export type StockSummary = {
    itemId: string;
    quantityOnHand?: number;
    lastEntryId?: string;
    updatedAt?: string;
};

export type StockEntry = {
    id: string;
    businessOwnerId?: string;
    itemId?: string;
    entryType?: (typeof stockEntryTypes)[number];
    quantityChange?: number;
    quantityBefore?: number;
    quantityAfter?: number;
    unitCost?: number;
    batchData?: Record<string, unknown>;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    reason?: string;
    createdBy?: string;
    createdDate?: string;
};

const optionalUuidSchema = z
    .string()
    .trim()
    .refine(
        (value) => !value || z.uuid().safeParse(value).success,
        "Select a valid option.",
    );

const optionalText = (maximum: number, message: string) =>
    z.string().trim().max(maximum, message);

export const itemVariantSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Variant name is required.")
        .max(150, "Variant name must be 150 characters or fewer."),
    price: z.number().min(0, "Variant price cannot be negative.").optional(),
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
        ),
    available: z.boolean(),
});

export type ItemAttributeValueInput = z.infer<
    typeof itemAttributeValueSchema
>;

/**
 * Mirrors the per-placement rules the API enforces, so the form reports them
 * before a request is made rather than surfacing a 400.
 */
export const itemAttributeSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Attribute name is required.")
            .max(150, "Attribute name must be 150 characters or fewer."),
        type: z.enum(itemAttributeTypes),
        placement: z.enum(itemAttributePlacements),
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
            (attribute.type === "SELECTION" || attribute.type === "COLOR") &&
            !count
        ) {
            issue("Add at least one option for shoppers to choose from.");
        }

        if (
            attribute.type === "COLOR" &&
            attribute.values.some((value) => !value.colorHex)
        ) {
            issue("Every colour needs a hex value.");
        }

        if (
            attribute.type === "NUMBER" &&
            attribute.values.some((value) => Number.isNaN(Number(value.value)))
        ) {
            issue("Number attributes only accept numeric values.");
        }
    });

export type ItemAttributeInput = z.infer<typeof itemAttributeSchema>;

/**
 * Blocks nest exactly one level: a `COLUMNS` block holds columns of leaf
 * blocks, and a column can never hold another `COLUMNS`. Expressing that as two
 * schemas rather than a recursive one makes the depth limit unrepresentable
 * instead of merely validated.
 */
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
    // Matches `DescriptionBlockRequest.url`. An uploaded picture's URL is the
    // storage endpoint plus a UUID and the original filename, so the old
    // 255-character cap could reject a save the user had no way to fix.
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
    itemGroupId: optionalUuidSchema,
    unitId: optionalUuidSchema,
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
    price: z.number().min(0, "Price cannot be negative."),
    compareAtPrice: z
        .number()
        .min(0, "Compare-at price cannot be negative.")
        .optional(),
    itemType: z.enum(itemTypes),
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
    lowStockDefault: z
        .number()
        .int("Low-stock threshold must be a whole number.")
        .min(0, "Low-stock threshold cannot be negative."),
    status: z.enum(itemStatuses),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

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

export const stockEntrySchema = z.object({
    itemId: z.uuid("Select an item."),
    entryType: z.enum(stockEntryTypes),
    quantityChange: z.number(),
    unitCost: z
        .number()
        .min(0, "Unit cost cannot be negative.")
        .optional(),
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
});

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

/** Each block type carries a different subset of the fields; send only those. */
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
        price: input.price,
        itemType: input.itemType,
        attributes: input.attributes.map(toAttributeRequest),
        descriptionBlocks: input.descriptionBlocks.map(toBlockRequest),
        variants: input.variants,
        lowStockDefault: input.lowStockDefault,
        status: input.status,
        ...(input.compareAtPrice === undefined
            ? {}
            : { compareAtPrice: input.compareAtPrice }),
        ...(input.itemGroupId
            ? { itemGroupId: input.itemGroupId }
            : {}),
        ...(input.unitId ? { unitId: input.unitId } : {}),
    };
}

// The server caps an item at ten images and each upload at 10 MB, and takes
// any `image/*` type. Checking here turns those into a message beside the
// picker instead of a rejected save.
export const maxItemImages = 10;

export const itemImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "each item image",
    formats: "PNG, JPG or WebP",
});

/** What `POST /businesses/{id}/assets` answers with. */
export type UploadedAsset = {
    key?: string;
    url?: string;
};

/** Description-block pictures go through the same ceiling as the gallery. */
export const blockImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "the block image",
    formats: "PNG, JPG or WebP",
});

/**
 * Flattens the item request into multipart parts.
 *
 * `POST`/`PUT` items are `multipart/form-data` so the pictures can ride along,
 * and the backend binds them onto a record constructor. That binder reads
 * nested values from indexed paths — `attributes[0].values[1].colorHex` — so
 * arrays and objects are spread into one part per leaf value rather than sent
 * as JSON.
 *
 * Empty strings are sent rather than skipped: an update reads a missing field
 * as "leave alone" and an empty one as "clear", so dropping them would make
 * emptying a SKU or a badge impossible.
 */
export function toItemFormData(
    input: InventoryItemInput,
    files?: readonly File[],
) {
    const formData = new FormData();

    const append = (path: string, value: unknown) => {
        if (value === undefined || value === null) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((entry, index) => append(`${path}[${index}]`, entry));
            return;
        }

        if (typeof value === "object") {
            for (const [key, nested] of Object.entries(value)) {
                append(`${path}.${key}`, nested);
            }
            return;
        }

        formData.append(path, String(value));
    };

    for (const [name, value] of Object.entries(toItemRequest(input))) {
        append(name, value);
    }

    // Repeated parts under one name are what binds to `List<MultipartFile>`.
    for (const file of files || []) {
        formData.append("files", file, file.name);
    }

    return formData;
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
        itemId: input.itemId,
        entryType: input.entryType,
        quantityChange: input.quantityChange,
        batchData: input.batchData,
        referenceType: input.referenceType,
        referenceNumber: input.referenceNumber,
        reason: input.reason,
        ...(input.unitCost === undefined
            ? {}
            : { unitCost: input.unitCost }),
        ...(input.referenceId
            ? { referenceId: input.referenceId }
            : {}),
    };
}
