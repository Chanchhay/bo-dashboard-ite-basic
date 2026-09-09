"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function useCharCount(initial = "") {
    const [length, setLength] = useState(initial.length);

    return {
        length,
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setLength(event.target.value.length),
    };
}

export const charCountInputClassName = "pr-14";
export const charCountTextareaClassName = "pb-7";

export function CharCountField({
    length,
    max,
    variant = "input",
    className,
    children,
}: {
    length: number;
    max: number;
    variant?: "input" | "textarea";
    className?: string;
    children: ReactNode;
}) {
    const left = Math.max(0, max - length);

    return (
        <div className={cn("relative", className)}>
            {children}
            <span
                className={cn(
                    "pointer-events-none absolute right-3 text-xs tabular-nums",
                    variant === "textarea"
                        ? "bottom-2.5"
                        : "top-1/2 -translate-y-1/2",
                    left === 0 ? "text-danger" : "text-muted-foreground",
                )}
            >
                {left}/{max}
                <span className="sr-only"> characters left</span>
            </span>
        </div>
    );
}
