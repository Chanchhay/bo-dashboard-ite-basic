"use client";

import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";
import SearchBar from "./search-bar";

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
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/pos" className="flex items-center gap-3 group">
          <BrandLogo variant="wordmark" alt={shopName} className="h-8 w-auto" />
        </Link>
        <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Search......" />
      </div>
    </header>
  );
}