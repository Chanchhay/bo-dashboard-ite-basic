"use client";

import { useMemo, useState } from "react";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ChannelMatrixTable } from "@/components/menu/ChannelMatrixTable";
import { MultiChannelPublishDialog, type SimpleSalesChannel } from "@/components/menu/MultiChannelPublishDialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { InventoryItem } from "@/lib/api/inventory";

const MOCK_SALES_CHANNELS: SimpleSalesChannel[] = [
    {
        id: "channel-online",
        name: "ONLINE STORE",
        code: "ONLINE",
        isActive: true,
    },
    {
        id: "channel-pos",
        name: "POINT OF SALE",
        code: "POS",
        isActive: true,
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

            {/* Matrix Table matching reference UI */}
            <ChannelMatrixTable
                channels={MOCK_SALES_CHANNELS}
                inventoryItems={itemsList}
                inventoryLoading={false}
                publishedState={publishedMap}
                onToggleChannelState={handleToggleChannelState}
                onRefresh={() => {
                    toast({
                        tone: "success",
                        title: "Refreshed sales channels data",
                    });
                }}
                onManageItemChannels={(itemId) => openMultiChannelDialog(itemId)}
                onRemoveItemFromChannels={(itemId) => handleRemoveItem(itemId)}
                onOpenMultiChannelDialog={(itemId) => openMultiChannelDialog(itemId)}
            />

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

            {/* Confirm Delete / Remove Dialog */}
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
