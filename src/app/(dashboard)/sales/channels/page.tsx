"use client";

import { useMemo, useState } from "react";
import { Store, ShoppingBag } from "lucide-react";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ChannelMatrixTable } from "@/components/menu/ChannelMatrixTable";
import { MultiChannelPublishDialog } from "@/components/menu/MultiChannelPublishDialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useGetInventoryItemOptionsQuery } from "@/services/inventoryApi";
import { useGetSalesChannelsQuery } from "@/services/salesChannelApi";
import { ChannelSelector } from "@/components/menu/ChannelSelector";
import { PostChannelDialog } from "@/components/menu/PostChannelDialog";
import { ItemChannelTable } from "@/components/menu/ItemChannelTable";
import { ChannelHeader } from "@/components/menu/ChannelHeader";
import {
    useCreateItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetChannelItemsQuery,
    useGetSalesChannelsQuery,
} from "@/services/salesChannelApi";
import type { InventoryItem } from "@/lib/api/inventory";

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
};

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
    
    const [confirmAction, setConfirmAction] = useState<{
        mode: "add" | "remove";
        itemId: string;
    } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

    // State for Select Channels by Item dialog
    const [isMultiChannelDialogOpen, setIsMultiChannelDialogOpen] = useState<boolean>(false);
    const [multiChannelTargetItemId, setMultiChannelTargetItemId] = useState<string>("");

    // Destructive Remove State
    const [removeItemId, setRemoveItemId] = useState<string | null>(null);

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

    // Queries
    const {
        data: salesChannels = [],
        isLoading: channelsLoading,
        refetch: refetchChannels,
    } = useGetSalesChannelsQuery();

    const { data: inventoryItems = [], isLoading: inventoryLoading } =
        useGetInventoryItemOptionsQuery();

    const activeChannels = useMemo(
        () => salesChannels.filter((c) => c.isActive),
        [salesChannels]
    );

    const activeInventoryItems = useMemo(
        () => (inventoryItems.length > 0 ? inventoryItems : MOCK_INVENTORY_ITEMS),
        [inventoryItems]
    );

    // Published mapping: channel code -> set of item IDs
    const [publishedMap, setPublishedMap] = useState<Record<string, Set<string>>>({
        ONLINE: new Set(["item-coca", "item-iphone", "item-lenovo", "item-macbook"]),
        POS: new Set(["item-lenovo", "item-macbook"]),
    });

    const activeChannels = useMemo(
        () => salesChannels.filter((c) => c.active !== false),
        [salesChannels],
    );

    // Multi-Channel Publish Dialog state
    const [isMultiChannelDialogOpen, setIsMultiChannelDialogOpen] = useState<boolean>(false);
    const [multiChannelTargetItemId, setMultiChannelTargetItemId] = useState<string>("");

    // Destructive Remove State
    const [removeItemId, setRemoveItemId] = useState<string | null>(null);

    function openMultiChannelDialog(itemId?: string) {
        setMultiChannelTargetItemId(itemId || "");
        setIsMultiChannelDialogOpen(true);
    }

    const itemToRemove = useMemo(
        () => inventoryItems.find((i) => i.id === removeItemId),
        [inventoryItems, removeItemId],
    );
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
        toast({
            tone: "info",
            title: "Item removed from all sales channels",
        });
        setRemoveItemId(null);
        refetchChannels();
    }

    const itemToRemove = useMemo(
        () => activeInventoryItems.find((i) => i.id === removeItemId),
        [activeInventoryItems, removeItemId]
    );

    return (
        <main className="w-full space-y-6">
            <InventoryPageHeader
                title="Sales Channels"
                description="Choose which items are sold on each sales channel, or assign items to multiple channels at once."
            />

            {!channelsLoading && activeChannels.length === 0 ? (
                <section className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
                    <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <ShoppingBag
                            className="size-6"
                            aria-hidden="true"
                        />
                    </span>
                    <h2 className="text-base font-semibold text-foreground">
                        No sales channels yet
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        Items can only be sold once a sales channel exists. Add
                        one on the backend, then refresh.
                    </p>
                    <button
                        type="button"
                        onClick={() => refetchChannels()}
                        className="mt-4 inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-muted shadow-xs cursor-pointer"
                    >
                        Refresh
                    </button>
                </section>
            ) : (
                <ChannelMatrixTable
                    channels={activeChannels}
                    inventoryItems={inventoryItems}
                    inventoryLoading={inventoryLoading}
                    onRefresh={() => refetchChannels()}
                    onManageItemChannels={(itemId) => openMultiChannelDialog(itemId)}
                    onRemoveItemFromChannels={(itemId) => setRemoveItemId(itemId)}
                    onOpenMultiChannelDialog={(itemId) => openMultiChannelDialog(itemId)}
                />
            )}

            {/* Multi-Channel Publish Modal */}
            <MultiChannelPublishDialog
                open={isMultiChannelDialogOpen}
                onClose={() => setIsMultiChannelDialogOpen(false)}
                inventoryItems={inventoryItems}
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
