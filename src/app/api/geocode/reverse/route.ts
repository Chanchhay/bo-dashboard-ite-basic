import type { NextRequest } from "next/server";

import { parseNominatimAddress, type GeocodeResult } from "@/lib/api/geocode";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "ipos-business-dashboard/1.0";

type NominatimReverseResult = {
    display_name?: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
};

/** Reverse-geocodes a dropped/dragged pin into province/district/commune text. */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
        return Response.json({ message: "lat and lon are required" }, { status: 400 });
    }

    // Checked here rather than left to Nominatim: a garbled pin is a bad
    // request, not a failure of theirs, and it should not cost a call against
    // their rate limit to find that out.
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return Response.json(
            { message: "lat and lon must be valid coordinates." },
            { status: 400 },
        );
    }

    const params = new URLSearchParams({ lat, lon, format: "jsonv2", addressdetails: "1" });

    try {
        const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
            headers: { "User-Agent": USER_AGENT, "Accept-Language": "km,en" },
            cache: "no-store",
        });

        if (!response.ok) {
            return Response.json({ message: "Reverse geocoding failed." }, { status: 502 });
        }

        const data = (await response.json()) as NominatimReverseResult;
        const result: GeocodeResult = {
            label: data.display_name ?? "",
            lat: Number(data.lat),
            lon: Number(data.lon),
            address: parseNominatimAddress(data.address),
        };

        return Response.json(result);
    } catch {
        return Response.json({ message: "Reverse geocoding failed." }, { status: 502 });
    }
}
