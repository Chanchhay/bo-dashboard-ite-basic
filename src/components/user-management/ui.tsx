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
            className={cn("rounded-[24px] bg-white dark:bg-[#1a1e29] border border-transparent dark:border-[#242937] p-6 lg:p-7 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]", className)}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-medium text-[#16181c] dark:text-[#f8fafc]">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-1 text-[13px] sm:text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? (
                <div className="flex justify-end shrink-0 sm:justify-start">
                    {action}
                </div>
            ) : null}
        </div>
    );
}

export function LoadingState({ label }: { label: string }) {
    return (
        <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-2 text-[14px] text-[#8a8f89] dark:text-[#94a3b8]"
        >
            <LoaderCircle
                className="size-4 animate-spin text-[#00932a] dark:text-[#10b981]"
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
            <span className="grid size-10 place-items-center rounded-full bg-[#fdeceb] dark:bg-[#d14341]/20 text-[#b3352f] dark:text-[#f87171]">
                <AlertCircle className="size-5" aria-hidden="true" />
            </span>
            <p className="max-w-md text-[14px] text-[#5c6660] dark:text-[#94a3b8]">{message}</p>
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
            <p className="text-[15px] text-[#16181c] dark:text-[#f8fafc]">{title}</p>
            <p className="text-[14px] text-[#8a8f89] dark:text-[#94a3b8]">{description}</p>
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
                    ? "bg-[#e6f4ea] dark:bg-[#10b981]/20 text-[#00591c] dark:text-[#34d399]"
                    : "bg-[#f2f3f1] dark:bg-[#252a38] text-[#5c6660] dark:text-[#94a3b8]",
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    "size-1.5 rounded-full",
                    active ? "bg-[#00932a] dark:bg-[#10b981]" : "bg-[#8a8f89] dark:bg-[#64748b]",
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
                className="text-[13px] font-medium text-[#16181c] dark:text-[#cbd5e1]"
            >
                {label}
            </label>
            {children}
            {error ? (
                <p
                    id={`${htmlFor}-error`}
                    className="text-[12px] text-[#b3352f] dark:text-[#f87171]"
                >
                    {error}
                </p>
            ) : hint ? (
                <p
                    id={`${htmlFor}-hint`}
                    className="text-[12px] text-[#8a8f89] dark:text-[#94a3b8]"
                >
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
