"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const IMPORT_STEPS = [
    "Choose data",
    "Upload",
    "Match columns",
    "Check data",
    "Review",
    "Import",
] as const;

/**
 * Where the shop is in the migration, and how much is left.
 *
 * Steps already done are clickable so a mistaken column match can be gone back
 * to; steps ahead are not, because each one needs what the one before it
 * produced.
 */
export function ImportStepper({
    current,
    furthest,
    onStepClick,
}: {
    current: number;
    furthest: number;
    onStepClick?: (step: number) => void;
}) {
    return (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {IMPORT_STEPS.map((label, index) => {
                const done = index < current;
                const active = index === current;
                const reachable = index <= furthest && index !== current;

                return (
                    <li key={label} className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={!reachable}
                            onClick={reachable ? () => onStepClick?.(index) : undefined}
                            aria-current={active ? "step" : undefined}
                            className={cn(
                                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                                active && "bg-primary text-primary-foreground",
                                !active && done && "text-foreground hover:bg-accent",
                                !active && !done && "text-muted-foreground",
                                reachable ? "cursor-pointer" : "cursor-default",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                                    active && "bg-primary-foreground/20",
                                    !active && done && "bg-[var(--success)] text-white",
                                    !active && !done && "bg-muted",
                                )}
                            >
                                {done ? <Check className="size-3" /> : index + 1}
                            </span>
                            <span className="whitespace-nowrap">{label}</span>
                        </button>

                        {index < IMPORT_STEPS.length - 1 ? (
                            <span aria-hidden className="hidden h-px w-4 bg-border sm:block" />
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}
