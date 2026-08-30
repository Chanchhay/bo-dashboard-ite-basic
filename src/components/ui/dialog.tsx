"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

/*
 * Modal surface for the app, built on Base UI's Dialog. Radius, border and
 * shadow follow the card treatment in `ui-registry.md` so a dialog reads as the
 * same material as the surfaces behind it, lifted.
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: DialogPrimitive.Backdrop.Props) {
    return (
        <DialogPrimitive.Backdrop
            data-slot="dialog-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-[#0f1a12]/45 backdrop-blur-[1px]",
                className,
            )}
            {...props}
        />
    );
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: DialogPrimitive.Popup.Props & {
    showCloseButton?: boolean;
}) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0f1a12]/45 backdrop-blur-[1px]" />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] text-[#16181c] dark:text-[#f8fafc] p-6 shadow-[0_24px_60px_rgba(15,26,18,0.22)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] outline-none sm:p-7",
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog-close"
                        render={
                            <Button
                                variant="ghost"
                                className="absolute top-5 right-5 text-gray-500"
                                size="icon-sm"
                            />
                        }
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-1", className)}
            {...props}
        />
    );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn(
                "text-xl font-semibold text-[#161d16] dark:text-[#f8fafc]",
                className,
            )}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: DialogPrimitive.Description.Props) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn(
                "text-sm text-[#657064] dark:text-[#94a3b8]",
                className,
            )}
            {...props}
        />
    );
}

function DialogFooter({
    className,
    showCloseButton = false,
    children,
    ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        >
            {children}
            {showCloseButton && (
                <DialogPrimitive.Close render={<Button variant="outline" />}>
                    Close
                </DialogPrimitive.Close>
            )}
        </div>
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogOverlay,
    DialogPortal,
};
