"use client";

import { useRef } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import {
    Menu,
    MenuContent,
    MenuItem,
    MenuLinkItem,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";

function initialsOf(name: string) {
    return (
        name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"
    );
}

/**
 * The avatar chip in the header, and the account actions behind it.
 *
 * Signing out has to be a POST — it ends the session and hands the browser to
 * Keycloak — so it goes through a real form rather than a link. The form lives
 * outside the popup because clicking an item closes the menu, and a form
 * unmounted mid-click never submits.
 */
export default function UserMenu({ name }: { name: string }) {
    const signOutForm = useRef<HTMLFormElement>(null);

    return (
        <>
            <Menu>
                <MenuTrigger
                    aria-label={`Account menu for ${name}`}
                    className="flex items-center gap-2.5 rounded-full border border-[#e2e2de] bg-white py-1.5 pr-4 pl-1.5 outline-none transition-colors hover:bg-[#f7f7f6] focus-visible:ring-2 focus-visible:ring-[#00932a] data-popup-open:bg-[#f7f7f6]"
                >
                    <span
                        aria-hidden="true"
                        className="grid size-8 place-items-center rounded-full bg-[#00932a] text-[13px] font-medium text-white"
                    >
                        {initialsOf(name)}
                    </span>
                    <span className="hidden text-[14px] text-[#16181c] sm:block">
                        {name}
                    </span>
                </MenuTrigger>

                <MenuContent>
                    <p className="px-3 pt-1.5 pb-1 text-[12px] text-[#8a8f89]">
                        Signed in as
                        <span className="mt-0.5 block truncate text-[14px] text-[#16181c]">
                            {name}
                        </span>
                    </p>

                    <MenuSeparator />

                    <MenuLinkItem render={<Link href="/profile" />}>
                        <UserRound aria-hidden="true" />
                        Your profile
                    </MenuLinkItem>

                    <MenuItem
                        onClick={() => signOutForm.current?.requestSubmit()}
                        className="text-[#b3352f] data-highlighted:bg-[#fdeceb] [&_svg]:text-[#b3352f]"
                    >
                        <LogOut aria-hidden="true" />
                        Sign out
                    </MenuItem>
                </MenuContent>
            </Menu>

            <form ref={signOutForm} action="/api/logout" method="post" hidden />
        </>
    );
}
