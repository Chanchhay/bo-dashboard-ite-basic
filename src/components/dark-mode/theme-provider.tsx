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

/**
 * POS is a light-only app, and this is the only place that can hold it there.
 * next-themes renders a nested provider as a passthrough, so POS's own
 * provider never ran; forcing the theme here also covers dialogs and menus,
 * which portal to `<body>` and escape any wrapper POS puts around its tree.
 */
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
