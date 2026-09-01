import type {
    AddOn,
    ItemSubGroup,
    ItemUomConversion,
    ItemVariant,
    Unit,
} from "@/lib/api/inventory";
import type { StoredItemType } from "@/lib/api/inventory";

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
        trackInventory?: boolean;
        
        itemType?: StoredItemType;
        itemGroup?: ItemSubGroup;
        images?: Array<{
            id?: string;
            url?: string;
            position?: number;
        }>;
        
        unit?: Unit;
        variants?: ItemVariant[];
        uomConversions?: ItemUomConversion[];
        
        addOns?: AddOn[];
        /** Count at or below which the till warns. Per item, not per shop. */
        lowStockDefault?: number;
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
