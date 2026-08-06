"use client";

import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";
import SearchBar from "./search-bar";
import ThemeToggle from "@/components/dark-mode/theme-toggle";

type MenuNavbarProps = {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  shopName?: string;
  logoUrl?: string;
};

export default function MenuNavbar({
  searchQuery = "",
  onSearchChange,
  shopName = "Store Menu",
}: MenuNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-gray-800/80 bg-white/90 dark:bg-[#12151e]/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/pos" className="flex items-center gap-3 group">
          <BrandLogo variant="wordmark" alt={shopName} className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2.5">
          <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Search......" />
          <ThemeToggle
            variant="icon"
            className="size-10 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
          />
        </div>
      </div>
    </header>
  );
}