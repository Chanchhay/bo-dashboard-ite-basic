import { z } from "zod";


export const channelStockModes = ["SHARED", "ALLOCATED"] as const;

export type ChannelStockMode = (typeof channelStockModes)[number];


export type ChannelStockAllocation = {
    salesChannelId: string;
    
    channelName?: string;
    channelCode?: string;
    variantId?: string | null;
    variantName?: string | null;
    
    quantity: number;
    
    sold?: number;
};

export type ItemChannelStock = {
    itemId: string;
    mode: ChannelStockMode;
    allocations: ChannelStockAllocation[];
    updatedAt?: string;
};


export type ChannelStockAvailability = {
    itemId: string;
    variantId?: string | null;
    available: number;
};


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


export const saveItemChannelStockSchema = z.object({
    mode: z.enum(channelStockModes),
    allocations: z.array(channelStockAllocationSchema),
});

export type SaveItemChannelStockInput = z.infer<
    typeof saveItemChannelStockSchema
>;


export function allocationKey(
    salesChannelId: string,
    variantId?: string | null,
) {
    return variantId ? `${salesChannelId}:${variantId}` : salesChannelId;
}


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
