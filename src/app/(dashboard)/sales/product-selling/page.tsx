"use client";

import { useMemo, useState } from "react";
import { Globe, Send, ShoppingBag, Store, MessageSquare } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetInventoryItemsQuery } from "@/services/inventoryApi";
import { ChannelSelector } from "./components/ChannelSelector";
import { PostChannelDialog } from "./components/PostChannelDialog";
import { ProductChannelTable } from "./components/ProductChannelTable";
import { ProductSellingHeader } from "./components/ProductSellingHeader";
import { useCreateItemChannelMutation, useGetSalesChannelsQuery } from "@/services/salesChannelApi";
import type { SalesChannelCode } from "@/lib/api/sales-channels";

// Default preset channel fallback metadata
const CHANNEL_METADATA: Record<
    string,
    { name: string; description: string; icon: React.ElementType; color: string }
> = {
    POS: {
        name: "Point of Sale (POS)",
        description: "Products visible & available for in-store checkout on POS counters.",
        icon: Store,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    TELEGRAM: {
        name: "Telegram Bot / Store",
        description: "Products synchronized to Telegram shop channel & bot catalog.",
        icon: Send,
        color: "bg-sky-50 text-sky-700 border-sky-200",
    },
    MESSENGER: {
        name: "Facebook Messenger",
        description: "Products enabled for chat commerce & customer messaging orders.",
        icon: MessageSquare,
        color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    WEB: {
        name: "Web E-Commerce Store",
        description: "Products published on public website online store.",
        icon: Globe,
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
};

export default function ProductSellingPage() {
    const { toast } = useToast();
    const [activeChannelCode, setActiveChannelCode] = useState<string>("POS");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedItemId, setSelectedItemId] = useState<string>("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);

    // RTK Query hooks
    const {
        data: salesChannels = [],
        isLoading: channelsLoading,
        refetch: refetchChannels,
    } = useGetSalesChannelsQuery();
    const { data: inventoryItems = [], isLoading: inventoryLoading } = useGetInventoryItemsQuery();

    const [createItemChannel, { isLoading: isPosting }] = useCreateItemChannelMutation();

    // Map active sales channels
    const activeChannels = useMemo(() => {
        return salesChannels.filter((c) => c.isActive);
    }, [salesChannels]);

    // Active channel selected by channel code
    const selectedSalesChannel = useMemo(() => {
        if (!activeChannels.length) return null;
        return (
            activeChannels.find((c) => c.code.toUpperCase() === activeChannelCode.toUpperCase()) ||
            activeChannels[0]
        );
    }, [activeChannels, activeChannelCode]);

    // Available channel metadata
    const activeChannelMeta = useMemo(() => {
        const codeUpper = (selectedSalesChannel?.code || activeChannelCode).toUpperCase();
        const meta = CHANNEL_METADATA[codeUpper];
        return {
            name: selectedSalesChannel?.name || meta?.name || codeUpper,
            description: meta?.description || `Channel ${codeUpper}`,
            icon: meta?.icon || ShoppingBag,
            color: meta?.color || "bg-gray-50 text-gray-700 border-gray-200",
        };
    }, [selectedSalesChannel, activeChannelCode]);

    // Filter active inventory items
    const activeInventoryItems = useMemo(() => {
        return inventoryItems.filter((item) => item.status === "ACTIVE");
    }, [inventoryItems]);

    // Filter items by search query
    const filteredInventoryItems = useMemo(() => {
        if (!searchQuery.trim()) return activeInventoryItems;
        const q = searchQuery.toLowerCase();
        return activeInventoryItems.filter(
            (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q),
        );
    }, [activeInventoryItems, searchQuery]);

    // Handle posting an item channel: POST /api/v1/item-channels { itemId, salesChannelId }
    async function handlePostItem(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedItemId || !selectedSalesChannel) {
            toast({ tone: "error", title: "Select a product and a sales channel." });
            return;
        }

        try {
            await createItemChannel({
                itemId: selectedItemId,
                salesChannelId: selectedSalesChannel.id,
            }).unwrap();

            toast({
                tone: "success",
                title: "Product Posted Successfully",
                description: `Item has been linked to channel ${selectedSalesChannel.name}.`,
            });

            setSelectedItemId("");
            setIsAddDialogOpen(false);
        } catch (error) {
            toast({
                tone: "error",
                title: `Failed to post product to ${selectedSalesChannel.name}`,
                description: getApiErrorMessage(error, "Please check backend connection and try again."),
            });
        }
    }

    return (
        <main className="w-full space-y-6">
            <ProductSellingHeader
                title="Product Selling Channels"
                description="Post and manage product relationships per sales channel using Item Channel controllers."
                selectedChannelCode={selectedSalesChannel?.code}
                activeChannelCode={activeChannelCode}
                onOpenDialog={() => setIsAddDialogOpen(true)}
                disabled={!selectedSalesChannel || channelsLoading}
            />

            <ChannelSelector
                channels={activeChannels.length ? activeChannels : [
                    { id: "1", name: "Point of Sale", code: "POS" as SalesChannelCode, isActive: true },
                    { id: "2", name: "Telegram Bot", code: "TELEGRAM" as SalesChannelCode, isActive: true },
                    { id: "3", name: "Messenger", code: "MESSENGER" as SalesChannelCode, isActive: true },
                    { id: "4", name: "Web Store", code: "WEB" as SalesChannelCode, isActive: true },
                ]}
                activeChannelCode={activeChannelCode}
                selectedChannelCode={selectedSalesChannel?.code}
                onSelectChannel={setActiveChannelCode}
            />

            <ProductChannelTable
                activeChannelCode={activeChannelCode}
                selectedChannelCode={selectedSalesChannel?.code}
                searchQuery={searchQuery}
                inventoryLoading={inventoryLoading}
                inventoryItems={filteredInventoryItems}
                onSearchChange={setSearchQuery}
                onRefresh={() => refetchChannels()}
                // onPostItem={(itemId) => {
                //     setSelectedItemId(itemId);
                //     setIsAddDialogOpen(true);
                // }}
            />

            <PostChannelDialog
                open={isAddDialogOpen}
                title={`Post Product to ${activeChannelMeta.name}`}
                selectedChannelName={selectedSalesChannel?.name || activeChannelMeta.name}
                selectedChannelId={selectedSalesChannel?.id}
                selectedItemId={selectedItemId}
                inventoryItems={activeInventoryItems}
                inventoryLoading={inventoryLoading}
                isPosting={isPosting}
                onClose={() => setIsAddDialogOpen(false)}
                onSelectItem={setSelectedItemId}
                onSubmit={handlePostItem}
            />
        </main>
    );
}
