import type { ReactNode } from "react";

import { AlertCircle, LoaderCircle, PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    controlClassName,
    textareaClassName,
} from "@/components/ui/form-controls";

/** Kept as aliases so inventory forms share the app-wide control styling. */
export const inventoryControlClassName = controlClassName;
export const inventoryTextareaClassName = textareaClassName;

export { getApiErrorMessage } from "@/lib/api-error";

export function formatMoney(value: number | undefined) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(value || 0);
}

export function InventoryPageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold text-[#161d16] dark:text-[#f8fafc]">
                    {title}
                </h1>
                <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                    {description}
                </p>
            </div>
            {action}
        </div>
    );
}

export function InventoryLoading({ label = "Loading inventory" }) {
    return (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29]">
            <div className="flex items-center gap-2 text-sm text-[#657064] dark:text-[#94a3b8]">
                <LoaderCircle className="size-4 animate-spin text-primary dark:text-[#10b981]" />
                {label}
            </div>
        </div>
    );
}

export function InventoryError({
    message,
    retry,
}: {
    message: string;
    retry?: () => void;
}) {
    return (
        <div
            className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-accent/20 bg-white dark:bg-[#1a1e29] px-6 text-center"
            role="alert"
        >
            <span className="grid size-10 place-items-center rounded-full bg-accent/10 text-accent">
                <AlertCircle className="size-5" />
            </span>
            <p className="max-w-md text-sm text-[#657064] dark:text-[#94a3b8]">{message}</p>
            {retry ? (
                <Button type="button" variant="link" onClick={retry}>
                    Try again
                </Button>
            ) : null}
        </div>
    );
}

export function InventoryEmpty({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary dark:text-[#10b981]">
                <PackageOpen className="size-5" />
            </span>
            <div>
                <p className="font-semibold text-[#161d16] dark:text-[#f8fafc]">{title}</p>
                <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                    {description}
                </p>
            </div>
        </div>
    );
}
