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
        /**
         * Whether there is anything to count.
         *
         * A haircut and a download have no shelf, so the till must not refuse
         * to sell them for want of a stock figure that will never exist.
         */
        itemType?: StoredItemType;
        itemGroup?: ItemSubGroup;
        images?: Array<{
            id?: string;
            url?: string;
            position?: number;
        }>;
        /**
         * The item's own base unit, its options and the larger units it is
         * sold by. The channel endpoint returns the whole item, and the till
         * needs all three to ring one up: an option and a pack each carry
         * their own price and take their own amount off the shelf.
         */
        unit?: Unit;
        variants?: ItemVariant[];
        uomConversions?: ItemUomConversion[];
        /**
         * The extras it offers, each carrying whether this item currently
         * sells it — the till must not offer one taken off the menu.
         */
        addOns?: AddOn[];
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
