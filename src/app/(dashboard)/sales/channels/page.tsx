"use client";

import { useMemo, useState } from "react";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ChannelMatrixTable } from "@/components/menu/ChannelMatrixTable";
import { MultiChannelPublishDialog, type SimpleSalesChannel } from "@/components/menu/MultiChannelPublishDialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetInventoryItemOptionsQuery } from "@/services/inventoryApi";
import { ChannelSelector } from "@/components/menu/ChannelSelector";
import { PostChannelDialog } from "@/components/menu/PostChannelDialog";
import { ItemChannelTable } from "@/components/menu/ItemChannelTable";
import { ChannelHeader } from "@/components/menu/ChannelHeader";
import { MultiChannelPublishDialog } from "@/components/menu/MultiChannelPublishDialog";
import { ChannelMatrixTable } from "@/components/menu/ChannelMatrixTable";
import {
    useCreateItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetChannelItemsQuery,
    useGetSalesChannelsQuery,
} from "@/services/salesChannelApi";

// Presentation only — the channels themselves come from the backend. A code
// with no entry here still renders, just without the colour and blurb.
const CHANNEL_METADATA: Record<
    string,
    { name: string; description: string; icon: React.ElementType; color: string }
> = {
    POS: {
        name: "Point of Sale (POS)",
        description: "Items available to sell at the in-store till.",
        icon: Store,
        color: "bg-primary text-primary/700 border-primary",
    },
];

const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
    {
        id: "item-coca",
        name: "Coca",
        sku: "Matcha001",
        code: "Matcha001",
        price: 4000.00,
        status: "ACTIVE",
    },
    {
        id: "item-iphone",
        name: "IPhone17",
        sku: "Electronic",
        code: "Electronic",
        price: 1000.00,
        status: "ACTIVE",
    },
    {
        id: "item-lenovo",
        name: "Lenovo",
        sku: "Laptop-1",
        code: "Laptop-1",
        price: 800.00,
        status: "ACTIVE",
    },
    {
        id: "item-macbook",
        name: "Macbook",
        sku: "electronic",
        code: "electronic",
        price: 2999.98,
        status: "ACTIVE",
    },
];

export default function SalesChannelsPage() {
    const { toast } = useToast();
    const [activeChannelCode, setActiveChannelCode] = useState<string>("POS");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedItemId, setSelectedItemId] = useState<string>("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
    const [pendingItemId, setPendingItemId] = useState<string>("");
    // Row action awaiting confirmation. Kept after the dialog closes so its
    // copy stays put while it animates out — clearing it here would flash the
    // other mode's wording on the closing frame. `isConfirmOpen` is what the
    // dialog actually opens and closes on.
    const [confirmAction, setConfirmAction] = useState<{
        mode: "add" | "remove";
        itemId: string;
    } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

    // State for Select Channels by Item dialog
    const [isMultiChannelDialogOpen, setIsMultiChannelDialogOpen] = useState<boolean>(false);
    const [multiChannelTargetItemId, setMultiChannelTargetItemId] = useState<string>("");

    function openMultiChannelDialog(itemId?: string) {
        if (itemId) {
            setMultiChannelTargetItemId(itemId);
        } else {
            setMultiChannelTargetItemId("");
        }
        setIsMultiChannelDialogOpen(true);
    }

    /** Opens the confirmation dialog for one row action. */
    function askToConfirm(mode: "add" | "remove", itemId: string) {
        setConfirmAction({ mode, itemId });
        setIsConfirmOpen(true);
    }

    const {
        data: salesChannels = [],
        isLoading: channelsLoading,
        refetch: refetchChannels,
    } = useGetSalesChannelsQuery();

    // Published mapping: channel code -> set of item IDs
    const [publishedMap, setPublishedMap] = useState<Record<string, Set<string>>>({
        ONLINE: new Set(["item-coca", "item-iphone", "item-lenovo", "item-macbook"]),
        POS: new Set(["item-lenovo", "item-macbook"]),
    });

    const [itemsList, setItemsList] = useState<InventoryItem[]>(MOCK_INVENTORY_ITEMS);

    // Dialog State
    const [isMultiChannelDialogOpen, setIsMultiChannelDialogOpen] = useState<boolean>(false);
    const [multiChannelTargetItemId, setMultiChannelTargetItemId] = useState<string>("");

    // Destructive Remove State
    const [removeItemId, setRemoveItemId] = useState<string | null>(null);

    function openMultiChannelDialog(itemId?: string) {
        setMultiChannelTargetItemId(itemId || "");
        setIsMultiChannelDialogOpen(true);
    }

    function handleToggleChannelState(itemId: string, channelCode: string) {
        setPublishedMap((prev) => {
            const currentSet = new Set(prev[channelCode] || []);
            if (currentSet.has(itemId)) {
                currentSet.delete(itemId);
            } else {
                currentSet.add(itemId);
            }
            return { ...prev, [channelCode]: currentSet };
        });
    }

    function handleRemoveItem(itemId: string) {
        setRemoveItemId(itemId);
    }

    function confirmRemoveItem() {
        if (!removeItemId) return;

        setPublishedMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((code) => {
                const s = new Set(next[code]);
                s.delete(removeItemId);
                next[code] = s;
            });
            return next;
        });

        toast({
            tone: "info",
            title: "Item removed from all sales channels",
        });

        setRemoveItemId(null);
    }

    const itemToRemove = useMemo(
        () => itemsList.find((i) => i.id === removeItemId),
        [itemsList, removeItemId]
    );

    return (
        <main className="w-full space-y-6">
            <InventoryPageHeader
                title="Sales Channels"
                description="Choose which items are sold on each sales channel, or assign items to multiple channels at once."
            />

            {/* Only channels the backend actually has. Nothing can be sold on
                a channel we invented, so none are drawn for show. */}
            {!channelsLoading && activeChannels.length === 0 ? (
                <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-10 text-center shadow-xs dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 dark:bg-[#00932a]/20 text-primary">
                        <ShoppingBag
                            className="size-6"
                            aria-hidden="true"
                        />
                    </span>
                    <h2 className="text-base font-semibold text-[#161d16] dark:text-[#f8fafc]">
                        No sales channels yet
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-[#657064] dark:text-[#94a3b8]">
                        Items can only be sold once a sales channel exists. Add
                        one on the backend, then refresh.
                    </p>
                    <button
                        type="button"
                        onClick={() => refetchChannels()}
                        className="mt-4 inline-flex items-center rounded-lg border border-[#c9cbc6] dark:border-[#384252] bg-white dark:bg-[#1e2330] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-[#f4f5f3] dark:hover:bg-[#252a38] shadow-xs"
                    >
                        Refresh
                    </button>
                </section>
            ) : (
                <>
                <ChannelMatrixTable
                    channels={activeChannels}
                    inventoryItems={activeInventoryItems}
                    inventoryLoading={inventoryLoading}
                    onRefresh={() => refetchChannels()}
                    onManageItemChannels={(itemId) => openMultiChannelDialog(itemId)}
                    onRemoveItemFromChannels={(itemId) => askToConfirm("remove", itemId)}
                    onOpenMultiChannelDialog={(itemId) => openMultiChannelDialog(itemId)}
                />
                </>
            )}

            {/* Multi-Channel Publish Modal */}
            <MultiChannelPublishDialog
                open={isMultiChannelDialogOpen}
                onClose={() => setIsMultiChannelDialogOpen(false)}
                inventoryItems={itemsList}
                salesChannels={MOCK_SALES_CHANNELS}
                initialItemId={multiChannelTargetItemId}
                onSuccess={(targetId, channelIds) => {
                    if (targetId && channelIds) {
                        setPublishedMap((prev) => {
                            const next = { ...prev };
                            MOCK_SALES_CHANNELS.forEach((ch) => {
                                const set = new Set(next[ch.code] || []);
                                if (channelIds.includes(ch.id)) {
                                    set.add(targetId);
                                } else {
                                    set.delete(targetId);
                                }
                                next[ch.code] = set;
                            });
                            return next;
                        });
                    }
                }}
            />

            <MultiChannelPublishDialog
                open={isMultiChannelDialogOpen}
                onClose={() => setIsMultiChannelDialogOpen(false)}
                inventoryItems={activeInventoryItems}
                salesChannels={activeChannels}
                initialItemId={multiChannelTargetItemId}
                onSuccess={() => refetchChannels()}
            />

            <DestructiveConfirmDialog
                open={Boolean(removeItemId)}
                onOpenChange={(open) => {
                    if (!open) setRemoveItemId(null);
                }}
                tone="danger"
                title="Remove from sales channels?"
                description={
                    <>
                        <strong className="font-semibold text-foreground">
                            {itemToRemove?.name || "This item"}
                        </strong>{" "}
                        will be removed from all assigned sales channels. You can assign it back at any time.
                    </>
                }
                confirmLabel="Remove Item"
                isPending={false}
                onConfirm={confirmRemoveItem}
            />
        </main>
    );
}
