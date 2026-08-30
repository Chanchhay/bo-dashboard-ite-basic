"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

const Slider = SliderPrimitive.Root;

function SliderControl({ className, ...props }: SliderPrimitive.Control.Props) {
    return (
        <SliderPrimitive.Control
            data-slot="slider-control"
            className={cn(
                "relative flex w-full touch-none items-center py-2 select-none",
                className,
            )}
            {...props}
        />
    );
}

function SliderTrack({ className, ...props }: SliderPrimitive.Track.Props) {
    return (
        <SliderPrimitive.Track
            data-slot="slider-track"
            className={cn(
                "relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted",
                className,
            )}
            {...props}
        />
    );
}

function SliderIndicator({ className, ...props }: SliderPrimitive.Indicator.Props) {
    return (
        <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className={cn("h-full rounded-full bg-primary", className)}
            {...props}
        />
    );
}

function SliderThumb({ className, ...props }: SliderPrimitive.Thumb.Props) {
    return (
        <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className={cn(
                "block size-4.5 rounded-full border-2 border-primary bg-white shadow-md outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/25 dark:bg-[#1e2330]",
                className,
            )}
            {...props}
        />
    );
}

export { Slider, SliderControl, SliderTrack, SliderIndicator, SliderThumb };
