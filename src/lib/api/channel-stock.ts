import { z } from "zod";

/**
 * How one item's stock is shared out between the channels that sell it.
 *
 * There is still one shelf. An item has one balance, and every sale — from the
 * till, from Telegram, from the web — comes off that same balance. What a
 * channel gets is not stock of its own but a share of the one pool: how many
 * of the units on hand it is allowed to sell.
 *
 *   SHARED     every channel may sell everything on hand. What the shop had
 *              before this existed, and what it keeps until it says otherwise.
 *   ALLOCATED  each channel may sell up to the number set against it. What is
 *              left over is held back and sells nowhere until it is given out.
 *
 * The distinction matters when the last unit is in play: under SHARED two
 * channels can both be shown it and one of them loses the race, which is fine
 * for a shop with a deep shelf and not fine for one selling six cakes a day.
 */
export const channelStockModes = ["SHARED", "ALLOCATED"] as const;

export type ChannelStockMode = (typeof channelStockModes)[number];

/**
 * One channel's share, for one thing that is counted.
 *
 * Keyed by option as well as channel because stock is counted per option: an
 * item sold in Small and Large has two balances, and a single number against
 * the channel could not say that Web sells the Large ones only. `variantId` is
 * null on an item with no options — the item as a whole is then the only thing
 * there is a balance of.
 */
export type ChannelStockAllocation = {
    salesChannelId: string;
    /** Carried by the read so the editor can label a channel it has not loaded. */
    channelName?: string;
    channelCode?: string;
    variantId?: string | null;
    variantName?: string | null;
    /** How many of the units on hand this channel may sell. */
    quantity: number;
    /**
     * How many of them it already has.
     *
     * A share is consumed by selling: giving Web ten and letting it sell ten
     * more every time the shelf is restocked would be a promise the shelf
     * never made. Written by the backend, never by this screen.
     */
    sold?: number;
};

export type ItemChannelStock = {
    itemId: string;
    mode: ChannelStockMode;
    allocations: ChannelStockAllocation[];
    updatedAt?: string;
};

/**
 * What one channel may still sell of one thing.
 *
 * Sent only for items the shop has actually split. An item that is absent has
 * no ceiling — the screen shows what is on the shelf, exactly as it always did.
 * The figure is the allocation less what the channel sold, and is *not* capped
 * to the shelf: the screen holds the shelf figure already and shows the lower
 * of the two.
 */
export type ChannelStockAvailability = {
    itemId: string;
    variantId?: string | null;
    available: number;
};

/**
 * The two ceilings a channel sells under, resolved into one figure per thing.
 *
 * Keyed the way the till already keys its own stock map — `itemId` alone, or
 * `itemId:variantId` — so a screen can swap one lookup for the other without
 * rearranging what it holds.
 */
export function channelAvailabilityMap(
    rows: ChannelStockAvailability[] | undefined,
) {
    const available = new Map<string, number>();

    (rows || []).forEach((row) => {
        available.set(
            row.variantId ? `${row.itemId}:${row.variantId}` : row.itemId,
            Math.max(0, row.available ?? 0),
        );
    });

    return available;
}

export const channelStockAllocationSchema = z.object({
    salesChannelId: z.uuid("Select a valid sales channel."),
    variantId: z.uuid().nullable().optional(),
    quantity: z
        .number()
        .int("Allocate whole units.")
        .min(0, "An allocation cannot be negative."),
});

/**
 * Saved whole, the way the screen is edited.
 *
 * The list replaces what was there: a channel left out of it has no share, so
 * an empty list is how a shop says "nobody is selling this yet" rather than
 * "leave everything as it was".
 */
export const saveItemChannelStockSchema = z.object({
    mode: z.enum(channelStockModes),
    allocations: z.array(channelStockAllocationSchema),
});

export type SaveItemChannelStockInput = z.infer<
    typeof saveItemChannelStockSchema
>;

/** Addresses one share: a channel, and the option it is a share of. */
export function allocationKey(
    salesChannelId: string,
    variantId?: string | null,
) {
    return variantId ? `${salesChannelId}:${variantId}` : salesChannelId;
}

/**
 * What a channel may still sell of one option.
 *
 * Two ceilings, and the lower one wins: a channel cannot sell more than its
 * share, and no channel can sell what is not on the shelf. Under SHARED there
 * is no share to cap it, so the shelf is the only limit — which is exactly the
 * behaviour every channel had before allocation existed.
 */
export function channelAvailable({
    mode,
    onHand,
    allocation,
}: {
    mode: ChannelStockMode;
    onHand: number;
    allocation?: ChannelStockAllocation;
}) {
    if (mode === "SHARED") return Math.max(0, onHand);

    const share = Math.max(0, (allocation?.quantity ?? 0) - (allocation?.sold ?? 0));

    return Math.min(Math.max(0, onHand), share);
}

/**
 * What is on the shelf but promised to nobody.
 *
 * Shown rather than quietly absorbed: a shop that has taken in twenty and
 * given out twelve should see the eight it is sitting on, because under
 * ALLOCATED those eight are not for sale anywhere until it says where.
 */
export function unallocated(
    onHand: number,
    allocations: ChannelStockAllocation[],
) {
    const given = allocations.reduce(
        (total, allocation) => total + Math.max(0, allocation.quantity),
        0,
    );

    return onHand - given;
}
