"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Navbar,
  type PosCategoryOption,
} from "@/components/pos/navbar-pos/navbar";
import { PosScreen } from "@/components/pos/pos-screen";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import { usePosOffline } from "@/lib/offline/usePosOffline";
import type { ChannelItem } from "@/lib/api/sales-channels";

export interface PosTerminalProps {
  managerName: string;
  currentRegisterUser: { id: string; name: string } | null;
  registerCashSales?: number;
  /** Currency the till was counted in, fixed when it opened. */
  registerCurrency?: string;
}

export function PosTerminal({
  managerName,
  currentRegisterUser,
  registerCashSales,
  registerCurrency,
}: PosTerminalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const { isOnline, cacheCatalog, getCachedCatalog } = usePosOffline();
  const { data: remoteItems = [], isLoading } = useGetChannelItemsQuery("POS");
  const [cachedItems, setCachedItems] = useState<ChannelItem[]>([]);

  useEffect(() => {
    if (remoteItems && remoteItems.length > 0) {
      void cacheCatalog(remoteItems);
    }
  }, [remoteItems, cacheCatalog]);

  useEffect(() => {
    let isMounted = true;
    if (!isOnline || remoteItems.length === 0) {
      getCachedCatalog().then((items) => {
        if (isMounted && items && items.length > 0) {
          setCachedItems(items);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOnline, remoteItems.length, getCachedCatalog]);

  const channelItems = remoteItems.length > 0 ? remoteItems : cachedItems;

  const categories = useMemo<PosCategoryOption[]>(() => {
    const uniqueCategories = new Map<string, string>();

    for (const entry of channelItems) {
      const category = entry.item.itemGroup;

      if (category?.id && category.name) {
        uniqueCategories.set(category.id, category.name);
      }
    }

    return Array.from(uniqueCategories, ([id, name]) => ({ id, name })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
  }, [channelItems]);

  const activeCategoryId =
    selectedCategoryId === "ALL" ||
    categories.some((category) => category.id === selectedCategoryId)
      ? selectedCategoryId
      : "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId("ALL");
  };

  return (
    <section className="flex h-dvh flex-col overflow-hidden bg-[#f5f5f5]">
      <div className="shrink-0">
        <Navbar
          managerName={managerName}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          categories={categories}
          selectedCategoryId={activeCategoryId}
          onCategoryChange={setSelectedCategoryId}
        />
      </div>
      <main className="min-h-0 flex-1 overflow-hidden">
        <PosScreen
          channelItems={channelItems}
          isLoading={isLoading}
          searchQuery={searchQuery}
          selectedCategoryId={activeCategoryId}
          onClearFilters={clearFilters}
          onSearchQueryChange={setSearchQuery}
          categories={categories}
          onCategoryChange={setSelectedCategoryId}
          currentRegisterUser={currentRegisterUser}
          registerCashSales={registerCashSales}
          registerCurrency={registerCurrency}
        />
      </main>
    </section>
  );
}
