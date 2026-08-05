"use client";

import { SearchIcon } from "lucide-react";

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Search......",
}: SearchBarProps) {
  return (
    <div className="relative flex h-10 w-full max-w-xs sm:max-w-sm items-center rounded-full border border-gray-300 bg-white px-4 shadow-2xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-gray-400">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pr-7 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
      />
      <SearchIcon className="absolute right-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}