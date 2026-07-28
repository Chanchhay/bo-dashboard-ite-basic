import { z } from "zod";

export const itemTypes = ["DIGITAL", "SERVICE", "PHYSICAL"] as const;
export const itemStatuses = ["ACTIVE", "INACTIVE"] as const;
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

export type ItemVariant = {
    id?: string;
    slug?: string;
    name?: string;
    price?: number;
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
    imageUrl?: string;
    barcode?: string;
    price?: number;
    itemType?: (typeof itemTypes)[number];
    attributes?: Record<string, unknown>;
    variants?: ItemVariant[];
    lowStockDefault?: number;
    status?: (typeof itemStatuses)[number];
};

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
});

export const inventoryItemSchema = z.object({
    itemGroupId: optionalUuidSchema,
    unitId: optionalUuidSchema,
    name: z
        .string()
        .trim()
        .min(1, "Product name is required.")
        .max(200, "Product name must be 200 characters or fewer."),
    sku: optionalText(100, "SKU must be 100 characters or fewer."),
    code: optionalText(100, "Code must be 100 characters or fewer."),
    description: z.string().trim(),
    imageUrl: optionalText(
        255,
        "Image URL must be 255 characters or fewer.",
    ),
    barcode: optionalText(
        100,
        "Barcode must be 100 characters or fewer.",
    ),
    price: z.number().min(0, "Price cannot be negative."),
    itemType: z.enum(itemTypes),
    attributes: z.record(z.string(), z.unknown()),
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
    itemId: z.uuid("Select a product."),
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

export function toItemRequest(input: InventoryItemInput) {
    return {
        name: input.name,
        sku: input.sku,
        code: input.code,
        description: input.description,
        imageUrl: input.imageUrl,
        barcode: input.barcode,
        price: input.price,
        itemType: input.itemType,
        attributes: input.attributes,
        variants: input.variants,
        lowStockDefault: input.lowStockDefault,
        status: input.status,
        ...(input.itemGroupId
            ? { itemGroupId: input.itemGroupId }
            : {}),
        ...(input.unitId ? { unitId: input.unitId } : {}),
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
