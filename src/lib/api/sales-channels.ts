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
