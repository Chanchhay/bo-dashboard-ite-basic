"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import StoreProvider from "@/app/StoreProvider";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import {
  ItemPreviewDialog,
  toPreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
import type { InventoryItem } from "@/lib/api/inventory";

function InterceptedModalContent({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { data: channelItems = [], isLoading } = useGetChannelItemsQuery("POS");

  const matchedEntry = channelItems.find(
    (entry) =>
      entry.item.id === itemId ||
      entry.item.code === itemId ||
      entry.item.sku === itemId
  );

  const previewItem = matchedEntry
    ? toPreviewItem(matchedEntry.item as unknown as InventoryItem)
    : null;

  const handleClose = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  return (
    <ItemPreviewDialog
      open={true}
      onOpenChange={handleClose}
      item={previewItem}
      hideAddToCart={true}
    />
  );
}

export default function InterceptedItemModalPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <StoreProvider>
      <InterceptedModalContent itemId={resolvedParams.itemId} />
    </StoreProvider>
  );
}
