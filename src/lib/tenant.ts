/**
 * Subdomain-per-storefront routing.
 *
 * A business with slug `acme` is served from `acme.<root domain>`, where the
 * root domain differs per environment: `localhost:3000` in development,
 * `fluxibiz.store` in production. Keeping it in one env var is what lets the
 * same code work in both.
 */

/** Host the dashboard itself is served from, port included when there is one. */
export const ROOT_DOMAIN =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const isLocal = ROOT_DOMAIN.startsWith("localhost");

/** Subdomains that belong to the dashboard, not to a storefront. */
const RESERVED = new Set(["www", "administrator", "app", "api", "admin"]);

/**
 * The storefront slug a request is addressed to, or `null` when the host is the
 * dashboard itself. `host` should be the raw Host header, e.g. `acme.fluxibiz.store`.
 */
export function getSubdomain(host: string | null | undefined): string | null {
    if (!host) return null;

    // `x-forwarded-host` may carry a comma-separated list when several proxies
    // are chained; the first entry is the one the client actually asked for.
    const hostname = host.split(",")[0].trim().toLowerCase();

    if (hostname === ROOT_DOMAIN) return null;
    if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;

    const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));

    // Nested subdomains (`a.b.example.com`) aren't storefronts.
    if (!subdomain || subdomain.includes(".")) return null;
    if (RESERVED.has(subdomain)) return null;

    return subdomain;
}

/** Public URL of a storefront, for links and QR codes. */
export function storefrontUrl(slug: string): string {
    return `${isLocal ? "http" : "https"}://${slug}.${ROOT_DOMAIN}`;
}
