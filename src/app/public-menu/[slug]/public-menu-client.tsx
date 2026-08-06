"use client";

import { useMemo, useState } from "react";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { ShoppingBag, MapPin, ImageOff } from "lucide-react";
import MenuNavbar from "@/components/menu/menu-navbar";
import Image from "next/image";

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

  // Map store items strictly
  const items = useMemo<MenuItemEntry[]>(() => {
    return storeItems.map((raw) => {
      const sortedImages = [...(raw.images ?? [])].sort(
        (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
      );
      const thumbnail = sortedImages.find((img: any) => img.url)?.url;

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
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 text-gray-900 flex flex-col font-sans pb-20">
      {/* Menu Navbar */}
      <MenuNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        shopName={storeDetail.displayName || storeDetail.name}
      />

      {/* Header / Banner */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-6">
            {storeDetail.logo ? (
              <img
                src={storeDetail.logo}
                alt={storeDetail.displayName || storeDetail.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md">
                <span className="text-3xl font-bold text-gray-400">
                  {(storeDetail.displayName || storeDetail.name)?.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {storeDetail.displayName || storeDetail.name}
              </h1>
              <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* Category Pills Filter Bar */}
        <CategoryFilter
          categories={categories.length > 0 ? categories : undefined}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
        />

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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
