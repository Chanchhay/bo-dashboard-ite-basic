"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Search } from "lucide-react";

import { CAMBODIA_PROVINCES, matchCambodiaProvince } from "@/lib/api/cambodia-provinces";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { GeocodeResult } from "@/lib/api/geocode";

// An inline SVG pin instead of Leaflet's default marker images, which
// webpack/Next.js breaks the paths for unless separately configured.
const PIN_ICON = L.divIcon({
    className: "",
    html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#dc2626"/>
        <circle cx="15" cy="16" r="6" fill="#ffffff"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
});

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282]; // Phnom Penh
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 16;

export interface LocationValue {
    lat: number | null;
    lng: number | null;
    provinceName: string;
    districtName: string;
    communeName: string;
}

/** MapContainer only sets its center once on mount — this re-centers it whenever a search result moves the pin. */
function RecenterOnChange({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, Math.max(map.getZoom(), zoom));
    }, [center, zoom, map]);
    return null;
}

export function LocationMapPicker({
    initial,
    onChange,
}: {
    initial: LocationValue;
    onChange: (value: LocationValue) => void;
}) {
    // Normalizes even the initial (already-saved) value — if a business was
    // saved before province became a fixed list, this snaps it to a match
    // where one exists, and clears it otherwise. Falling back to the raw
    // text here instead of "" would let ungoverned text ride through to the
    // submitted form value the moment the picker remounts unedited, which
    // is exactly what the fixed list exists to prevent.
    const [value, setValue] = useState<LocationValue>(() => ({
        ...initial,
        provinceName: matchCambodiaProvince(initial.provinceName)?.nameEn ?? "",
    }));
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [reversing, setReversing] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasPin = value.lat !== null && value.lng !== null;
    const center: [number, number] = hasPin ? [value.lat as number, value.lng as number] : DEFAULT_CENTER;

    function update(next: Partial<LocationValue>) {
        setValue((prev) => {
            const merged = { ...prev, ...next };
            onChange(merged);
            return merged;
        });
    }

    async function reverseGeocode(lat: number, lng: number) {
        setReversing(true);
        try {
            const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
            if (res.ok) {
                const result = (await res.json()) as GeocodeResult;
                // Unmatched clears the field rather than keeping a stale
                // pick or an un-selectable raw string — the owner picks by
                // hand rather than the app guessing wrong silently.
                const matched = matchCambodiaProvince(result.address.provinceName);
                update({
                    lat,
                    lng,
                    provinceName: matched?.nameEn ?? "",
                    districtName: result.address.districtName ?? value.districtName,
                    communeName: result.address.communeName ?? value.communeName,
                });
                return;
            }
        } catch {
            // Reverse geocoding failed — the pin still moved, the owner can
            // fill Province/District/Commune in by hand.
        } finally {
            setReversing(false);
        }
        update({ lat, lng });
    }

    function handleSearchChange(next: string) {
        setQuery(next);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!next.trim()) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(next)}`);
                setSuggestions(res.ok ? ((await res.json()) as GeocodeResult[]) : []);
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 500);
    }

    function pickSuggestion(result: GeocodeResult) {
        setQuery(result.label);
        setSuggestions([]);
        const matched = matchCambodiaProvince(result.address.provinceName);
        update({
            lat: result.lat,
            lng: result.lon,
            provinceName: matched?.nameEn ?? "",
            districtName: result.address.districtName ?? value.districtName,
            communeName: result.address.communeName ?? value.communeName,
        });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Search the shop's address…"
                    className={`${controlClassName} pl-9`}
                />
                {searching && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {suggestions.length > 0 && (
                    // Leaflet's own panes/controls use z-index up to ~1000
                    // internally; anything lower can render invisibly
                    // underneath the map where the two overlap.
                    <ul className="absolute z-[1200] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                        {suggestions.map((result) => (
                            <li key={`${result.lat},${result.lon}`}>
                                <button
                                    type="button"
                                    onClick={() => pickSuggestion(result)}
                                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                                    title={result.label}
                                >
                                    {result.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="h-[28rem] w-full overflow-hidden rounded-xl border border-border">
                <MapContainer
                    center={center}
                    zoom={hasPin ? PIN_ZOOM : DEFAULT_ZOOM}
                    className="h-full w-full"
                    scrollWheelZoom
                    attributionControl={false}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <RecenterOnChange center={center} zoom={PIN_ZOOM} />
                    <Marker
                        position={center}
                        icon={PIN_ICON}
                        draggable
                        eventHandlers={{
                            dragend: (event) => {
                                const marker = event.target as L.Marker;
                                const { lat, lng } = marker.getLatLng();
                                reverseGeocode(lat, lng);
                            },
                        }}
                    />
                </MapContainer>
            </div>

            <p className="text-xs text-muted-foreground">
                {reversing
                    ? "Reading the address at that pin…"
                    : "Search for the shop's address or drag the pin — Province is matched automatically from Cambodia's 25 provinces, and District/Commune fill in below and can be corrected by hand."}
            </p>

            <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-2.5">
                    <Label
                        htmlFor="provinceName"
                        className="pl-1 text-base leading-[16.5px] font-semibold text-[#424841] dark:text-[#cbd5e1]"
                    >
                        Province / City
                    </Label>
                    <Select
                        name="provinceName"
                        value={value.provinceName || null}
                        onValueChange={(next) =>
                            update({ provinceName: typeof next === "string" ? next : "" })
                        }
                        items={Object.fromEntries(
                            CAMBODIA_PROVINCES.map((province) => [province.nameEn, province.nameEn]),
                        )}
                    >
                        <SelectTrigger id="provinceName" className={`${controlClassName} w-full`}>
                            <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent align="start">
                            {CAMBODIA_PROVINCES.map((province) => (
                                <SelectItem key={province.id} value={province.nameEn}>
                                    {province.nameEn}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex min-w-0 flex-col gap-2.5">
                    <Label
                        htmlFor="districtName"
                        className="pl-1 text-base leading-[16.5px] font-semibold text-[#424841] dark:text-[#cbd5e1]"
                    >
                        District / Khan
                    </Label>
                    <Input
                        id="districtName"
                        name="districtName"
                        value={value.districtName}
                        onChange={(event) => update({ districtName: event.target.value })}
                        className={controlClassName}
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-2.5">
                    <Label
                        htmlFor="communeName"
                        className="pl-1 text-base leading-[16.5px] font-semibold text-[#424841] dark:text-[#cbd5e1]"
                    >
                        Commune / Sangkat
                    </Label>
                    <Input
                        id="communeName"
                        name="communeName"
                        value={value.communeName}
                        onChange={(event) => update({ communeName: event.target.value })}
                        className={controlClassName}
                    />
                </div>
            </div>

            {/* No visible field for these — the pin itself is the input. */}
            <input type="hidden" name="latitude" value={value.lat ?? ""} readOnly />
            <input type="hidden" name="longitude" value={value.lng ?? ""} readOnly />
        </div>
    );
}
