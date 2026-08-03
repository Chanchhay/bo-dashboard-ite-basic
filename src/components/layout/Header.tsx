"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { getPageTitle } from "@/components/layout/navigation";
import UserMenu from "@/components/layout/UserMenu";
import { NotificationMenu } from "../profile/Notification";

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
        <header className="flex flex-wrap items-center gap-4 px-5 pt-6 pb-8 lg:px-8">
            <button
                type="button"
                onClick={onOpenNav}
                aria-label="Open navigation"
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[#5c6660] outline-none hover:bg-black/[.04] focus-visible:ring-2 focus-visible:ring-[#00932a] lg:hidden"
            >
                <Menu className="size-5" aria-hidden="true" />
            </button>

            <h1 className="flex-1 text-[26px] leading-tight text-[#16181c] sm:text-[30px]">
                <span className="font-semibold">{app}</span>
                {page && (
                    <>
                        <span
                            aria-hidden="true"
                            className="mx-2 text-[#c4c9c3]"
                        >
                            /
                        </span>
                        <span className="text-[#5c6660]">{page}</span>
                    </>
                )}
            </h1>

            <div className="flex items-center gap-3">
                <label className="relative hidden md:block">
                    <span className="sr-only">Search</span>
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a8f89]"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        placeholder="Search"
                        className="h-11 w-56 rounded-xl border border-[#e2e2de] bg-white pr-3 pl-9 text-[14px] text-[#16181c] outline-none placeholder:text-[#8a8f89] focus-visible:border-[#00932a] focus-visible:ring-2 focus-visible:ring-[#00932a]/25"
                    />
                </label>

                <NotificationMenu />
                

                <UserMenu name={managerName} />
            </div>
        </header>
    );
}
