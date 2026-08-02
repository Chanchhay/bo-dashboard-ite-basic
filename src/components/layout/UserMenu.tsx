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
import { useGetUserProfileQuery } from "@/services/userProfileApi";

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
 * The name and picture come from the user-profile query rather than the
 * session, so editing the profile updates this chip in the same tick; the
 * session name from the server stays as the fallback until the query lands.
 *
 * Signing out has to be a POST — it ends the session and hands the browser to
 * Keycloak — so it goes through a real form rather than a link. The form lives
 * outside the popup because clicking an item closes the menu, and a form
 * unmounted mid-click never submits.
 */
export default function UserMenu({
    name,
    compact = false,
}: {
    name: string;
    compact?: boolean;
}) {
    const signOutForm = useRef<HTMLFormElement>(null);
    const { data: profile } = useGetUserProfileQuery();

    const profileName =
        [profile?.firstName, profile?.lastName]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(" ") ||
        profile?.username ||
        name;
    const picture = profile?.profilePicture;

    return (
        <>
            <Menu>
                <MenuTrigger
                    aria-label={`Account menu for ${profileName}`}
                    className={`flex items-center rounded-full border border-[#bccab8] bg-white py-1.5 pl-1.5 outline-none transition-colors hover:bg-[#f5f8f4] focus-visible:ring-2 focus-visible:ring-[#006b26] data-popup-open:bg-[#f5f8f4] ${compact ? "pr-1.5" : "gap-2.5 pr-4"}`}
                >
                    <span
                        aria-hidden="true"
                        className="grid size-8 place-items-center overflow-hidden rounded-full border border-[#006b26] bg-[#00932a] text-[13px] font-medium text-white"
                    >
                        {picture ? (
                            // The profile picture URL is supplied by the API.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={picture}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            initialsOf(profileName)
                        )}
                    </span>
                    <span
                        className={
                            compact
                                ? "sr-only"
                                : "hidden text-[14px] text-[#161d16] sm:block"
                        }
                    >
                        {profileName}
                    </span>
                </MenuTrigger>

                <MenuContent>
                    <p className="px-3 pt-1.5 pb-1 text-[12px] text-[#3d4a3c]">
                        Signed in as
                        <span className="mt-0.5 block truncate text-[14px] text-[#161d16]">
                            {profileName}
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
