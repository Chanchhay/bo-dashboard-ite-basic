"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { getPageTitle } from "@/components/layout/navigation";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/dark-mode/theme-toggle";
import { NotificationMenu } from "@/components/notification/Notification";

export default function Header({
    managerName,
    onOpenNav,
}: {
    managerName: string;
    onOpenNav: () => void;
}) {
    const pathname = usePathname();
    const { app, page } = getPageTitle(pathname);

    return (
        <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={onOpenNav}
                    aria-label="Open navigation"
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-[#5c6660] dark:text-[#94a3b8] outline-none hover:bg-black/[.04] dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#00932a] lg:hidden"
                >
                    <Menu className="size-5" aria-hidden="true" />
                </button>

                <h1 className="min-w-0 truncate text-lg font-semibold leading-tight text-[#16181c] dark:text-[#f8fafc] sm:text-2xl lg:text-[28px]">
                    <span className="font-semibold">{app}</span>
                    {page && (
                        <>
                            <span
                                aria-hidden="true"
                                className="mx-1.5 text-[#c4c9c3] dark:text-[#475569]"
                            >
                                /
                            </span>
                            <span className="font-normal text-[#5c6660] dark:text-[#94a3b8]">{page}</span>
                        </>
                    )}
                </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <label className="relative hidden md:block">
                    <span className="sr-only">Search</span>
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a8f89] dark:text-[#94a3b8]"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        placeholder="Search"
                        className="h-10 w-40 rounded-xl border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1e2330] pr-3 pl-9 text-[14px] text-[#16181c] dark:text-[#f8fafc] outline-none placeholder:text-[#8a8f89] dark:placeholder:text-[#64748b] focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 lg:w-56"
                    />
                </label>

                <ThemeToggle variant="icon" className="hidden sm:grid" />

                <NotificationMenu />

                <UserMenu name={managerName} />
            </div>
        </header>
    );
}
