"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/*
 * Modal surface for the app, built on Base UI's Dialog. Radius, border and
 * shadow follow the card treatment in `ui-registry.md` so a dialog reads as the
 * same material as the surfaces behind it, lifted.
 *
 * `DialogContent` portals to the body, so placing a dialog inside a `<form>` is
 * valid HTML — but React still bubbles events through the component tree, so a
 * nested form must stop propagation on submit.
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
    className,
    children,
    ...props
}: DialogPrimitive.Popup.Props) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0f1a12]/45 backdrop-blur-[1px] transition-opacity duration-150 data-closed:opacity-0 data-open:opacity-100" />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-[#e4eae2] bg-white p-6 shadow-[0_24px_60px_rgba(15,26,18,0.22)] outline-none transition-all duration-150 data-closed:scale-95 data-closed:opacity-0 data-open:scale-100 data-open:opacity-100 sm:p-7",
                    className,
                )}
                {...props}
            >
                {children}
            </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
    );
}

function DialogHeader({
    className,
    ...props
}: React.ComponentProps<"div">) {
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
                "text-xl font-semibold text-[#161d16]",
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
            className={cn("text-sm text-[#657064]", className)}
            {...props}
        />
    );
}

function DialogFooter({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        />
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
};
