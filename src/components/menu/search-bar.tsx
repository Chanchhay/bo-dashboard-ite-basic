"use client";

import { SearchIcon, X } from "lucide-react";

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div className="group relative flex h-10 w-full max-w-xs sm:max-w-sm items-center rounded-xl sm:rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-[#1e2330] px-3.5 shadow-2xs transition-all duration-200 focus-within:border-primary dark:focus-within:border-[#00a651] focus-within:ring-2 focus-within:ring-primary/20 dark:focus-within:ring-[#00a651]/25 hover:border-gray-300 dark:hover:border-gray-600">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pr-7 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange?.("")}
          className="absolute right-3 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <SearchIcon className="absolute right-3.5 h-4 w-4 text-gray-400 dark:text-gray-400 group-focus-within:text-primary dark:group-focus-within:text-[#00a651] pointer-events-none transition-colors" />
      )}
    </div>
  );
}