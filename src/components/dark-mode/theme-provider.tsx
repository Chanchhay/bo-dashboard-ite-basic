"use client"

import { usePathname } from "next/navigation"
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes"

import { POS_ROUTES } from "@/lib/pos-routes"

function isPosRoute(pathname: string | null) {
  return (
    pathname === POS_ROUTES.terminal ||
    Boolean(pathname?.startsWith(`${POS_ROUTES.terminal}/`))
  )
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()

  return (
    <NextThemesProvider
      {...props}
      forcedTheme={isPosRoute(pathname) ? "light" : props.forcedTheme}
    >
      {children}
    </NextThemesProvider>
  )
}
