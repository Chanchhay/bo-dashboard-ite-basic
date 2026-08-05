"use client";

import * as React from "react";
import { Trash2, AlertTriangle, LoaderCircle } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    variant = "danger",
    isLoading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0f1a12]/50 backdrop-blur-sm transition-opacity duration-200 data-closed:opacity-0 data-open:opacity-100" />
                <DialogPrimitive.Popup
                    data-slot="confirm-dialog-content"
                    className={cn(
                        "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border border-gray-200/80 dark:border-[#282d3c] bg-white dark:bg-[#1a1e29] p-6 text-center shadow-2xl transition-all duration-200 data-closed:scale-95 data-closed:opacity-0 data-open:scale-100 data-open:opacity-100 outline-none sm:p-7",
                    )}
                >
                    {/* Top Icon Badge */}
                    <div
                        className={cn(
                            "mb-4 flex size-12 items-center justify-center rounded-2xl border transition-transform duration-200 hover:scale-105",
                            variant === "danger" &&
                                "border-red-200/80 bg-red-50 text-[#d14341] dark:border-[#d14341]/30 dark:bg-[#d14341]/20 dark:text-[#ff6b6b]",
                            variant === "warning" &&
                                "border-amber-200/80 bg-amber-50 text-[#d99700] dark:border-[#feb90d]/30 dark:bg-[#feb90d]/20 dark:text-[#fbbf24]",
                            variant === "info" &&
                                "border-blue-200/80 bg-blue-50 text-[#00932a] dark:border-[#00932a]/30 dark:bg-[#00932a]/20 dark:text-[#34d399]",
                        )}
                    >
                        {variant === "danger" ? (
                            <Trash2 className="size-6 shrink-0" aria-hidden="true" />
                        ) : (
                            <AlertTriangle className="size-6 shrink-0" aria-hidden="true" />
                        )}
                    </div>

                    {/* Title */}
                    <DialogPrimitive.Title className="text-[17px] font-semibold text-[#16181c] dark:text-[#f8fafc]">
                        {title}
                    </DialogPrimitive.Title>

                    {/* Description */}
                    <DialogPrimitive.Description className="mt-2 text-[14px] leading-relaxed text-[#5c6660] dark:text-[#94a3b8]">
                        {description}
                    </DialogPrimitive.Description>

                    {/* Action Buttons */}
                    <div className="mt-6 grid w-full grid-cols-2 gap-3">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onOpenChange(false)}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 dark:border-[#2c3242] bg-transparent text-[14px] font-medium text-[#16181c] dark:text-[#f8fafc] transition-colors hover:bg-gray-100 dark:hover:bg-[#252a38] disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={handleConfirm}
                            className={cn(
                                "inline-flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-medium text-white shadow-sm transition-colors disabled:opacity-50 outline-none focus-visible:ring-2",
                                variant === "danger" &&
                                    "bg-[#d14341] hover:bg-[#b83836] active:bg-[#a02f2d] focus-visible:ring-[#d14341]",
                                variant === "warning" &&
                                    "bg-[#d99700] hover:bg-[#b57e00] focus-visible:ring-[#d99700]",
                                variant === "info" &&
                                    "bg-[#00932a] hover:bg-[#007a23] focus-visible:ring-[#00932a]",
                            )}
                        >
                            {isLoading && (
                                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
