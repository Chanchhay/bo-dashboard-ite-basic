import type { NextRequest } from "next/server";

import {
    extractLatLngFromGoogleMapsUrl,
    isShortGoogleMapsLink,
    parseNominatimAddress,
    type GeocodeResult,
} from "@/lib/api/geocode";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "ipos-business-dashboard/1.0";

/** Short links carry no coordinates themselves — only the page they redirect to does. Resolved server-side; browsers can't follow cross-origin redirects for this and read the final URL. */
async function resolveShortLink(url: string): Promise<string> {
    try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (response.url) return response.url;
    } catch {
        // Some redirectors don't answer HEAD — fall through to GET.
    }
    try {
        const response = await fetch(url, { method: "GET", redirect: "follow" });
        return response.url || url;
    } catch {
        return url;
    }
}

/** Parses the coordinates out of a pasted Google Maps link/text and reverse-geocodes them. */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const link = searchParams.get("url")?.trim();

    if (!link) {
        return Response.json({ message: "url is required" }, { status: 400 });
    }

    const resolvedUrl = isShortGoogleMapsLink(link) ? await resolveShortLink(link) : link;
    const coords = extractLatLngFromGoogleMapsUrl(resolvedUrl) ?? extractLatLngFromGoogleMapsUrl(link);

    if (!coords) {
        return Response.json(
            {
                message:
                    "Couldn't find coordinates in that link. Try pasting the map's share link, or search/drag the pin below instead.",
            },
            { status: 422 },
        );
    }

    const params = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lng),
        format: "jsonv2",
        addressdetails: "1",
    });

    try {
        const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
            headers: { "User-Agent": USER_AGENT, "Accept-Language": "km,en" },
            cache: "no-store",
        });

        if (response.ok) {
            const data = (await response.json()) as {
                display_name?: string;
                address?: Record<string, string>;
            };

            return Response.json({
                // The full resolved address, same as /reverse and /search
                // return it — not the Google Maps URL, which isn't a label
                // for a place.
                label: data.display_name ?? resolvedUrl,
                lat: coords.lat,
                lon: coords.lng,
                address: parseNominatimAddress(data.address),
            } satisfies GeocodeResult);
        }
    } catch {
        // Reverse geocoding failed — fall through with coordinates alone.
    }

    return Response.json({
        label: resolvedUrl,
        lat: coords.lat,
        lon: coords.lng,
        address: {},
    } satisfies GeocodeResult);
}
