/**
 * Where the Keycloak ID token lives between sign-in and sign-out.
 *
 * Better Auth keeps the ID token on the account record, and this app calls
 * `betterAuth()` without a `database`, so that record lives in a per-process
 * memory store: it is gone after any server restart, and in dev after any
 * module reload. Logout needs the token — it is the `id_token_hint` that
 * proves to Keycloak which session is ending. Without it Keycloak keeps the
 * SSO session alive and `/login` signs the browser straight back in, which
 * looks to the user like sign-out did nothing.
 *
 * Holding it in an httpOnly cookie keeps it available for exactly as long as
 * the browser holds the session it belongs to, and survives the memory store
 * being emptied underneath us.
 */
export const ID_TOKEN_COOKIE = "ipos_id_token";

/** Cookies only get the `Secure` attribute where the app is actually on https. */
export function useSecureCookies() {
    return (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");
}
