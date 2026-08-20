"use client";

import { useMemo, useState } from "react";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { ShoppingBag, MapPin, ExternalLink } from "lucide-react";
import ThemeToggle from "@/components/dark-mode/theme-toggle";
import {
  ItemPreviewDialog,
  toPreviewItem,
  type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
import { itemThumbnail } from "@/lib/api/inventory";
import { useGetItemGroupsQuery } from "@/services/inventoryApi";

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
  const [selectedMainCategory, setSelectedMainCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  // Dynamically resolve store website / online ordering URL for ANY store or shop
  const orderUrl = useMemo(() => {
    if (storeDetail?.websiteUrl && storeDetail.websiteUrl.trim().length > 0) {
      return storeDetail.websiteUrl;
    }
    const slug =
      storeDetail?.slug ||
      storeDetail?.username ||
      storeDetail?.displayName?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") ||
      storeDetail?.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") ||
      "store";

    return `https://fluxibiz.store/store/${slug}`;
  }, [storeDetail]);

  // Fetch Item Groups from API if available
  const { data: itemGroups = [] } = useGetItemGroupsQuery();

  // Map store items strictly
  const items = useMemo<MenuItemEntry[]>(() => {
    return storeItems.map((raw) => {
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

  // Extract Categories from storeItems & itemGroups
  const categories = useMemo(() => {
    const set = new Set<string>();
    itemGroups.forEach((g) => {
      if (g.name) set.add(g.name);
    });
    items.forEach((item) => {
      if (item.category && item.category !== "General") {
        set.add(item.category);
      }
    });
    return Array.from(set);
  }, [itemGroups, items]);

  // Extract Subcategories from storeItems & itemGroups
  const subCategories = useMemo(() => {
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

  // Filter items by main category, subcategory & search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
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
  }, [items, selectedMainCategory, selectedSubCategory, searchQuery]);

  return (
    <div className="min-h-screen md:h-screen w-full md:overflow-hidden bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Public Menu Header / Banner */}
      <div className="shrink-0 bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-gray-800/80 transition-colors z-40">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              {storeDetail.logo ? (
                <img
                  src={storeDetail.logo}
                  alt={storeDetail.displayName || storeDetail.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white dark:border-gray-800 shadow-md bg-white shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 sm:border-4 border-white dark:border-gray-800 shadow-md shrink-0">
                  <span className="text-lg sm:text-2xl font-bold text-gray-400">
                    {(storeDetail.displayName || storeDetail.name)?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 truncate">
                  {storeDetail.displayName || storeDetail.name}
                </h1>
                <div className="flex items-center text-gray-500 dark:text-gray-400 gap-1 sm:gap-1.5">
                  <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
                  <span className="text-xs sm:text-sm truncate">
                    {storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Only One Order Now Button in Public Menu Banner */}
              <a
                href={orderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#00932a] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#00932a]/20 hover:bg-[#00932a]/90 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ShoppingBag className="size-4" />
                <span>Order Now</span>
                <ExternalLink className="size-3.5 opacity-80" />
              </a>

              <ThemeToggle
                variant="icon"
                className="size-9 sm:size-10 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main App Body Container matching /menu UI */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-4 sm:py-6 md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Desktop Fixed Left Sidebar Checkbox Filter */}
        <div className="hidden md:block w-56 lg:w-64 shrink-0 h-full overflow-y-auto pr-1 pb-8 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <CategoryFilter
            categories={categories}
            subCategories={subCategories}
            items={items as any}
            selectedCategory={selectedMainCategory}
            selectedSubCategory={selectedSubCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={(id) => {
              const matched = items.find((i) => String(i.id) === String(id));
              if (matched) setPreviewItem(toPreviewItem(matched.rawItem));
            }}
            onChange={setSelectedMainCategory}
            onSubCategoryChange={setSelectedSubCategory}
            onResetFilters={() => {
              setSearchQuery("");
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
            }}
          />
        </div>

        {/* Mobile Filter Drawer */}
        <div className="md:hidden shrink-0 w-full">
          <CategoryFilter
            categories={categories}
            subCategories={subCategories}
            items={items as any}
            selectedCategory={selectedMainCategory}
            selectedSubCategory={selectedSubCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={(id) => {
              const matched = items.find((i) => String(i.id) === String(id));
              if (matched) setPreviewItem(toPreviewItem(matched.rawItem));
            }}
            onChange={setSelectedMainCategory}
            onSubCategoryChange={setSelectedSubCategory}
            onResetFilters={() => {
              setSearchQuery("");
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
            }}
          />
        </div>

        {/* Right Area: Title Header + Scrollable Product Card Grid */}
        <div className="flex-1 w-full md:h-full min-w-0 flex flex-col space-y-4">
          {/* Title Header */}
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

          {/* Scrollable Product Menu Grid */}
          <div className="flex-1 md:overflow-y-auto pr-0 sm:pr-1 pb-16 scroll-smooth rounded-2xl [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1a1e29] py-16 text-center shadow-2xs">
                <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No Items Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                  No items match your search or category filter.
                </p>
                {(searchQuery || selectedMainCategory !== "All" || selectedSubCategory !== "All") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMainCategory("All");
                      setSelectedSubCategory("All");
                    }}
                    className="mt-4 rounded-xl bg-[#00932a] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#00932a]/90 transition-all cursor-pointer"
                  >
                    Reset Filters
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
        </div>
      </main>

      {/* Item Preview Modal Dialog for Public Menu */}
      <ItemPreviewDialog
        open={previewItem !== null}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
        hideAddToCart={true}
      />
    </div>
  );
}
