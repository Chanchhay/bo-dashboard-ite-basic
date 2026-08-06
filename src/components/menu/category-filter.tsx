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
            className={`shrink-0 rounded-2xl px-4.5 py-2 text-sm font-bold transition-all duration-200 shadow-2xs active:scale-95 ${
              isActive
                ? "bg-[#00932a] text-white shadow-md shadow-[#00932a]/25 border border-[#00932a]"
                : "border border-[#00932a]/60 dark:border-[#00932a]/70 bg-white dark:bg-[#1a1e29] text-[#00932a] dark:text-[#00932a] hover:bg-[#00932a]/10 dark:hover:bg-[#00932a]/20 hover:border-[#00932a]"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}