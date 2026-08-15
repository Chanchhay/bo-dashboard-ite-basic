"use client";

import { useMemo } from "react";
import { Search as SearchIcon, X } from "lucide-react";
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

type ExactCategoryFilterProps = {
  mainCategories?: MainCategory[];
  categories?: string[]; // Main Item Groups created by Business Owner
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
  categories = [],
  selectedCategory = "All Category",
  searchQuery = "",
  onSearchChange,
  onChange,
  isLoading = false,
}: ExactCategoryFilterProps) {
  // Take Item Groups created by Business Owner in Inventory Config
  const categoryList: string[] = useMemo(() => {
    const list = categories.filter((c) => c !== "All" && c !== "All Category" && c !== "All Dishes");
    return ["All Category", ...list];
  }, [categories]);

  if (isLoading) {
    return <CategoryFilterSkeleton />;
  }

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 py-2">
      {/* Search Input Bar (Left) matching screenshot */}
      <div className="relative w-full md:w-80 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search......"
          className="w-full h-11 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1e29] pl-5 pr-11 text-sm font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-2xs focus:outline-none focus:border-[#00932a] focus:ring-2 focus:ring-[#00932a]/20 transition-all"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange?.("")}
            className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="size-4" />
          </button>
        ) : (
          <SearchIcon className="absolute right-4 top-3.5 size-4 text-[#00932a] pointer-events-none" />
        )}
      </div>

      {/* Horizontal Scrollable Category Pills (Right) matching screenshot */}
      <div className="flex-1 w-full overflow-x-auto py-1 flex items-center justify-start md:justify-end gap-2.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {categoryList.map((cat) => {
          const isSelected =
            cat.toLowerCase() === selectedCategory.toLowerCase() ||
            (selectedCategory.toLowerCase() === "all" && cat.toLowerCase() === "all category");

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange?.(cat)}
              className={cn(
                "h-10 px-5 rounded-full text-sm font-bold whitespace-nowrap transition-all cursor-pointer border select-none shrink-0",
                isSelected
                  ? "bg-[#00932a] border-[#00932a] text-white shadow-md shadow-[#00932a]/20"
                  : "bg-white dark:bg-[#1a1e29] border-[#00932a] text-[#00932a] dark:text-emerald-400 hover:bg-[#00932a]/10"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}