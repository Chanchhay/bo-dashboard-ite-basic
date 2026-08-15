"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StoreProvider from "@/app/StoreProvider";
import MenuNavbar from "@/components/menu/menu-navbar";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { MenuCardSkeleton } from "@/components/ui/skeleton";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import { useGetItemGroupsQuery } from "@/services/inventoryApi";
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
  const [selectedMainCategory, setSelectedMainCategory] = useState("All Category");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");
  const router = useRouter();

  // Fetch POS sales channel published items
  const { data: channelItems = [], isLoading: isItemsLoading } = useGetChannelItemsQuery("POS");
  // Fetch Item Groups & Subcategories strictly from /inventory/config/groups
  const { data: itemGroups = [], isLoading: isGroupsLoading } = useGetItemGroupsQuery();

  const isLoading = isItemsLoading || isGroupsLoading;

  // Map POS channel items strictly from backend API
  const items = useMemo<MenuItemEntry[]>(() => {
    return channelItems.map((entry) => {
      const raw = entry.item as unknown as InventoryItem;
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

  // Extract Categories strictly from /inventory/config/groups (Item Groups)
  const businessOwnerCategories = useMemo<string[]>(() => {
    return itemGroups
      .map((g) => g.name || "")
      .filter((name) => name.trim().length > 0);
  }, [itemGroups]);

  // Extract Subcategories strictly from /inventory/config/groups (Item Sub-groups)
  const businessOwnerSubcategories = useMemo<string[]>(() => {
    const set = new Set<string>();

    if (selectedMainCategory !== "All" && selectedMainCategory !== "All Category") {
      const matchedGroup = itemGroups.find(
        (g) => g.name?.toLowerCase() === selectedMainCategory.toLowerCase()
      );
      if (matchedGroup && matchedGroup.subGroups) {
        matchedGroup.subGroups.forEach((sub) => {
          if (sub.name) set.add(sub.name);
        });
      }
    } else {
      itemGroups.forEach((g) => {
        (g.subGroups || []).forEach((sub) => {
          if (sub.name) set.add(sub.name);
        });
      });
    }

    return Array.from(set);
  }, [itemGroups, selectedMainCategory]);

  // Filter items strictly by configured Categories & Subcategories & Search Query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = items.filter((item) => {
      const catName = item.category.toLowerCase();
      const itemName = item.name.toLowerCase();

      // Main Category Match
      const mainSel = selectedMainCategory.toLowerCase();
      const matchMainCategory =
        mainSel === "all" ||
        mainSel === "all category" ||
        catName === mainSel ||
        catName.includes(mainSel) ||
        mainSel.includes(catName);

      // Subcategory Match
      const subSel = selectedSubCategory.toLowerCase();
      const matchSubCategory =
        subSel === "all" ||
        subSel === "all category" ||
        catName === subSel ||
        catName.includes(subSel) ||
        itemName.includes(subSel);

      // Search Match
      const matchSearch =
        !q ||
        itemName.includes(q) ||
        catName.includes(q) ||
        (item.rawItem.code && item.rawItem.code.toLowerCase().includes(q)) ||
        (item.rawItem.barcode && item.rawItem.barcode.toLowerCase().includes(q)) ||
        (item.rawItem.sku && item.rawItem.sku.toLowerCase().includes(q));

      return matchMainCategory && matchSubCategory && matchSearch;
    });

    // Sorting
    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [items, selectedMainCategory, selectedSubCategory, sortBy, searchQuery]);

  const handleCardClick = (entry: MenuItemEntry) => {
    router.push(`/menu/${entry.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Header Navbar (Unchanged) */}
      <MenuNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        shopName="POS Menu"
      />

      {/* 2. Page Content Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* Top Control Bar: Search Bar on left + Horizontal Category Pills on right */}
        <CategoryFilter
          categories={businessOwnerCategories}
          subCategories={businessOwnerSubcategories}
          items={items}
          selectedCategory={selectedMainCategory}
          selectedSubCategory={selectedSubCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onItemSelect={(id) => router.push(`/menu/${id}`)}
          quickFilter={quickFilter}
          sortBy={sortBy}
          onChange={setSelectedMainCategory}
          onSubCategoryChange={setSelectedSubCategory}
          onQuickFilterChange={setQuickFilter}
          onSortChange={setSortBy}
          onResetFilters={() => {
            setSearchQuery("");
            setSelectedMainCategory("All Category");
            setSelectedSubCategory("All");
            setQuickFilter("all");
            setSortBy("default");
          }}
          isLoading={isLoading}
        />

        {/* 3. Product Cards 4-Column Grid matching screenshot 100% */}
        <div className="w-full pt-2">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <MenuCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1a1e29] py-20 text-center shadow-2xs">
              <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No Items Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                No products match your filter criteria or search keyword.
              </p>
              {(searchQuery || selectedMainCategory !== "All Category" || selectedSubCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMainCategory("All Category");
                    setSelectedSubCategory("All");
                    setQuickFilter("all");
                    setSortBy("default");
                  }}
                  className="mt-4 rounded-xl bg-[#00932a] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#00932a]/90 transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
