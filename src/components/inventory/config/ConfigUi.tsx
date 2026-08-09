import type { ReactNode } from "react";

import { Lock } from "lucide-react";

/** Shared chrome for the Item Config tabs, so the five read as one screen. */
export function ConfigSection({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5">
                <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </section>
    );
}

/** Marks a row the business may use but never change. */
export function SystemBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="size-3" />
            Built in
        </span>
    );
}

export function ConfigEmpty({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="max-w-md text-sm text-muted-foreground">
                {description}
            </p>
            {action}
        </div>
    );
}

/**
 * The banner every config tab carries while this is a static mock, so nobody
 * files a bug about edits not surviving a refresh.
 */
export function StaticPreviewNotice() {
    return (
        <p
            className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning"
            role="status"
        >
            Preview — sample data, nothing is saved yet. The API is built once
            this layout is approved.
        </p>
    );
}
