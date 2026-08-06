"use client";

import { useState } from "react";

type CategoryFilterProps = {
  categories?: string[];
  selectedCategory?: string;
  onChange?: (category: string) => void;
};

export default function CategoryFilter({
  categories = [],
  selectedCategory,
  onChange,
}: CategoryFilterProps) {
  const [internalActive, setInternalActive] = useState("All Category");

  if (!categories || categories.length === 0) {
    return null;
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
    <div className="category-scroll snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex w-full items-center justify-start gap-3 overflow-x-auto py-3 px-1">
      {list.map((category) => {
        const isActive = category === activeCategory;
        return (
          <button
            key={category}
            type="button"
            onClick={() => handleSelect(category)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-2xs active:scale-95 ${
              isActive
                ? "bg-[#00a651] text-white shadow-md shadow-[#00a651]/20 border border-[#00a651]"
                : "border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}