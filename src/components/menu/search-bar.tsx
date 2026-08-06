"use client";

import { SearchIcon } from "lucide-react";

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
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pr-7 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
      />
      <SearchIcon className="absolute right-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}