/**
 * Two ways to move around the back office:
 *   "apps"      — the launcher grid; entering an app scopes the shell to it.
 *   "dashboard" — one sidebar with every section the user can reach.
 *
 * Stored in a cookie so the server renders the right shell on the first paint
 * instead of flipping layouts after hydration.
 */
export type ViewMode = "apps" | "dashboard";

export const VIEW_MODE_COOKIE = "ipos_view";

export function parseViewMode(value: string | undefined): ViewMode {
    return value === "dashboard" ? "dashboard" : "apps";
}

/** Client-side write; pair with `router.refresh()` so the server re-renders. */
export function persistViewMode(mode: ViewMode) {
    document.cookie = `${VIEW_MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
