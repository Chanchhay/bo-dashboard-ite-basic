"use client";

import { useMemo, useState } from "react";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { ShoppingBag, MapPin, ImageOff } from "lucide-react";
import SearchBar from "@/components/menu/search-bar";
import ThemeToggle from "@/components/dark-mode/theme-toggle";
import Image from "next/image";
import {
  ItemPreviewDialog,
  toPreviewItem,
  type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
import { itemThumbnail } from "@/lib/api/inventory";

export type MenuItemEntry = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  rawItem: any;
};

export default function PublicMenuClient({
  storeDetail,
  storeItems,
}: {
  storeDetail: any;
  storeItems: any[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Category");
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  // Map store items strictly
  const items = useMemo<MenuItemEntry[]>(() => {
    return storeItems.map((raw) => {
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
  }, [storeItems]);

  // Extract categories dynamically
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200 pb-20">

      {/* Header / Banner */}
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-gray-800/80 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              {storeDetail.logo ? (
                <img
                  src={storeDetail.logo}
                  alt={storeDetail.displayName || storeDetail.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md shrink-0">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-400">
                    {(storeDetail.displayName || storeDetail.name)?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 truncate">
                  {storeDetail.displayName || storeDetail.name}
                </h1>
                <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm truncate">
                    {storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                  </span>
                </div>
              </div>
            </div>

            <ThemeToggle
              variant="icon"
              className="size-10 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 w-full min-w-[200px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search......"
              className="max-w-none sm:max-w-none"
            />
          </div>
          <div className="w-full sm:w-auto shrink overflow-hidden max-w-full">
            <CategoryFilter
              categories={categories.length > 0 ? categories : undefined}
              selectedCategory={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>

        {/* Product Menu Grid */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No Items Found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                No items match your search or category filter.
              </p>
              {(searchQuery || selectedCategory !== "All Category") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All Category");
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
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
                  image={item.image as string}
                  onClick={(e) => {
                    e.preventDefault();
                    setPreviewItem(toPreviewItem(item.rawItem));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ItemPreviewDialog
        open={previewItem !== null}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
        hideAddToCart={true}
      />
    </div>
  );
}
