"use client";

import { useMemo, useState } from "react";
import StoreProvider from "@/app/StoreProvider";
import MenuNavbar from "@/components/menu/menu-navbar";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import { Filter, ShoppingBag } from "lucide-react";

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  code?: string;
  barcode?: string;
  sku?: string;
};

function StaticMenuContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Category");

  // Fetch POS sales channel published items
  const { data: channelItems = [], isLoading } = useGetChannelItemsQuery("POS");

  // Map POS channel items strictly from backend API
  const items = useMemo<MenuItem[]>(() => {
    return channelItems.map((entry) => {
      const thumbnail = [...(entry.item.images ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .find((img) => img.url)?.url;

      return {
        id: entry.item.id,
        name: entry.item.name || "Unnamed Item",
        category: entry.item.itemGroup?.name || "General",
        price: entry.item.price ?? 0,
        image: thumbnail || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
        code: entry.item.code || entry.item.id,
        barcode: entry.item.barcode || entry.item.sku || entry.item.code,
        sku: entry.item.sku,
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
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 flex flex-col font-sans">
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
        />

        {/* Product Menu Grid */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="flex flex-col gap-3 animate-pulse">
                  <div className="aspect-square w-full rounded-[28px] bg-gray-200" />
                  <div className="h-4 w-1/3 bg-gray-200 rounded-md" />
                  <div className="h-5 w-2/3 bg-gray-200 rounded-md" />
                  <div className="h-5 w-1/4 bg-gray-200 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <ShoppingBag className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-800">No POS Items Found</h3>
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
                  image={item.image}
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
