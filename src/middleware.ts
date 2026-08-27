/**
 * Next.js only ever runs a file literally named `middleware.ts` (or `.js`)
 * at the project/src root — the actual logic lives in `./proxy.ts` (named
 * that way for the auth-refresh + subdomain-rewrite responsibilities it
 * carries), but a file named `proxy.ts` alone is never invoked by the
 * framework. Without this re-export, every request — including a business
 * subdomain like `food-shop.fluxibiz.store` — skipped the subdomain
 * rewrite entirely and fell through to the plain root page, which
 * unconditionally redirects to `/login`.
 */
export { proxy as middleware, config } from "./proxy";
