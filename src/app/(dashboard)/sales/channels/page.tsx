"use client";

import { useMemo, useState } from "react";
import { Globe, Send, ShoppingBag, Store, MessageSquare } from "lucide-react";

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
    TELEGRAM: {
        name: "Telegram Bot / Store",
        description: "Items synced to your Telegram shop and bot catalog.",
        icon: Send,
        color: "bg-sky-50 text-sky-700 border-sky-200",
    },
    MESSENGER: {
        name: "Facebook Messenger",
        description: "Items available for chat orders in Messenger.",
        icon: MessageSquare,
        color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    // Seeded by the backend as ONLINE; WEB kept as an alias for older rows.
    ONLINE: {
        name: "Online Store",
        description: "Items published to your public web store.",
        icon: Globe,
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    WEB: {
        name: "Web E-Commerce Store",
        description: "Items published to your public web store.",
        icon: Globe,
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
};

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

    // The options endpoint answers with a plain array of sellable items, which
    // is what a picker needs — the paged `getInventoryItems` returns a page.
    const { data: inventoryItems = [], isLoading: inventoryLoading } =
        useGetInventoryItemOptionsQuery();

    const [createItemChannel, { isLoading: isPosting }] =
        useCreateItemChannelMutation();
    const [deleteItemChannel] = useDeleteItemChannelMutation();

    const activeChannels = useMemo(
        () => salesChannels.filter((channel) => channel.isActive),
        [salesChannels],
    );

    // Falls back to the first real channel so a stale code from a previous
    // visit never leaves the page pointing at nothing.
    const selectedSalesChannel = useMemo(() => {
        if (!activeChannels.length) return null;

        return (
            activeChannels.find(
                (channel) =>
                    channel.code.toUpperCase() ===
                    activeChannelCode.toUpperCase(),
            ) ?? activeChannels[0]
        );
    }, [activeChannels, activeChannelCode]);

    // Which items are already on this channel. Skipped until a channel exists,
    // so we never ask the backend about a channel code we invented.
    const { data: channelItems = [], isFetching: channelItemsLoading } =
        useGetChannelItemsQuery(selectedSalesChannel?.code ?? "", {
            skip: !selectedSalesChannel,
        });

    // itemId -> the link that put it on this channel, which is what removing
    // it needs. The listing carries both, so no extra lookup per row.
    const itemChannelIds = useMemo(
        () =>
            new Map(
                channelItems.map((entry) => [
                    entry.item.id,
                    entry.itemChannelId,
                ]),
            ),
        [channelItems],
    );

    const publishedItemIds = useMemo(
        () => new Set(itemChannelIds.keys()),
        [itemChannelIds],
    );

    const activeChannelMeta = useMemo(() => {
        const codeUpper = (
            selectedSalesChannel?.code ?? activeChannelCode
        ).toUpperCase();
        const meta = CHANNEL_METADATA[codeUpper];

        return {
            name: selectedSalesChannel?.name ?? meta?.name ?? codeUpper,
            description: meta?.description ?? `Channel ${codeUpper}`,
            icon: meta?.icon ?? ShoppingBag,
            color: meta?.color ?? "bg-gray-50 text-gray-700 border-gray-200",
        };
    }, [selectedSalesChannel, activeChannelCode]);

    const activeInventoryItems = useMemo(
        () => inventoryItems.filter((item) => item.status === "ACTIVE"),
        [inventoryItems],
    );

    const filteredInventoryItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return activeInventoryItems;

        return activeInventoryItems.filter(
            (item) =>
                item.name?.toLowerCase().includes(query) ||
                item.code?.toLowerCase().includes(query) ||
                item.sku?.toLowerCase().includes(query),
        );
    }, [activeInventoryItems, searchQuery]);

    /** Publishes one item to the selected channel. */
    async function publishItem(itemId: string) {
        if (!selectedSalesChannel) {
            toast({ tone: "error", title: "No sales channel to publish to." });
            return;
        }

        setPendingItemId(itemId);

        try {
            await createItemChannel({
                itemId,
                salesChannelId: selectedSalesChannel.id,
            }).unwrap();

            toast({
                tone: "success",
                title: `Added to ${selectedSalesChannel.name}`,
            });

            setSelectedItemId("");
            setIsAddDialogOpen(false);
        } catch (error) {
            toast({
                tone: "error",
                title: `Could not add to ${selectedSalesChannel.name}`,
                description: getApiErrorMessage(
                    error,
                    "Please try again.",
                ),
            });
        } finally {
            setPendingItemId("");
        }
    }

    /** Removes one item from the selected channel. */
    async function unpublishItem(itemId: string) {
        if (!selectedSalesChannel) return;

        const itemChannelId = itemChannelIds.get(itemId);

        if (!itemChannelId) {
            toast({
                tone: "error",
                title: "That item is no longer on this channel.",
            });
            return;
        }

        setPendingItemId(itemId);

        try {
            await deleteItemChannel(itemChannelId).unwrap();

            toast({
                tone: "success",
                title: `Removed from ${selectedSalesChannel.name}`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: `Could not remove from ${selectedSalesChannel.name}`,
                description: getApiErrorMessage(error, "Please try again."),
            });
        } finally {
            setPendingItemId("");
        }
    }

    const confirmItem = useMemo(
        () =>
            confirmAction
                ? activeInventoryItems.find(
                      (item) => item.id === confirmAction.itemId,
                  )
                : undefined,
        [confirmAction, activeInventoryItems],
    );

    /** Runs the action the confirmation dialog was opened for. */
    async function handleConfirmAction() {
        if (!confirmAction) return;

        const { mode, itemId } = confirmAction;

        if (mode === "add") {
            await publishItem(itemId);
        } else {
            await unpublishItem(itemId);
        }

        setIsConfirmOpen(false);
    }

    async function handlePostItem(event: React.FormEvent) {
        event.preventDefault();

        if (!selectedItemId) {
            toast({ tone: "error", title: "Select an item first." });
            return;
        }

        await publishItem(selectedItemId);
    }

    return (
        <main className="w-full space-y-6">
            <ChannelHeader
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

            <PostChannelDialog
                open={isAddDialogOpen}
                title={`Add item to ${activeChannelMeta.name}`}
                selectedChannelName={
                    selectedSalesChannel?.name ?? activeChannelMeta.name
                }
                selectedItemId={selectedItemId}
                inventoryItems={activeInventoryItems}
                inventoryLoading={inventoryLoading}
                isPosting={isPosting}
                onClose={() => setIsAddDialogOpen(false)}
                onSelectItem={setSelectedItemId}
                onSubmit={handlePostItem}
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
                open={isConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) setIsConfirmOpen(false);
                }}
                tone={confirmAction?.mode === "remove" ? "danger" : "info"}
                title={
                    confirmAction?.mode === "remove"
                        ? "Remove from this channel?"
                        : "Add to this channel?"
                }
                description={
                    confirmAction?.mode === "remove" ? (
                        <>
                            <strong className="font-semibold text-foreground">
                                {confirmItem?.name || "This item"}
                            </strong>{" "}
                            will no longer be sold on{" "}
                            {selectedSalesChannel?.name ??
                                activeChannelMeta.name}
                            . You can add it back at any time.
                        </>
                    ) : (
                        <>
                            <strong className="font-semibold text-foreground">
                                {confirmItem?.name || "This item"}
                            </strong>{" "}
                            becomes available to sell on{" "}
                            {selectedSalesChannel?.name ??
                                activeChannelMeta.name}{" "}
                            straight away.
                        </>
                    )
                }
                confirmLabel={
                    confirmAction?.mode === "remove" ? "Remove" : "Add item"
                }
                pendingLabel={
                    confirmAction?.mode === "remove" ? "Removing…" : "Adding…"
                }
                isPending={Boolean(
                    confirmAction && pendingItemId === confirmAction.itemId,
                )}
                onConfirm={handleConfirmAction}
            />
        </main>
    );
}
