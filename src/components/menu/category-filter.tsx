"use client";

import { useState } from "react";
import { CategoryFilterSkeleton } from "@/components/ui/skeleton";

const DEFAULT_CATEGORIES = [
  "All Category",
  "Sneakers",
  "Sports Shoes",
  "Boots",
  "Slippers",
  "Heels",
  "Kids' Shoes",
  "Casual",
];

type CategoryFilterProps = {
  categories?: string[];
  selectedCategory?: string;
  onChange?: (category: string) => void;
  isLoading?: boolean;
};

export default function CategoryFilter({
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onChange,
  isLoading = false,
}: CategoryFilterProps) {
  const [internalActive, setInternalActive] = useState("All Category");

  if (isLoading) {
    return <CategoryFilterSkeleton />;
  }

  const activeCategory = selectedCategory !== undefined ? selectedCategory : internalActive;

  const list = categories.includes("All Category")
    ? categories
    : ["All Category", ...categories];

  const handleSelect = (category: string) => {
    setInternalActive(category);
    onChange?.(category);
  };

  return (
    <div className="category-scroll snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex w-full items-center justify-start gap-2.5 sm:gap-3 overflow-x-auto py-3 px-1">
      {list.map((category) => {
        const isActive = category === activeCategory;
        return (
          <button
            key={category}
            type="button"
            onClick={() => handleSelect(category)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 shadow-2xs active:scale-95 ${
              isActive
                ? "bg-[#00a651] text-white shadow-md shadow-[#00a651]/25 border border-[#00a651] scale-[1.02]"
                : "border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-[#1e2330] text-gray-700 dark:text-gray-200 hover:border-primary/60 dark:hover:border-gray-500 hover:bg-primary/5 dark:hover:bg-[#282f42] hover:text-primary dark:hover:text-white"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}