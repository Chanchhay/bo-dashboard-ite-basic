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
    <div className="group relative flex h-10 w-full max-w-xs sm:max-w-sm items-center rounded-xl sm:rounded-2xl border border-[#00932a]/60 dark:border-[#00932a]/70 bg-white dark:bg-[#1a1e29] px-3.5 shadow-2xs transition-all duration-200 focus-within:border-[#00932a] focus-within:ring-2 focus-within:ring-[#00932a]/25 hover:border-[#00932a]">
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
          className="absolute right-3 p-0.5 rounded-full text-gray-400 hover:text-[#00932a] dark:text-gray-400 dark:hover:text-[#00932a] hover:bg-[#00932a]/10 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <SearchIcon className="absolute right-3.5 h-4 w-4 text-[#00932a] dark:text-[#00932a] pointer-events-none transition-colors" />
      )}
    </div>
  );
}