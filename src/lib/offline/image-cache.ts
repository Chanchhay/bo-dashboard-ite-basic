"use client";

import { useEffect, useState } from "react";

import { offlineDb } from "@/lib/offline/db";

/**
 * The catalogue's pictures, kept on the device.
 *
 * A shop's photos are hosted wherever its catalogue already kept them, so with
 * no connection every card falls back to the brand mark and a grid of forty
 * items becomes forty identical tiles. A cashier picks by sight; that is the
 * difference between a till that works offline and one that technically runs.
 *
 * Blobs, in IndexedDB — not localStorage, which holds strings, caps out around
 * five megabytes, and would have to keep every picture base64-encoded at a
 * third again its size.
 */

/** Bigger than this and it is not a thumbnail, whatever it is. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** How many to fetch at once while filling the cache. */
const FETCH_CONCURRENCY = 4;

export type CachedImage = {
    url: string;
    blob: Blob;
    cachedAt: string;
};

/** Object URLs, kept for the life of the page so one blob is decoded once. */
const objectUrls = new Map<string, string>();

function objectUrlFor(url: string, blob: Blob) {
    const existing = objectUrls.get(url);

    if (existing) return existing;

    const created = URL.createObjectURL(blob);

    objectUrls.set(url, created);

    return created;
}

async function readCached(url: string) {
    try {
        return await offlineDb.images.get(url);
    } catch {
        return undefined;
    }
}

/**
 * Fetches a picture and keeps it, unless it is already kept.
 *
 * Failures are silent and leave nothing behind: a picture that cannot be
 * fetched is a card that falls back to the mark, which is what it did before.
 */
export async function cacheImage(url: string) {
    if (!url || url.startsWith("blob:") || url.startsWith("data:")) return;

    if (await readCached(url)) return;

    try {
        const response = await fetch(url, { mode: "cors" });

        if (!response.ok) return;

        const blob = await response.blob();

        if (blob.size === 0 || blob.size > MAX_IMAGE_BYTES) return;
        if (!blob.type.startsWith("image/")) return;

        await offlineDb.images.put({
            url,
            blob,
            cachedAt: new Date().toISOString(),
        });
    } catch {
        // Offline, blocked by CORS, or gone. Nothing to record either way.
    }
}

/**
 * Fills the cache from a catalogue, a few at a time.
 *
 * Sequential batches rather than one big `Promise.all`: this runs while the
 * cashier is serving, and forty parallel image fetches would be competing with
 * the requests that actually matter.
 */
export async function cacheImages(urls: (string | null | undefined)[]) {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];

    for (let index = 0; index < unique.length; index += FETCH_CONCURRENCY) {
        await Promise.all(
            unique
                .slice(index, index + FETCH_CONCURRENCY)
                .map((url) => cacheImage(url)),
        );
    }
}

/**
 * The kept copy of a picture, where there is one.
 *
 * Preferred over the network even when connected: it is already on the device,
 * so it paints on the first frame instead of after a round trip, and the grid
 * stops flickering as the cashier moves between categories. A picture that was
 * never cached falls through to its own URL, and to the mark behind that.
 */
export function useOfflineImage(src?: string | null) {
    const [resolved, setResolved] = useState<string | null | undefined>(src);

    useEffect(() => {
        let active = true;

        if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
            setResolved(src);
            return;
        }

        // The network URL first, so nothing waits on a database read; the
        // cached copy replaces it if there is one, which the browser paints
        // without a flicker because it is the same picture.
        setResolved(src);

        void readCached(src).then((cached) => {
            if (!active || !cached) {
                // Not kept yet. Keep it now, so the next outage has it.
                if (active) void cacheImage(src);
                return;
            }

            setResolved(objectUrlFor(src, cached.blob));
        });

        return () => {
            active = false;
        };
    }, [src]);

    return resolved;
}
