"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StoreProvider from "@/app/StoreProvider";
import MenuNavbar from "@/components/menu/menu-navbar";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { MenuCardSkeleton, CategoryFilterSkeleton } from "@/components/ui/skeleton";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import { itemThumbnail, type InventoryItem } from "@/lib/api/inventory";
import { ShoppingBag } from "lucide-react";

export type MenuItemEntry = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rawItem: InventoryItem;
};

function StaticMenuContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Category");
  const router = useRouter();

  // Fetch POS sales channel published items
  const { data: channelItems = [], isLoading } = useGetChannelItemsQuery("POS");

  // Map POS channel items strictly from backend API
  const items = useMemo<MenuItemEntry[]>(() => {
    return channelItems.map((entry) => {
      const raw = entry.item as unknown as InventoryItem;
      // Falls back to an option's picture, so an item photographed only
      // through its colours still shows itself rather than a stock photo.
      const thumbnail = itemThumbnail(raw);

      return {
        id: raw.id,
        name: raw.name || "Unnamed Item",
        category: raw.itemGroup?.name || "General",
        price: raw.price ?? 0,
        image: thumbnail || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
        rawItem: raw,
      };
    });
  }, [channelItems]);

  // Extract categories dynamically from POS items
  const categories = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique);
  }, [items]);

  // Filter items by category & search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === "All Category" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.rawItem.code && item.rawItem.code.toLowerCase().includes(q)) ||
        (item.rawItem.barcode && item.rawItem.barcode.toLowerCase().includes(q)) ||
        (item.rawItem.sku && item.rawItem.sku.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleCardClick = (entry: MenuItemEntry) => {
    // Client-side soft navigation to /menu/[itemId]
    // Next.js will trigger the Intercepting Route @modal/(.)[itemId] -> Modal Popup!
    // On page refresh (F5), Next.js renders the full page /menu/[itemId]!
    router.push(`/menu/${entry.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Sticky Header with Search Bar */}
      <MenuNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        shopName="POS Menu"
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* Category Pills Filter Bar */}
        <CategoryFilter
          categories={categories.length > 0 ? categories : undefined}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
          isLoading={isLoading}
        />

        {/* Product Menu Grid */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <MenuCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1a1e29] py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No POS Items Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                No items match your search or category filter.
              </p>
              {(searchQuery || selectedCategory !== "All Category") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All Category");
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {filteredItems.map((item) => (
                <MenuCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  category={item.category}
                  price={item.price}
                  image={item.image}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StaticMenuPage() {
  return (
    <StoreProvider>
      <StaticMenuContent />
    </StoreProvider>
  );
}
