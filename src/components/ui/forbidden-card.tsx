"use client";

import { ShieldAlert, Lock } from "lucide-react";

export function ForbiddenCard({
    title = "Access Forbidden",
    description = "You do not have permission to access or manage this section. Please contact your system administrator if you require access.",
    className = "",
}: {
    title?: string;
    description?: string;
    className?: string;
}) {
    return (
        <div
            className={`flex min-h-64 flex-col items-center justify-center gap-3.5 rounded-3xl border border-red-200/70 dark:border-red-900/40 bg-card p-8 text-center shadow-2xs ${className}`}
            role="alert"
        >
            <span className="grid size-14 place-items-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shadow-2xs">
                <Lock className="size-7" />
            </span>
            <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                    {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}
