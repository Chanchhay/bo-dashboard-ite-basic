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
        darkSrc: "/brand/fluxibiz-dark.png",
        width: 500,
        height: 150,
    },
    stacked: {
        src: "/brand/fluxibiz-stacked.png",
        darkSrc: "/brand/fluxibiz-stacked-dark.png",
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

    if ("darkSrc" in logo && logo.darkSrc) {
        return (
            <>
                <Image
                    src={logo.src}
                    width={logo.width}
                    height={logo.height}
                    alt={alt}
                    preload={preload}
                    className={cn("block dark:hidden h-full w-auto max-h-full max-w-full object-contain shrink-0", className)}
                />
                <Image
                    src={logo.darkSrc}
                    width={logo.width}
                    height={logo.height}
                    alt={alt}
                    preload={preload}
                    className={cn("hidden dark:block h-full w-auto max-h-full max-w-full object-contain shrink-0", className)}
                />
            </>
        );
    }

    return (
        <Image
            src={logo.src}
            width={logo.width}
            height={logo.height}
            alt={alt}
            preload={preload}
            className={cn("block h-full w-auto max-h-full max-w-full object-contain", className)}
        />
    );
}
