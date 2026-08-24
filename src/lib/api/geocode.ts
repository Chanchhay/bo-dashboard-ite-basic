export type GeocodeAddress = {
    provinceName?: string;
    districtName?: string;
    communeName?: string;
};

export type GeocodeResult = {
    label: string;
    lat: number;
    lon: number;
    address: GeocodeAddress;
};

type NominatimAddress = Record<string, string | undefined>;

/**
 * Nominatim's address fields aren't standardized per country, so this reads
 * several plausible keys per level rather than trusting one. Cambodia's OSM
 * tagging is inconsistent enough that this is a best guess, not a fact — the
 * caller shows these as editable fields the owner can correct, never as
 * read-only truth.
 */
export function parseNominatimAddress(address: NominatimAddress | undefined): GeocodeAddress {
    if (!address) return {};

    return {
        provinceName: address.state || address.province || address.city || undefined,
        // Phnom Penh's khans come back tagged as `town` in practice (e.g.
        // "ខណ្ឌទួលគោក" / Khan Toul Kork) rather than any of the more
        // "correct"-sounding admin fields — checked last since it's the
        // least specific tag and other fields should win when present.
        districtName:
            address.city_district ||
            address.county ||
            address.state_district ||
            address.town ||
            undefined,
        communeName:
            address.suburb || address.neighbourhood || address.village || address.quarter || undefined,
    };
}

const SHORT_LINK_HOSTS = ["maps.app.goo.gl", "goo.gl"];

/** Short links (maps.app.goo.gl, goo.gl/maps) carry no coordinates in the URL itself — only the redirect they resolve to does. */
export function isShortGoogleMapsLink(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return SHORT_LINK_HOSTS.some((short) => host === short || host.endsWith(`.${short}`));
    } catch {
        return false;
    }
}

/**
 * Google Maps links carry a pin's coordinates in several different shapes
 * depending on how they were shared — this tries each in turn. Short links
 * (maps.app.goo.gl) carry none of these; resolve the redirect first via
 * {@link isShortGoogleMapsLink} and a server-side fetch, then parse the
 * result.
 *
 * `!3d<lat>!4d<lng>` (the actual place marker) is checked before `@lat,lng`
 * on purpose: a resolved place link carries both, and `@lat,lng` there is
 * only the map's *viewport* center — it can sit a few hundred meters from
 * the pin the link was actually shared for, especially when the share was
 * made zoomed out. `@lat,lng` is the reliable one only on links that carry
 * no place marker at all.
 */
export function extractLatLngFromGoogleMapsUrl(input: string): { lat: number; lng: number } | null {
    const text = input.trim();
    const patterns = [
        /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, // resolved place link's actual marker
        /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // ?q=11.5564,104.9282
        /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // viewport center — .../place/Name/@11.5564,104.9282,15z
        /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/, // plain "11.5564, 104.9282" pasted as text
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const lat = Number(match[1]);
            const lng = Number(match[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                return { lat, lng };
            }
        }
    }

    return null;
}
