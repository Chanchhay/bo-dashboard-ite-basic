"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";

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

export default function UserMenu({
    name,
    compact = false,
}: {
    name: string;
    compact?: boolean;
}) {
  const signOutForm = useRef<HTMLFormElement>(null);
  const { data: profile } = useGetUserProfileQuery();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const [imageError, setImageError] = useState(false);

  const isDark = mounted && resolvedTheme === "dark";

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
                    className={`flex items-center justify-center rounded-full border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1e2330] outline-none transition-colors hover:bg-[#f7f7f6] dark:hover:bg-[#252a38] focus-visible:ring-2 focus-visible:ring-primary data-popup-open:bg-[#f7f7f6] dark:data-popup-open:bg-[#252a38] ${
                        compact
                            ? "size-10 p-1"
                            : "size-10 p-1 sm:h-11 sm:w-auto sm:py-1.5 sm:pl-1.5 sm:pr-4 sm:gap-2.5"
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-[13px] font-medium text-white"
                    >
                        {picture && !imageError ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={picture}
                                alt=""
                                onError={() => setImageError(true)}
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
                                : "hidden text-[14px] font-medium text-[#16181c] dark:text-[#f8fafc] sm:inline-block"
                        }
                    >
                        {profileName}
                    </span>
                </MenuTrigger>

        <MenuContent>
          <p className="px-3 pt-1.5 pb-1 text-[12px] text-[#3d4a3c] dark:text-[#94a3b8]">
            Signed in as
            <span className="mt-0.5 block truncate text-[14px] text-[#161d16] dark:text-[#f8fafc]">
              {profileName}
            </span>
          </p>

          <MenuSeparator />

          <MenuLinkItem render={<Link href="/settings" />}>
            <UserRound aria-hidden="true" />
            Account settings
          </MenuLinkItem>

          <MenuItem
            className="sm:hidden"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? (
              <Sun className="size-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </MenuItem>

          <MenuItem
            onClick={() => signOutForm.current?.requestSubmit()}
            className="text-[#d14341] dark:text-[#f87171] data-highlighted:bg-[#fdeceb] dark:data-highlighted:bg-[#d14341]/20 [&_svg]:text-[#d14341] dark:[&_svg]:text-[#f87171]"
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