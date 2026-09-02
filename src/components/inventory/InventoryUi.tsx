import type { ReactNode } from "react";

import { AlertCircle, LoaderCircle, PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    controlClassName,
    textareaClassName,
} from "@/components/ui/form-controls";

export const inventoryControlClassName = controlClassName;
export const inventoryTextareaClassName = textareaClassName;

export { getApiErrorMessage } from "@/lib/api-error";

import { cn } from "@/lib/utils";

export function InventoryPageHeader({
    title,
    description,
    action,
    className,
}: {
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-start justify-between gap-3 sm:gap-4 w-full", className)}>
            <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {title}
                </h1>
                {description ? (
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? (
                <div className="flex items-center gap-2 shrink-0">
                    {action}
                </div>
            ) : null}
        </div>
    );
}

import { TableSkeleton } from "@/components/ui/skeleton";

export function InventoryLoading({ label = "Loading inventory" }: { label?: string }) {
    return (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <TableSkeleton rows={6} cols={5} />
        </div>
    );
}

import { ForbiddenCard } from "@/components/ui/forbidden-card";
import { isForbiddenError } from "@/lib/api-error";

export function InventoryError({
    message,
    retry,
    error,
}: {
    message: string;
    retry?: () => void;
    error?: unknown;
}) {
    const isForbidden =
        isForbiddenError(error) ||
        message.includes("403") ||
        message.toLowerCase().includes("forbidden");

    if (isForbidden) {
        return <ForbiddenCard />;
    }

    return (
        <div
            className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-danger/20 bg-card px-6 text-center"
            role="alert"
        >
            <span className="grid size-10 place-items-center rounded-full bg-danger/10 text-danger">
                <AlertCircle className="size-5" />
            </span>
            <p className="max-w-md text-sm text-muted-foreground">{message}</p>
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
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-success">
                <PackageOpen className="size-5" />
            </span>
            <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}
