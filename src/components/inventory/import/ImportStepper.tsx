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
        <div className="w-full overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <ol className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max sm:min-w-0 sm:flex-wrap">
                {IMPORT_STEPS.map((label, index) => {
                    const done = index < current;
                    const active = index === current;
                    const reachable = index <= furthest && index !== current;

                    return (
                        <li key={label} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                                type="button"
                                disabled={!reachable}
                                onClick={reachable ? () => onStepClick?.(index) : undefined}
                                aria-current={active ? "step" : undefined}
                                className={cn(
                                    "flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                                    active && "bg-primary text-primary-foreground font-semibold shadow-xs",
                                    !active && done && "text-foreground hover:bg-muted/80 bg-muted/40",
                                    !active && !done && "text-muted-foreground bg-muted/20",
                                    reachable ? "cursor-pointer" : "cursor-default",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex size-4.5 sm:size-5 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold",
                                        active && "bg-primary-foreground/20 text-white",
                                        !active && done && "bg-success text-white",
                                        !active && !done && "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {done ? <Check className="size-2.5 sm:size-3 stroke-[3]" /> : index + 1}
                                </span>
                                <span>{label}</span>
                            </button>

                            {index < IMPORT_STEPS.length - 1 ? (
                                <span aria-hidden className="h-px w-3 sm:w-4 bg-border shrink-0" />
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
