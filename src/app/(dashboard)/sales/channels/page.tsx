"use client";

import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ChannelMatrixTable } from "@/components/menu/ChannelMatrixTable";
import { MultiChannelPublishDialog } from "@/components/menu/MultiChannelPublishDialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useGetInventoryItemOptionsQuery } from "@/services/inventoryApi";
import { useGetSalesChannelsQuery } from "@/services/salesChannelApi";

export default function SalesChannelsPage() {
    const { toast } = useToast();

    // Queries
    const {
        data: salesChannels = [],
        isLoading: channelsLoading,
        refetch: refetchChannels,
    } = useGetSalesChannelsQuery();

    const {
        data: inventoryItems = [],
        isLoading: inventoryLoading,
    } = useGetInventoryItemOptionsQuery();

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

    function confirmRemoveItem() {
        if (!removeItemId) return;
        toast({
            tone: "info",
            title: "Item removed from all sales channels",
        });
        setRemoveItemId(null);
        refetchChannels();
    }

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
