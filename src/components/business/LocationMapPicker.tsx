"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LoaderCircle, Search, X } from "lucide-react";

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
    address?: string;
}

/** MapContainer only sets its center once on mount — this re-centers it whenever a search result moves the pin. */
function RecenterOnChange({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, Math.max(map.getZoom(), zoom));
    }, [center, zoom, map]);
    return null;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/** Submit-time messages from the profile form's schema. `coordinates` covers
 * latitude and longitude together, since the pin is their only input. */
export interface LocationErrors {
    provinceName?: string;
    districtName?: string;
    communeName?: string;
    coordinates?: string;
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p className="pl-1 text-xs text-danger" role="alert">
            {message}
        </p>
    );
}

export function LocationMapPicker({
    initial,
    onChange,
    errors,
}: {
    initial: LocationValue;
    onChange: (value: LocationValue) => void;
    errors?: LocationErrors;
}) {
  
    const [value, setValue] = useState<LocationValue>(() => ({
        ...initial,
        provinceName: matchCambodiaProvince(initial.provinceName)?.nameEn ?? "",
    }));
    const [reversing, setReversing] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GeocodeResult[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);


    const [mapInstanceKey, setMapInstanceKey] = useState(0);
    useLayoutEffect(() => {
        return () => setMapInstanceKey((key) => key + 1);
    }, []);

    const hasPin = value.lat !== null && value.lng !== null;
    const center: [number, number] = hasPin ? [value.lat as number, value.lng as number] : DEFAULT_CENTER;

    function update(next: Partial<LocationValue>) {
        setValue((prev) => {
            const merged = { ...prev, ...next };
            onChange(merged);
            return merged;
        });
    }

    /** Fired by Enter or the search button, never per keystroke — Nominatim's
     * usage policy rules out autocomplete against the public instance. */
    async function runSearch() {
        const q = query.trim();

        if (!q) {
            return;
        }

        setSearching(true);
        setSearchError(null);
        try {
            const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);

            if (!res.ok) {
                setResults(null);
                setSearchError("Search is unavailable right now. Drop the pin by hand instead.");
                return;
            }

            const found = (await res.json()) as GeocodeResult[];
            setResults(found);

            if (found.length === 0) {
                setSearchError("No places found in Cambodia for that search.");
            }
        } catch {
            setResults(null);
            setSearchError("Couldn't reach the search service. Check your connection.");
        } finally {
            setSearching(false);
        }
    }

    function clearSearch() {
        setResults(null);
        setSearchError(null);
    }

    /** Same shape as a reverse-geocode hit, so the pin, the three name fields
     * and the form's Physical Address all update exactly as a pin drag does. */
    function selectResult(result: GeocodeResult) {
        const matched = matchCambodiaProvince(result.address.provinceName);
        update({
            lat: result.lat,
            lng: result.lon,
            provinceName: matched?.nameEn ?? "",
            districtName: result.address.districtName ?? "",
            communeName: result.address.communeName ?? "",
            address: result.label || undefined,
        });
        setQuery(result.label);
        clearSearch();
    }

    async function reverseGeocode(lat: number, lng: number) {
        setReversing(true);
        try {
            const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
            if (res.ok) {
                const result = (await res.json()) as GeocodeResult;
               
                const matched = matchCambodiaProvince(result.address.provinceName);
                update({
                    lat,
                    lng,
                    provinceName: matched?.nameEn ?? "",
                    districtName: result.address.districtName ?? value.districtName,
                    communeName: result.address.communeName ?? value.communeName,
                    address: result.label || undefined,
                });
                return;
            }
        } catch {
         
        } finally {
            setReversing(false);
        }
        update({ lat, lng });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                {/* Enter is the only trigger — Nominatim's usage policy rules
                    out searching as the merchant types. */}
                {searching ? (
                    <LoaderCircle className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                    type="text"
                    value={query}
                    placeholder="Search a place and press Enter — e.g. Wat Phnom"
                    aria-label="Search for your business location"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        // The picker lives inside the profile form, so Enter
                        // here must search, not save the profile.
                        if (event.key === "Enter") {
                            event.preventDefault();
                            void runSearch();
                        } else if (event.key === "Escape") {
                            clearSearch();
                        }
                    }}
                    className={`${controlClassName} pl-9 ${query ? "pr-9" : ""}`}
                />
                {query ? (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                            setQuery("");
                            clearSearch();
                        }}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-4" />
                    </button>
                ) : null}

                {results && results.length > 0 ? (
                    <ul className="absolute inset-x-0 top-full z-[1001] mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg">
                        {results.map((result) => (
                            <li key={`${result.lat},${result.lon},${result.label}`}>
                                <button
                                    type="button"
                                    onClick={() => selectResult(result)}
                                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                                >
                                    {result.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            {searchError ? (
                <p className="text-xs text-muted-foreground" role="status">
                    {searchError}
                </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="isolate h-64 sm:h-72 md:h-80 w-full overflow-hidden rounded-xl border border-border" style={{ transform: "translateZ(0)" }}>
                    <MapContainer
                        key={mapInstanceKey}
                        center={center}
                        zoom={hasPin ? PIN_ZOOM : DEFAULT_ZOOM}
                        className="h-full w-full"
                        scrollWheelZoom
                        attributionControl={false}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <RecenterOnChange center={center} zoom={PIN_ZOOM} />
                        <MapClickHandler onLocationSelect={reverseGeocode} />
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

                <div className="flex flex-col gap-4">
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
                            <SelectTrigger
                                id="provinceName"
                                aria-invalid={Boolean(errors?.provinceName)}
                                className={`${controlClassName} w-full`}
                            >
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
                        <FieldError message={errors?.provinceName} />
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
                            maxLength={150}
                            aria-invalid={Boolean(errors?.districtName)}
                            onChange={(event) => update({ districtName: event.target.value })}
                            className={controlClassName}
                        />
                        <FieldError message={errors?.districtName} />
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
                            maxLength={150}
                            aria-invalid={Boolean(errors?.communeName)}
                            onChange={(event) => update({ communeName: event.target.value })}
                            className={controlClassName}
                        />
                        <FieldError message={errors?.communeName} />
                    </div>
                </div>
            </div>

            {errors?.coordinates ? (
                <p className="text-xs text-danger" role="alert">
                    {errors.coordinates}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">
                    {reversing
                        ? "Reading the address at that pin…"
                        : "Drag the pin on the map — Province is matched automatically from Cambodia's 25 provinces, and District/Commune fill in on the right and can be corrected by hand."}
                </p>
            )}

            {/* No visible field for these — the pin itself is the input. */}
            <input type="hidden" name="latitude" value={value.lat ?? ""} readOnly />
            <input type="hidden" name="longitude" value={value.lng ?? ""} readOnly />
        </div>
    );
}
