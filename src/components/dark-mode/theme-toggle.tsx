"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

export default function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    // render a placeholder the same size as the real button to avoid layout shift
    return (
      <Button
        type="button"
        variant="ghost"
        size={mobile ? "default" : "icon"}
        className={mobile ? "h-11 w-full justify-start gap-3 rounded-lg px-3" : "size-10 rounded-full"}
        disabled
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size={mobile ? "default" : "icon"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        mobile
          ? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-foreground"
          : "relative size-10 rounded-full text-[#6a6a6a] hover:bg-[#6a6a6a]/10 hover:text-[#6a6a6a]"
      }
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="size-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon
        className={
          mobile
            ? "absolute size-6 rotate-90 scale-0 transition-all dark:relative dark:rotate-0 dark:scale-100"
            : "absolute size-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        }
      />
      {mobile && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
      <span className="sr-only">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </Button>
  )
}