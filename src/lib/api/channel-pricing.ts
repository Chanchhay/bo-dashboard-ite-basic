import { z } from "zod";

import { dayKeys } from "@/lib/sale-pricing/schedule";
import { overrideKinds } from "@/lib/sale-pricing/pricing";

/**
 * What one sales channel does differently.
 *
 * The catalogue is not repeated here — the screen already has every item and
 * its business price. A channel only ever adds three things: what it sells,
 * what it charges instead, and when it is open.
 */

const timeWindowSchema = z.object({
    /** `HH:MM`, 24-hour. */
    open: z.string(),
    close: z.string(),
});

const dayScheduleSchema = z.object({
    closed: z.boolean(),
    windows: z.array(timeWindowSchema),
});

export const channelScheduleSchema = z.object({
    alwaysOpen: z.boolean(),
    days: z.record(z.enum(dayKeys), dayScheduleSchema),
});

export const channelOverrideSchema = z.object({
    kind: z.enum(overrideKinds),
    value: z.number().nullable().optional(),
});

/**
 * One exception, on the same line Set Price prices.
 *
 * Both ids absent is the item sold on its own; `variantId` names one of its
 * options; `unitId` names one of its larger units.
 */
export const channelPriceLineSchema = z.object({
    itemId: z.uuid("Select a valid item."),
    variantId: z.uuid().nullable().optional(),
    unitId: z.uuid().nullable().optional(),
    kind: z.enum(overrideKinds),
    value: z.number().nullable().optional(),
});

export const saveChannelListingSchema = z.object({
    globalRule: channelOverrideSchema.optional(),
    schedule: channelScheduleSchema.optional(),
    /** Sent whole: an empty list is a channel that sells nothing. */
    enabledItemIds: z.array(z.uuid("Select a valid item.")).optional(),
    overrides: z.array(channelPriceLineSchema).optional(),
});

export type ChannelPriceLine = z.infer<typeof channelPriceLineSchema>;
export type ChannelOverrideInput = z.infer<typeof channelOverrideSchema>;
export type SaveChannelListingInput = z.infer<typeof saveChannelListingSchema>;

export type ChannelListing = {
    channelId: string;
    name?: string;
    code?: string;
    active?: boolean;
    globalRule?: { kind?: string; value?: number | null } | null;
    /** Null when nobody has set hours, which is read as always open. */
    schedule?: z.infer<typeof channelScheduleSchema> | null;
    /** Whether the channel was taking orders when this was read. */
    openNow?: boolean;
    enabledItemIds?: string[];
    overrides?: {
        itemId: string;
        variantId?: string | null;
        unitId?: string | null;
        kind?: string;
        value?: number | null;
    }[];
};
