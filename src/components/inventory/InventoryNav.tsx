"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FolderTree, PackageSearch, Warehouse } from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
    {
        href: "/inventory",
        label: "Products",
        icon: PackageSearch,
        exact: true,
    },
    {
        href: "/inventory/categories",
        label: "Categories",
        icon: FolderTree,
    },
    {
        href: "/inventory/stock",
        label: "Stock",
        icon: Warehouse,
    },
];

export function InventoryNav() {
    const pathname = usePathname();

    return (
        <header className="border-b border-[#e4eae2] bg-white">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-20 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-0">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 text-[#161d16]"
                    >
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Boxes className="size-5" />
                        </span>
                        <span>
                            <span className="block font-semibold">
                                Inventory Management
                            </span>
                            <span className="block text-xs text-[#657064]">
                                Products, categories and stock
                            </span>
                        </span>
                    </Link>

                    <nav
                        aria-label="Inventory sections"
                        className="flex w-full gap-1 overflow-x-auto rounded-full bg-[#f4f7f3] p-1 sm:w-auto"
                    >
                        {navigation.map((item) => {
                            const active = item.exact
                                ? pathname === item.href ||
                                  pathname === "/inventory/new" ||
                                  /^\/inventory\/[^/]+\/edit$/.test(
                                      pathname,
                                  )
                                : pathname.startsWith(item.href);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex min-w-max items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                                        active
                                            ? "bg-primary text-white shadow-sm"
                                            : "text-[#657064] hover:bg-white hover:text-[#161d16]",
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </header>
    );
}
