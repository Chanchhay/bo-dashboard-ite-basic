
export const ROOT_DOMAIN =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const isLocal = ROOT_DOMAIN.startsWith("localhost");

const RESERVED = new Set(["www", "administrator", "app", "api", "admin"]);

export function getSubdomain(host: string | null | undefined): string | null {
    if (!host) return null;

    const hostname = host.split(",")[0].trim().toLowerCase();

    if (hostname === ROOT_DOMAIN) return null;
    if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;

    const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));

    if (!subdomain || subdomain.includes(".")) return null;
    if (RESERVED.has(subdomain)) return null;

    return subdomain;
}

export function storefrontUrl(slug: string): string {
    return `${isLocal ? "http" : "https"}://${slug}.${ROOT_DOMAIN}`;
}
