"use client";

import { SearchIcon, X } from "lucide-react";

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Search......",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative flex h-10 w-full max-w-xs sm:max-w-sm items-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-2xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-gray-400 dark:hover:border-gray-600 ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pr-7 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
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