import type { ItemSubGroup } from "@/lib/api/inventory";

export type SalesChannelCode = "POS" | "TELEGRAM" | "MESSENGER" | "WEB" | string;

export type SalesChannel = {
    id: string;
    name: string;
    code: SalesChannelCode;
    isActive: boolean;
};

export type ItemChannel = {
    id: string;
    itemId: string;
    itemName?: string;
    itemCode?: string;
    itemPrice?: number;
    salesChannelId: string;
    channelName?: string;
    channelCode?: SalesChannelCode;
    enabled: boolean;
    createdAt?: string;
};

/**
 * What `GET /sales-channels/{code}/items` answers with: each item on a channel
 * paired with the id of the link that put it there, so removing one needs no
 * second lookup.
 */
export type ChannelItem = {
    itemChannelId: string;
    item: {
        id: string;
        name?: string;
        code?: string;
        sku?: string;
        barcode?: string;
        price?: number;
        status?: "ACTIVE" | "INACTIVE";
        itemGroup?: ItemSubGroup;
        images?: Array<{
            id?: string;
            url?: string;
            position?: number;
        }>;
    };
};

export type CreateItemChannelInput = {
    itemId: string;
    salesChannelId: string;
};

export type PostChannelItemInput = {
    itemId: string;
    enabled?: boolean;
};

export type ToggleItemChannelInput = {
    enabled: boolean;
};
