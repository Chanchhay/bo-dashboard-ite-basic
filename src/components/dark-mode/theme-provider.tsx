"use client"

import { useEffect } from "react"
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
  const pathname = usePathname();
  const onPos = isPosRoute(pathname);

  useEffect(() => {
    if (onPos) {
      document.documentElement.classList.remove("dark");
    }
  }, [onPos]);

  return (
    <NextThemesProvider
      {...props}
      enableSystem={false}
      enableColorScheme={false}
      forcedTheme={onPos ? "light" : props.forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
