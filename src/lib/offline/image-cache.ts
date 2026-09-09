"use client";

import { useEffect, useState } from "react";

import { offlineDb } from "@/lib/offline/db";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const FETCH_CONCURRENCY = 4;

export type CachedImage = {
    url: string;
    blob: Blob;
    cachedAt: string;
};

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
    }
}

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

export function useOfflineImage(src?: string | null) {
    const [resolved, setResolved] = useState<string | null | undefined>(src);

    useEffect(() => {
        let active = true;

        if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
            setResolved(src);
            return;
        }

        setResolved(src);

        void readCached(src).then((cached) => {
            if (!active || !cached) {
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
