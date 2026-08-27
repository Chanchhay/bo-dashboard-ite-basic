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


export function parseNominatimAddress(address: NominatimAddress | undefined): GeocodeAddress {
    if (!address) return {};

    return {
        provinceName: address.state || address.province || address.city || undefined,
   
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


export function extractLatLngFromGoogleMapsUrl(input: string): { lat: number; lng: number } | null {
    const text = input.trim();
    const patterns = [
        /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, 
        /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // ?q=11.5564,104.9282
        /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, 
        /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/, 
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
