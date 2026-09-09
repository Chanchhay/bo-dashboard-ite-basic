"use client";

import { useState } from "react";

import { useOfflineImage } from "@/lib/offline/image-cache";
import { cn } from "@/lib/utils";

export const FALLBACK_MARK = "/brand/fluxibiz-mark.png";

export interface ItemImageProps {
    src?: string | null;
    className?: string;
    imageClassName?: string;
    fallbackSrc?: string;
    alt?: string;
}

export function ItemImage({
    src,
    className,
    imageClassName,
    fallbackSrc = FALLBACK_MARK,
    alt = "",
}: ItemImageProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
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
                onError={() => setFailedSrc(src)}
                className={cn("h-full w-full object-cover", imageClassName)}
            />
        </span>
    );
}

