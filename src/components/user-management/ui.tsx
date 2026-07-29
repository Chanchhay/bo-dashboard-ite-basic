import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { controlClassName } from "@/components/ui/form-controls";

export const fieldClassName = controlClassName;

export function Panel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn("rounded-[24px] bg-white p-6 lg:p-7", className)}
        >
            {children}
        </section>
    );
}

export function PanelHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h2 className="text-[17px] font-medium text-[#16181c]">
                    {title}
                </h2>
                <p className="mt-1 text-[14px] text-[#8a8f89]">{description}</p>
            </div>
            {action}
        </div>
    );
}

export function LoadingState({ label }: { label: string }) {
    return (
        <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-2 text-[14px] text-[#8a8f89]"
        >
            <LoaderCircle
                className="size-4 animate-spin text-[#00932a]"
                aria-hidden="true"
            />
            {label}
        </div>
    );
}

export function ErrorState({
    message,
    retry,
}: {
    message: string;
    retry?: () => void;
}) {
    return (
        <div
            role="alert"
            className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center"
        >
            <span className="grid size-10 place-items-center rounded-full bg-[#fdeceb] text-[#b3352f]">
                <AlertCircle className="size-5" aria-hidden="true" />
            </span>
            <p className="max-w-md text-[14px] text-[#5c6660]">{message}</p>
            {retry && (
                <Button type="button" variant="link" onClick={retry}>
                    Try again
                </Button>
            )}
        </div>
    );
}

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-[15px] text-[#16181c]">{title}</p>
            <p className="text-[14px] text-[#8a8f89]">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]",
                active
                    ? "bg-[#e6f4ea] text-[#00591c]"
                    : "bg-[#f2f3f1] text-[#5c6660]",
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    "size-1.5 rounded-full",
                    active ? "bg-[#00932a]" : "bg-[#8a8f89]",
                )}
            />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

export function FormField({
    label,
    htmlFor,
    error,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={htmlFor}
                className="text-[13px] font-medium text-[#16181c]"
            >
                {label}
            </label>
            {children}
            {error ? (
                <p
                    id={`${htmlFor}-error`}
                    className="text-[12px] text-[#b3352f]"
                >
                    {error}
                </p>
            ) : hint ? (
                <p
                    id={`${htmlFor}-hint`}
                    className="text-[12px] text-[#8a8f89]"
                >
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
