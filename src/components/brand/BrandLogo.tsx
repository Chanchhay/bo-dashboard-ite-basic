import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGOS = {
    mark: {
        src: "/brand/fluxibiz-mark.png",
        width: 831,
        height: 900,
    },
    wordmark: {
        src: "/brand/fluxibiz-wordmark.png",
        width: 1400,
        height: 326,
    },
    stacked: {
        src: "/brand/fluxibiz-stacked.png",
        width: 908,
        height: 910,
    },
} as const;

export type BrandLogoVariant = keyof typeof LOGOS;

export default function BrandLogo({
    variant = "wordmark",
    alt = "FluxiBiz",
    className,
    preload = false,
}: {
    variant?: BrandLogoVariant;
    alt?: string;
    className?: string;
    preload?: boolean;
}) {
    const logo = LOGOS[variant];

    return (
        <Image
            src={logo.src}
            width={logo.width}
            height={logo.height}
            alt={alt}
            preload={preload}
            className={cn("block h-auto object-contain", className)}
        />
    );
}
