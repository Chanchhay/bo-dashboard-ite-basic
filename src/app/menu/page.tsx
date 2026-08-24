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
  const [selectedMainCategory, setSelectedMainCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");
  const router = useRouter();

  const { data: channelItems = [], isLoading: isItemsLoading } = useGetChannelItemsQuery("POS");
  const { data: itemGroups = [], isLoading: isGroupsLoading } = useGetItemGroupsQuery();

  const isLoading = isItemsLoading || isGroupsLoading;

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

  const businessOwnerCategories = useMemo<string[]>(() => {
    return itemGroups
      .map((g) => g.name || "")
      .filter((name) => name.trim().length > 0);
  }, [itemGroups]);

  const businessOwnerSubcategories = useMemo<string[]>(() => {
    const set = new Set<string>();

    if (selectedMainCategory !== "All" && selectedMainCategory !== "All Dishes") {
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

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = items.filter((item) => {
      const catName = item.category.toLowerCase();
      const itemName = item.name.toLowerCase();

      const mainSel = selectedMainCategory.toLowerCase();
      const matchMainCategory =
        mainSel === "all" ||
        mainSel === "all category" ||
        catName === mainSel ||
        catName.includes(mainSel) ||
        mainSel.includes(catName);

      const subSel = selectedSubCategory.toLowerCase();
      const matchSubCategory =
        subSel === "all" ||
        subSel === "all category" ||
        catName === subSel ||
        catName.includes(subSel) ||
        itemName.includes(subSel);

      let matchQuick = true;
      if (quickFilter === "popular") {
        matchQuick = item.price > 0 && item.price < 4.5;
      } else if (quickFilter === "under3") {
        matchQuick = item.price <= 3.0;
      }

      const matchSearch =
        !q ||
        itemName.includes(q) ||
        catName.includes(q) ||
        (item.rawItem.code && item.rawItem.code.toLowerCase().includes(q)) ||
        (item.rawItem.barcode && item.rawItem.barcode.toLowerCase().includes(q)) ||
        (item.rawItem.sku && item.rawItem.sku.toLowerCase().includes(q));

      return matchMainCategory && matchSubCategory && matchQuick && matchSearch;
    });

    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [items, selectedMainCategory, selectedSubCategory, quickFilter, sortBy, searchQuery]);

  const handleCardClick = (entry: MenuItemEntry) => {
    router.push(`/menu/${entry.id}`);
  };

  return (
    <div className="min-h-screen md:h-screen w-full md:overflow-hidden bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      <div className="shrink-0 w-full z-40">
        <MenuNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          shopName="POS Menu"
        />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-4 sm:py-6 md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <div className="hidden md:block w-56 lg:w-64 shrink-0 h-full overflow-y-auto pr-1 pb-8 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
              setQuickFilter("all");
              setSortBy("default");
            }}
            isLoading={isLoading}
          />
        </div>

        <div className="md:hidden shrink-0 w-full">
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
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
              setQuickFilter("all");
              setSortBy("default");
            }}
            isLoading={isLoading}
          />
        </div>

        <div className="flex-1 w-full md:h-full min-w-0 flex flex-col space-y-4">
          <div className="shrink-0 flex items-center justify-between border-b border-gray-200/80 dark:border-gray-800/80 pb-3 sm:pb-4">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {selectedMainCategory === "All"
                ? "All Products"
                : selectedSubCategory !== "All"
                ? `${selectedMainCategory} › ${selectedSubCategory}`
                : selectedMainCategory}
            </h2>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex-1 md:overflow-y-auto pr-0 sm:pr-1 pb-16 scroll-smooth rounded-2xl [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <MenuCardSkeleton key={n} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1a1e29] py-16 text-center shadow-2xs">
                <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No Items Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                  No products match your filter criteria or search keyword.
                </p>
                {(searchQuery || selectedMainCategory !== "All" || selectedSubCategory !== "All" || quickFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMainCategory("All");
                      setSelectedSubCategory("All");
                      setQuickFilter("all");
                      setSortBy("default");
                    }}
                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5 pt-1">
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
