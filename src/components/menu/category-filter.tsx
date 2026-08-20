"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { CategoryFilterSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SubCategory = {
  id: string;
  name: string;
};

export type MainCategory = {
  id: string;
  name: string;
  subcategories?: SubCategory[];
};

export type SearchItemEntry = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
};

type ExactSidebarFilterProps = {
  mainCategories?: MainCategory[];
  categories?: string[];
  subCategories?: string[];
  items?: SearchItemEntry[];
  selectedCategory?: string;
  selectedSubCategory?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onItemSelect?: (id: string) => void;
  quickFilter?: string;
  sortBy?: "default" | "price-asc" | "price-desc";
  onChange?: (category: string) => void;
  onSubCategoryChange?: (subCategory: string) => void;
  onQuickFilterChange?: (filter: string) => void;
  onSortChange?: (sort: "default" | "price-asc" | "price-desc") => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
};

export default function CategoryFilter({
  mainCategories,
  categories = [],
  subCategories = [],
  items = [],
  selectedCategory = "All",
  selectedSubCategory = "All",
  searchQuery = "",
  onSearchChange,
  onItemSelect,
  onChange,
  onSubCategoryChange,
  onResetFilters,
  isLoading = false,
}: ExactSidebarFilterProps) {
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showMoreSubcategories, setShowMoreSubcategories] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Close search modal on Esc key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchModalOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Take Item Groups created by Business Owner in Inventory Config
  const categoryList: string[] = useMemo(() => {
    const list = categories.filter((c) => c !== "All" && c !== "All Dishes");
    if (mainCategories && mainCategories.length > 0) {
      mainCategories.forEach((m) => {
        if (!list.includes(m.name) && m.name !== "All" && m.name !== "All Dishes") {
          list.push(m.name);
        }
      });
    }
    return ["All", ...list];
  }, [categories, mainCategories]);

  // Take Subcategories created under Item Groups by Business Owner
  const subcategoryList: string[] = useMemo(() => {
    const list = subCategories.filter((s) => s !== "All" && s !== "All Subcategories");
    return ["All", ...list];
  }, [subCategories]);

  // Live search results matching query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const INITIAL_VISIBLE_COUNT = 5;

  const visibleCategories = showMoreCategories
    ? categoryList
    : categoryList.slice(0, INITIAL_VISIBLE_COUNT);

  const visibleSubcategories = showMoreSubcategories
    ? subcategoryList
    : subcategoryList.slice(0, INITIAL_VISIBLE_COUNT);

  const isFiltered =
    selectedCategory !== "All" ||
    selectedSubCategory !== "All" ||
    searchQuery.trim().length > 0;

  if (isLoading) {
    return <CategoryFilterSkeleton />;
  }

  const FilterMarkup = (
    <div className="w-full text-gray-900 dark:text-gray-100 font-sans space-y-5">
      {/* 🔍 Circular Search Button above Filters */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setSearchModalOpen(true);
            setMobileOpen(false);
          }}
          className="size-11 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1e29] shadow-2xs hover:border-[#00932a] hover:bg-gray-50 dark:hover:bg-gray-800/80 flex items-center justify-center transition-all cursor-pointer group"
          aria-label="Search items"
        >
          <SearchIcon className="size-5 text-gray-700 dark:text-gray-200 group-hover:text-[#00932a] transition-colors" />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-bold text-[#00932a] hover:underline cursor-pointer md:hidden"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sidebar Heading */}
      <div className="flex items-baseline justify-between border-b border-gray-200 dark:border-gray-800/80 pb-3">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Filters
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="hidden md:inline-block text-xs font-semibold text-[#00932a] hover:underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: ITEM GROUPS / CATEGORIES
         ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-800/80 pb-5 space-y-3">
        <h3 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
          Categories
        </h3>

        <div className="space-y-2">
          {visibleCategories.map((cat) => {
            const isChecked =
              cat.toLowerCase() === selectedCategory.toLowerCase();

            return (
              <label
                key={cat}
                onClick={() => {
                  onChange?.(cat);
                }}
                className="flex items-center gap-3 py-1 px-1 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer select-none group active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
              >
                <div
                  className={cn(
                    "size-4 rounded border transition-all flex items-center justify-center shrink-0",
                    isChecked
                      ? "bg-[#00932a] border-[#00932a] text-white"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1e29] group-hover:border-[#00932a]"
                  )}
                >
                  {isChecked && <Check className="size-3 stroke-[3]" />}
                </div>
                <span className={cn("truncate", isChecked && "font-bold text-[#00932a] dark:text-emerald-400")}>
                  {cat}
                </span>
              </label>
            );
          })}
        </div>

        {categoryList.length > INITIAL_VISIBLE_COUNT && (
          <button
            type="button"
            onClick={() => setShowMoreCategories(!showMoreCategories)}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 pt-1 cursor-pointer"
          >
            <span>{showMoreCategories ? "Less" : "More"}</span>
            {showMoreCategories ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: SUBCATEGORIES
         ───────────────────────────────────────────────────────────── */}
      <div className="pb-2 space-y-3">
        <h3 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
          Subcategories
        </h3>

        <div className="space-y-2">
          {visibleSubcategories.map((sub) => {
            const isChecked = sub.toLowerCase() === selectedSubCategory.toLowerCase();

            return (
              <label
                key={sub}
                onClick={() => {
                  onSubCategoryChange?.(sub);
                }}
                className="flex items-center gap-3 py-1 px-1 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer select-none group active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
              >
                <div
                  className={cn(
                    "size-4 rounded border transition-all flex items-center justify-center shrink-0",
                    isChecked
                      ? "bg-[#00932a] border-[#00932a] text-white"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1e29] group-hover:border-[#00932a]"
                  )}
                >
                  {isChecked && <Check className="size-3 stroke-[3]" />}
                </div>
                <span className={cn("truncate", isChecked && "font-bold text-[#00932a] dark:text-emerald-400")}>
                  {sub}
                </span>
              </label>
            );
          })}
        </div>

        {subcategoryList.length > INITIAL_VISIBLE_COUNT && (
          <button
            type="button"
            onClick={() => setShowMoreSubcategories(!showMoreSubcategories)}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 pt-1 cursor-pointer"
          >
            <span>{showMoreSubcategories ? "Less" : "More"}</span>
            {showMoreSubcategories ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Responsive Header Bar & Drawer Toggle (Phones & Small Tablets) */}
      <div className="md:hidden w-full mb-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex-1 flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151923] px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 shadow-2xs active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="size-4 text-[#00932a]" />
              <span>Filters</span>
              {selectedCategory !== "All" && (
                <span className="rounded-full bg-[#00932a] px-2 py-0.5 text-[11px] font-bold text-white">
                  {selectedCategory}
                </span>
              )}
            </div>
            <ChevronDown className={cn("size-4 transition-transform duration-200", mobileOpen && "rotate-180")} />
          </button>

          {/* Quick Search Glass Button for Mobile */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="size-11 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151923] shadow-2xs flex items-center justify-center text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
            aria-label="Open Search"
          >
            <SearchIcon className="size-5 text-[#00932a]" />
          </button>
        </div>

        {/* Mobile Filter Collapsible Sheet */}
        {mobileOpen && (
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151923] p-5 shadow-xl animate-in slide-in-from-top-3 duration-200">
            {FilterMarkup}
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:block w-56 lg:w-64 shrink-0">
        <div className="pr-2">
          {FilterMarkup}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          RESPONSIVE SEARCH MODAL DIALOG
         ───────────────────────────────────────────────────────────── */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in-50 duration-200 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl sm:rounded-[32px] bg-white dark:bg-[#151923] p-4 sm:p-7 shadow-2xl border border-gray-200/80 dark:border-gray-800 space-y-4 sm:space-y-5 my-auto animate-in zoom-in-95 duration-200">
            {/* Search Input Bar with Green Ring & Clear Button */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="relative flex-1 flex items-center rounded-full border border-[#00932a]/80 dark:border-[#00932a]/80 bg-white dark:bg-[#1a1e29] px-3.5 sm:px-4 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#00932a]/30">
                <SearchIcon className="size-4 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search by name or category..."
                  className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.("")}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="text-sm sm:text-base font-bold text-[#00932a] hover:text-[#00932a]/80 px-1 sm:px-2 py-1 transition-colors cursor-pointer shrink-0"
              >
                Cancel
              </button>
            </div>

            {/* RESULTS Header & Responsive Grid */}
            {searchQuery.trim().length > 0 && (
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                  RESULTS ({searchResults.length})
                </h4>

                {searchResults.length === 0 ? (
                  <div className="py-10 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-h-[60vh] sm:max-h-[380px] overflow-y-auto py-1 pr-1 scrollbar-thin">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onItemSelect?.(item.id);
                          setSearchModalOpen(false);
                        }}
                        className="flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors cursor-pointer group active:scale-[0.98]"
                      >
                        <div className="relative size-11 sm:size-12 rounded-2xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 shadow-md shadow-gray-200/70 dark:shadow-black/40 border border-gray-200/80 dark:border-gray-700/80 group-hover:scale-105 transition-transform duration-200">
                          <img
                            src={item.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80"}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80";
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h5 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#00932a] transition-colors">
                            {item.name}
                          </h5>
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {item.category || "General"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}