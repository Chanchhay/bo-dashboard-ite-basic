"use client";

import { useState } from "react";

import { useOfflineImage } from "@/lib/offline/image-cache";
import { cn } from "@/lib/utils";

/**
 * Shown when an item has no picture of its own.
 *
 * The brand mark rather than a stock photo: a catalogue item without a picture
 * must never be represented by a photograph of something the shop does not
 * sell, which is the same reason the public menu stopped falling back to one.
 */
export const FALLBACK_MARK = "/brand/fluxibiz-mark.png";

export interface ItemImageProps {
    /** The item's picture. Missing or unreachable both show the fallback. */
    src?: string | null;
    /** Box classes — size, radius, margins. Applied whichever is rendered. */
    className?: string;
    /** Extra classes for the picture itself, e.g. hover transforms. */
    imageClassName?: string;
    /** Fallback image URL when src is missing or broken. Defaults to FALLBACK_MARK. */
    fallbackSrc?: string;
    alt?: string;
}

/**
 * An item's picture, with the house fallback behind it.
 *
 * A shop's photos are hosted wherever its catalogue already kept them, so a
 * dead link is as ordinary as a missing one — both land on the fallback rather
 * than the browser's broken-image glyph, on the till and in the back office
 * alike.
 *
 * Decorative throughout: every caller names the item in text beside it.
 */
export function ItemImage({
    src,
    className,
    imageClassName,
    fallbackSrc = FALLBACK_MARK,
    alt = "",
}: ItemImageProps) {
    /*
     * The failed URL, not a boolean: a card that swaps to another item must
     * show that item's picture rather than inherit the previous one's failure,
     * and comparing the URL does that without an effect to reset it.
     */
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    /*
     * The kept copy where the device has one. Fitted here rather than at each
     * of the twenty callers: an item's picture is an item's picture, and the
     * till, the grid and the receipt all want the one that works offline.
     */
    const resolvedSrc = useOfflineImage(src);
    const showFallback = !src || failedSrc === src;

    if (showFallback) {
        return (
            <span
                className={cn(
                    "flex items-center justify-center overflow-hidden bg-muted/70 dark:bg-muted/30",
                    className,
                )}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={fallbackSrc}
                    alt={alt}
                    aria-hidden="true"
                    className="w-2/5 max-w-20 opacity-35 dark:opacity-45"
                />
            </span>
        );
    }

    return (
        <span className={cn("overflow-hidden", className)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={resolvedSrc ?? src}
                alt={alt}
                aria-hidden="true"
                // Keyed on the item's own URL, not the resolved one: a blob
                // that fails is still that item's picture failing.
                onError={() => setFailedSrc(src)}
                className={cn("h-full w-full object-cover", imageClassName)}
            />
        </span>
    );
}

