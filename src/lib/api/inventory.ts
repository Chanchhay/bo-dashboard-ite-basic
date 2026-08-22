import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export const itemTypes = ["DIGITAL", "PHYSICAL"] as const;

/**
 * Item types no longer offered, kept so an item saved under one still loads and
 * still saves. Nothing here appears in a picker.
 */
export const retiredItemTypes = ["SERVICE"] as const;

/**
 * Every item type that may arrive from the API, offered or not. Validation
 * reads this rather than the picker's list, so an item saved as a service stays
 * editable after the type stopped being offered.
 */
export const storedItemTypes = [...itemTypes, ...retiredItemTypes] as const;

export type ItemType = (typeof itemTypes)[number];

export type StoredItemType = (typeof storedItemTypes)[number];

/** The kinds an item can be, spelled the way a shopkeeper would say them. */
export const itemTypeLabels: Record<StoredItemType, string> = {
    PHYSICAL: "Physical",
    DIGITAL: "Digital",
    // Retired, and still labelled: an item saved as a service is listed and
    // edited like any other, and a blank type beside its name would read as a
    // bug.
    SERVICE: "Service",
};

export const itemStatuses = ["ACTIVE", "INACTIVE"] as const;
/**
 * What an attribute can be.
 *
 * Colour is deliberately absent: a colour is a thing the shop sells, with its
 * own price, barcode, picture and stock, so it is an Option — see
 * `ItemVariant.colorHex`. An attribute is a note about the thing, and a colour
 * that carried no stock was never one a shopper could actually buy.
 */
export const itemAttributeTypes = [
    "TEXT",
    "SELECTION",
    "TOGGLE",
    "NUMBER",
] as const;

/**
 * Types no longer offered, kept so an item saved under one still loads and
 * still saves. Nothing here appears in a picker.
 */
export const retiredItemAttributeTypes = ["COLOR"] as const;

/**
 * Every type that may arrive from the API, offered or not.
 *
 * Validation reads this rather than the picker's list: a shop that saved a
 * colour attribute before it was retired must still be able to open that item
 * and save an unrelated edit to it. Refusing the type on the way out would
 * make the item uneditable over a choice the shop is no longer offered.
 */
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
    // Retired, and still labelled: an item saved under it is listed like any
    // other, and a blank chip beside its name would read as a bug.
    COLOR: "Color",
};

/** Where an attribute renders on the storefront item page. */
export const itemAttributePlacements = [
    "OPTION",
    "HIGHLIGHT",
    "SPECIFICATION",
] as const;

/**
 * Placements no longer offered, kept so an item saved under one still loads.
 * `HIDDEN` was an attribute the storefront never rendered — a note to self with
 * a form around it.
 */
export const retiredItemAttributePlacements = ["HIDDEN"] as const;

/** Every placement that may arrive from the API — see `storedItemAttributeTypes`. */
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
    // Retired, and still labelled, for the same reason as COLOR above.
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
    /** Short form shown beside amounts — "g", "ml", "pc". */
    symbol?: string | null;
    category?: UnitCategory | null;
    /** A platform unit: selectable everywhere, editable nowhere. */
    system?: boolean;
    note?: string | null;
};

/**
 * How many of an item's base units make up one of a larger unit.
 *
 * Held against the item rather than the unit: a sack of rice and a sack of
 * flour are both sacks and do not weigh the same.
 */
export type ItemUomConversion = {
    id?: string;
    unit?: Unit;
    /**
     * Which option this larger unit is for.
     *
     * A shop that sells Large by the case need not sell Small that way. Null
     * on an item with no options.
     */
    variantId?: string | null;
    variantName?: string | null;
    /** Base units per one of `unit`. */
    factor?: number;
    /**
     * What one of this unit sells for — a case, a six-pack.
     *
     * Priced in its own right rather than as a multiple: a case is not
     * twenty-four times a can, or nobody would buy the case. Null means the
     * item is bought and counted in this unit but never sold in it.
     */
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

/**
 * A saved list of option values, so "Small, Medium, Large" is typed once.
 *
 * Applying one copies its values onto the item — it is a starting point, not a
 * live link, so editing it later never rewrites items already using it.
 */
export type OptionPreset = {
    id: string;
    name?: string;
    type?: "SELECTION" | "COLOR";
    required?: boolean;
    values?: {
        value?: string;
        colorHex?: string | null;
    /** What the shop calls that colour — "Brown". Shown beside the swatches. */
    colorName?: string | null;
        /** Carried onto the item, so a swatch arrives with its picture. */
        imageUrl?: string | null;
    }[];
};

export type ItemAttributeValue = {
    value?: string;
    label?: string;
    /** Retired: colour moved to Options. Kept so old items still load. */
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

/**
 * One colour the item comes in, declared once for the whole item.
 *
 * Once, not per size: the same red shirt photographed for Small is the same
 * photograph for Large. A size then says which of these it offers, and the
 * pair of the two is what carries stock.
 */
export type ItemColor = {
    value?: string;
    colorHex?: string | null;
    imageUrl?: string | null;
};

export type ItemVariant = {
    id?: string;
    slug?: string;
    name?: string;
    /** Each variation is scanned and counted on its own. */
    sku?: string | null;
    barcode?: string | null;
    /**
     * The picture of this variation, if it looks different from the item —
     * a black phone next to a white one. Already uploaded, so it is a URL
     * rather than a file: the store swaps to it when the option is picked.
     */
    imageUrl?: string | null;
    /**
     * The swatch this option shows — the circle a shopper clicks. Empty on an
     * option that is not a colour; a size has nothing to show.
     */
    /** The size half of the pair — "Large". */
    optionName?: string | null;
    /** Which of the item's colours this row is; null when sold by size alone. */
    colorValue?: string | null;
    /** Null on a variant the API holds with no price set. */
    price?: number | null;
    available?: boolean;
};

/**
 * An extra piled on top of an item — pearls, an extra shot.
 *
 * It belongs to the business library rather than to one item, so the same
 * "Extra shot" is attached to every drink that offers it — price included,
 * which is set in Sale Management.
 */
export type AddOnUomConversion = {
    id?: string;
    unit?: Unit;
    /** Base units per one of `unit`. */
    factor?: number;
};

export type AddOn = {
    id: string;
    name?: string;
    slug?: string;
    baseUnit?: Unit | null;
    /** How much one selection takes off, in base units. */
    usePerOrder?: number | null;
    /**
     * What one selection costs, anywhere it is offered.
     *
     * One number for the whole business: "Extra shot" costs the same on every
     * drink that offers it. Null until it has been priced, and it cannot be
     * sold until it has.
     */
    price?: number | null;
    /**
     * Whether the item selling it currently offers it.
     *
     * Only set when the add-on is read through an item — in the shared
     * library there is no one item for it to be on sale for. Off means the
     * item still offers it, but it is not on the menu today.
     */
    available?: boolean | null;
    /** Larger units it is bought in — "1 bag = 3000 g". */
    uomConversions?: AddOnUomConversion[];
    note?: string | null;
};

export const addOnSelectionRules = ["ANY", "UP_TO"] as const;

export type AddOnSelectionRule = (typeof addOnSelectionRules)[number];

/**
 * A group of add-ons offered together, with how many a customer may pick.
 *
 * The add-ons stay in the shared library — a set is the rule around them, so
 * putting "Pearls" in two sets never duplicates it or its stock.
 */
export type AddOnSet = {
    id: string;
    name?: string;
    rule?: AddOnSelectionRule;
    /** Only meaningful when `rule` is `UP_TO`. */
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
    images?: ItemImage[];
    badge?: string;
    barcode?: string;
    price?: number | null;
    compareAtPrice?: number | null;
    itemType?: StoredItemType;
    trackInventory?: boolean;
    attributes?: ItemAttribute[];
    /** The colours this item comes in, shared by every size. */
    colors?: ItemColor[];
    descriptionBlocks?: DescriptionBlock[];
    variants?: ItemVariant[];
    addOns?: AddOn[];
    uomConversions?: ItemUomConversion[];
    lowStockDefault?: number;
    status?: (typeof itemStatuses)[number];
};

/**
 * Every picture the item can show, best first.
 *
 * The item's own gallery leads, in the order the seller arranged it. What
 * follows is the pictures hanging off its choices — a colour swatch, an
 * option's own shot — because an item photographed only through its colours
 * still has a face to show. A seller who uploaded nothing at item level did
 * not mean "no picture"; they meant the picture lives on the option.
 */
export function itemImageUrls(
    item: Pick<InventoryItem, "images" | "colors" | "variants">,
): string[] {
    const gallery: string[] = [];
    const push = (url?: string | null) => {
        if (url && !gallery.includes(url)) gallery.push(url);
    };

    [...(item.images || [])]
        .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
        .forEach((image) => push(image.url));
    (item.colors || []).forEach((color) => push(color.imageUrl));
    (item.variants || []).forEach((variant) => push(variant.imageUrl));

    return gallery;
}

/** The one picture a card shows — the thumbnail, or the first option's. */
export function itemThumbnail(
    item: Pick<InventoryItem, "images" | "colors" | "variants">,
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

/**
 * The entry types an operator may record by hand.
 *
 * `SALE` and `RETURN` are excluded deliberately: the order flow writes those,
 * and a hand-written one can never reconcile against an order, so it corrupts
 * the ledger's meaning. They stay in `stockEntryTypes` because existing entries
 * still have to render.
 */
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

/**
 * The one definition of stock health, used by every screen that shows it.
 *
 * Three incompatible versions of this used to exist — the stock screen excluded
 * zero from "low", the dashboard included it, and the POS read a threshold and
 * never compared against it, so every sold line raised an alert. One rule:
 *
 *   out   quantity has run out
 *   low   some left, at or below the threshold
 *   in    everything else
 *
 * A threshold of 0 therefore means "only warn me at zero", which is what a
 * merchant who never set one would expect.
 */
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

/**
 * One delivery still on the shelf, and what it cost.
 *
 * Stock is not one number at one price. Each delivery keeps the price it
 * arrived at and a sale eats them in date order, so an item can be sitting on
 * two batches bought months apart at different money — and what the next sale
 * costs depends which of them it comes out of. This is what makes a margin
 * explicable rather than something the shop takes on trust.
 */
export type StockBatch = {
    id: string;
    /** The option this batch arrived for. Null on an item with no options. */
    variantId?: string | null;
    variantName?: string | null;
    unitCost: number;
    quantityReceived: number;
    quantityRemaining: number;
    remainingValue: number;
    receivedAt?: string | null;
    /** The supplier's reference for the delivery, for traceability. */
    lotNumber?: string | null;
    manufacturedAt?: string | null;
    /** When it goes off. Null on a batch that does not expire. */
    expiresAt?: string | null;
    /**
     * Whether it is already past its date.
     *
     * The API works this out rather than leaving the screen to compare against
     * whichever clock the browser happens to be set to.
     */
    expired?: boolean;
    /**
     * Where in the queue it sits: soonest to expire first, then oldest arrival
     * among those that never expire. The next sale draws from position 1 —
     * which is not always the oldest delivery.
     */
    position: number;
};

/**
 * One batch a movement drew from, and what that share of it cost.
 *
 * A sale of six often spans two deliveries — five of the old batch at one
 * price and one of the new at another. The movement records a single cost for
 * the whole thing, and that number is explicable from nowhere else: it is
 * neither price paid, and dividing it by the quantity gives an average that
 * matches no batch on the shelf.
 */
export type StockConsumption = {
    batchId: string;
    lotNumber?: string | null;
    expiresAt?: string | null;
    receivedAt?: string | null;
    quantity: number;
    unitCost: number;
    /** Quantity times unit cost: this batch's share of the movement's cost. */
    cost: number;
};

export type StockSummary = {
    /** One of the two is set: a movement is against an item or an add-on. */
    itemId?: string;
    addOnId?: string;
    /**
     * Which option of the item this balance belongs to.
     *
     * An item sold in options holds one balance per option, so it has one
     * summary per option rather than one in total. Null alongside an itemId is
     * the item as a whole: either it has no options, or the stock was recorded
     * before it had any and nobody has said which option it belongs in.
     */
    variantId?: string;
    variantName?: string;
    quantityOnHand?: number;
    /**
     * What the remaining stock is worth, summed across the batches still
     * holding it at the price each was bought at.
     *
     * Only the API can work this out: it holds the batches. A single cost per
     * item cannot stand in for it once two deliveries at different prices are
     * both on the shelf.
     */
    stockValue?: number;
    /** What the next unit out costs: the oldest batch still holding any. */
    unitCost?: number;
    lastEntryId?: string;
    updatedAt?: string;
};

export type StockEntry = {
    id: string;
    businessOwnerId?: string;
    itemId?: string;
    addOnId?: string;
    /** The option that moved, when the item is sold in options. */
    variantId?: string;
    /** Carried so the ledger reads back after an option is renamed or removed. */
    variantName?: string;
    entryType?: (typeof stockEntryTypes)[number];
    quantityChange?: number;
    quantityBefore?: number;
    quantityAfter?: number;
    /**
     * On the way in, what a base unit was bought for. On the way out, what it
     * actually cost — worked out from the batches consumed, never typed.
     */
    unitCost?: number;
    /** What the whole outgoing movement cost. Absent on the way in. */
    costOfGoods?: number;
    /** What a base unit sold for, on a stock-out sold away from the till. */
    unitSalePrice?: number;
    /** What was counted, in the unit it was counted in. */
    enteredQuantity?: number;
    enteredUnit?: Unit | null;
    /**
     * The batches this movement drew from, on the way out.
     *
     * Only the single-movement endpoint fills this in; on a list it is absent,
     * because reading it per row would be a query per row to answer something
     * no row is showing.
     */
    consumedBatches?: StockConsumption[];
    /** The lot and dates this movement was recorded against. */
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

/**
 * The lot a movement was recorded against, wherever it is stored.
 *
 * Lot and dates are columns on a movement now, because the expiry is what
 * orders the sell queue and a free-form blob cannot be sorted on. They used to
 * live in `batchData` under a `lot` key, and the ledger is never rewritten —
 * so movements from before that change still keep it there and have to be read
 * back from it.
 */
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

/**
 * A calendar date the form may simply not have been given.
 *
 * `<input type="date">` hands back `""` when it is cleared, which has to mean
 * "not set" rather than fail as a malformed date — otherwise a user who types
 * an expiry and then thinks better of it cannot save at all.
 */
const optionalDate = z
    .string()
    .trim()
    .refine(
        (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Enter a date as YYYY-MM-DD.",
    );

/**
 * A money field that may simply not be set.
 *
 * Unset reaches us two ways — absent on a form that never asks for it, and
 * `null` on a record the API has already stored — and both have to mean the
 * same thing, or editing an item the API returned would fail validation on a
 * field the screen never shows.
 */
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
    // Defaulted rather than required: the pricing screen sends variants to
    // set prices and has no business restating identifiers it never edits.
    sku: optionalText(100, "Variant SKU must be 100 characters or fewer.")
        .default(""),
    barcode: optionalText(
        100,
        "Variant barcode must be 100 characters or fewer.",
    ).default(""),
    // Uploaded before the item is saved, so what travels is the stored URL.
    // Optional for the same reason as SKU and barcode — the pricing screen
    // sends variants to set prices — and nullable because an option the API
    // holds with no picture of its own comes back as null.
    imageUrl: optionalText(
        500,
        "Variant image URL must be 500 characters or fewer.",
    ).nullish(),
    price: optionalMoney("Variant price cannot be negative."),
    /**
     * The swatch this option shows. Defaulted so the pricing screen, which
     * restates variants to set prices, need not carry a field it never edits.
     */
    /**
     * The pair this row is. Defaulted so the pricing screen, which restates
     * variants to set prices, need not carry coordinates it never edits.
     */
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
    /**
     * Retired: colour moved to Options, and no form writes this any more.
     *
     * Still carried, because a value saved under the old colour attribute has
     * a hex and nothing else remembers it — dropping it on the way out would
     * quietly discard the shop's swatches the first time anyone opened the
     * item to change its name.
     */
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
    // Both are required: an item that is counted in nothing and filed under
    // nothing cannot be stocked or found again.
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
    compareAtPrice: optionalMoney("Compare-at price cannot be negative."),
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
                /** The option's id, once it has one. */
                variantId: z.string().trim().optional(),
                /**
                 * The option's name — how a conversion names an option typed
                 * on the same screen, which has no id until the item is saved.
                 * Required on an item sold in options.
                 */
                variantName: z.string().optional(),
                factor: z
                    .number()
                    .positive("A conversion must be greater than zero."),
                /** Set in Sale Management; absent means not sold by this unit. */
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

/**
 * A pricing-only change.
 *
 * Every field is optional because the update applies what it is given: send a
 * price to set it, send variants to replace them, send both to do both.
 */
export const itemPricingSchema = z.object({
    price: z.number().min(0, "Price cannot be negative.").optional(),
    compareAtPrice: z
        .number()
        .min(0, "Compare-at price cannot be negative.")
        .optional(),
    variants: itemVariantsSchema.optional(),
    /**
     * What each larger unit sells for. Sent whole, like variants: the update
     * replaces the list, so a conversion left out would lose its factor.
     */
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

/**
 * Which add-ons an item offers — the whole list, every time.
 *
 * A toggle sends what the item should end up offering rather than "add this
 * one", so two people toggling at once cannot leave it half-applied.
 */
export const itemAddOnsSchema = z.object({
    addOnIds: z.array(z.string().trim().min(1, "Select a valid add-on.")),
});

export type ItemAddOnsInput = z.infer<typeof itemAddOnsSchema>;

/** Whether an item currently sells one of the add-ons it offers. */
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
    /** What one selection costs. Set in Sale Management, not here. */
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
        // A ceiling only means something when there is one to hit.
        ...(input.rule === "UP_TO" && input.maxChoices !== undefined
            ? { maxChoices: input.maxChoices }
            : {}),
    };
}

export const stockEntrySchema = z
    .object({
    // An add-on is counted like an item but never sold on its own, so a
    // movement targets exactly one of the two.
    itemId: z.string().trim().optional(),
    addOnId: z.string().trim().optional(),
    /** Which option of the item moved. Only ever set beside an itemId. */
    variantId: z.string().trim().optional(),
    entryType: z.enum(stockEntryTypes),
    quantityChange: z.number(),
    // Cost belongs to stock arriving and sale price to stock leaving. The API
    // rejects either on the wrong side rather than quietly storing it.
    unitCost: z
        .number()
        .min(0, "Unit cost cannot be negative.")
        .optional(),
    unitSalePrice: z
        .number()
        .min(0, "Sale price cannot be negative.")
        .optional(),
    /** What the operator typed, before conversion into base units. */
    enteredQuantity: z.number().positive().optional(),
    /** The unit they typed it in: the item's base unit or a conversion. */
    unitId: optionalUuidSchema.optional(),
    /** The supplier's reference for the delivery, so a recall can be answered. */
    lotNumber: optionalText(80, "Lot number must be 80 characters or fewer.")
        .optional(),
    manufacturedAt: optionalDate.optional(),
    /**
     * When this delivery goes off. What the queue is ordered by before
     * anything else — a short-dated delivery leaves before older stock that
     * keeps longer. Left out, the batch is treated as one that never expires.
     */
    expiresAt: optionalDate.optional(),
    /** When it actually arrived, if a delivery is being recorded late. */
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
    // An add-on has no options of its own to count separately.
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
            // Only ever present on an attribute saved before colour was
            // retired; sent back exactly as it arrived.
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
        ...(input.compareAtPrice === undefined
            ? {}
            : { compareAtPrice: input.compareAtPrice }),
        itemGroupId: input.itemGroupId,
        unitId: input.unitId,
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

/** An Option's or a preset value's picture: same ceiling as the gallery. */
export const choiceImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "a choice image",
    formats: "PNG, JPG or WebP",
});

/** Description-block pictures go through the same ceiling as the gallery. */
export const blockImageRules = imageUploadRules({
    accept: "image/*",
    maxBytes: 10 * 1024 * 1024,
    subject: "the block image",
    formats: "PNG, JPG or WebP",
});

/** A hand-built request body, paired with the header that describes it. */
export type MultipartPayload = {
    body: Blob;
    contentType: string;
};

const multipartLineBreak = "\r\n";

/** Quotes and line breaks would end the header early, so they are dropped. */
function headerSafeFilename(filename: string) {
    return filename.replace(/[\r\n"]/g, "_") || "upload";
}

/**
 * Encodes the item request as multipart, one part per top-level field.
 *
 * `POST`/`PUT` items are `multipart/form-data` so the pictures can ride along.
 * `attributes`, `descriptionBlocks` and `variants` go up as single JSON parts
 * rather than being spread into indexed paths — `attributes[0].values[1]` and
 * friends — because that spread grows a part per leaf value, and Tomcat caps a
 * request at `maxPartCount` parts (10 by default). One item with a handful of
 * attributes blows past that ceiling; as JSON the count is fixed at a dozen or
 * so however much customization the item carries.
 *
 * This is built by hand instead of with `FormData` because `FormData.append`
 * stamps `filename="blob"` on every `Blob`, and a part with a filename is a
 * file part to the server: capped by `max-file-size` rather than the form
 * limits, and bound as a `MultipartFile` instead of the value it holds.
 *
 * Empty strings and empty arrays are sent rather than skipped: an update reads
 * a missing field as "leave alone" and an empty one as "clear", so dropping
 * them would make emptying a SKU or removing every attribute impossible.
 */
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

    // Repeated parts under one name are what binds to `List<MultipartFile>`.
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

/**
 * Prices only: the item's own amount, its options, or both.
 *
 * The item update applies each field only when it is sent, so pricing needs
 * nothing else — round-tripping a whole item to change one number risks
 * overwriting fields the pricing screen never loaded.
 */
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

    if (input.compareAtPrice !== undefined) {
        openPart(['Content-Disposition: form-data; name="compareAtPrice"']);
        parts.push(String(input.compareAtPrice), multipartLineBreak);
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
        // Lot and dates belong to stock arriving; the API refuses them on the
        // way out, so an empty field must be left off rather than sent blank.
        ...(input.lotNumber ? { lotNumber: input.lotNumber } : {}),
        ...(input.manufacturedAt
            ? { manufacturedAt: input.manufacturedAt }
            : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        // The API takes a moment here, the form only asks for a day. Midnight
        // is the honest reading of "it arrived on the 20th" — it puts the
        // batch ahead of anything else logged that day, which is what somebody
        // recording a delivery late is telling us.
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
        // The pair travels together or not at all; the API rejects a half of it.
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
