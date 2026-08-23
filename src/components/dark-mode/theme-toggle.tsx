"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export default function ThemeToggle({
  variant = "menu",
  className = "",
}: {
  variant?: "menu" | "icon";
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "relative grid size-10 place-items-center rounded-xl border-0 bg-transparent text-[#16181c] dark:text-[#f8fafc] outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer",
          className
        )}
      >
        {isDark ? (
          <Sun className="size-5.5 text-amber-400" aria-hidden="true" />
        ) : (
          <Moon className="size-5.5 text-neutral-600 dark:text-[#94a3b8]" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex w-full items-center gap-3 rounded-md text-sm outline-none transition-colors ${className}`}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="size-4 text-neutral-600 dark:text-neutral-300" aria-hidden="true" />
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}