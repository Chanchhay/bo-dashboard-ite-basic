import type { NextRequest } from "next/server";

import { parseNominatimAddress, type GeocodeResult } from "@/lib/api/geocode";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
// Nominatim's usage policy requires a User-Agent identifying the caller.
const USER_AGENT = "ipos-business-dashboard/1.0";

type NominatimSearchItem = {
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
};

/** Proxied server-side so the required User-Agent header can be set — browsers won't let JS override it. */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
        return Response.json([]);
    }

    // Nominatim is a shared public instance; there is no reason to forward a
    // query longer than any real place name.
    if (q.length > 200) {
        return Response.json(
            { message: "Search text is too long." },
            { status: 400 },
        );
    }

    const params = new URLSearchParams({
        q,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
        countrycodes: "kh",
    });

    try {
        const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
            headers: { "User-Agent": USER_AGENT, "Accept-Language": "km,en" },
            cache: "no-store",
        });

        if (!response.ok) {
            return Response.json({ message: "Location search failed." }, { status: 502 });
        }

        const data = (await response.json()) as NominatimSearchItem[];
        const results: GeocodeResult[] = data.map((item) => ({
            label: item.display_name,
            lat: Number(item.lat),
            lon: Number(item.lon),
            address: parseNominatimAddress(item.address),
        }));

        return Response.json(results);
    } catch {
        return Response.json({ message: "Location search failed." }, { status: 502 });
    }
}
