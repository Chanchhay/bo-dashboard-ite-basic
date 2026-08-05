"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type DestructiveConfirmDialogProps = {
    open: boolean;
    title: string;
    description: React.ReactNode;
    cancelLabel: string;
    confirmLabel: string;
    pendingLabel?: string;
    isPending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DestructiveConfirmDialog({
    open,
    title,
    description,
    cancelLabel,
    confirmLabel,
    pendingLabel = "Deleting…",
    isPending,
    onOpenChange,
    onConfirm,
}: DestructiveConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isPending) {
                    onOpenChange(nextOpen);
                }
            }}
        >
            <DialogContent
                className="w-[calc(100vw-2rem)] max-w-[440px] gap-0 rounded-3xl border border-danger/20 bg-card p-5 shadow-[0_24px_60px_rgba(15,26,18,0.22)] sm:p-7"
                showCloseButton={false}
            >
                <DialogHeader className="items-center text-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
                        <TriangleAlert className="size-7" aria-hidden="true" />
                    </span>
                    <DialogTitle className="mt-4 text-2xl font-bold text-[#191c1e]">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 max-w-sm text-sm leading-6 text-[#636b74]">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid sm:grid-cols-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="w-full"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        onClick={onConfirm}
                        disabled={isPending}
                        className="w-full bg-brand-red text-white hover:bg-brand-red/90 focus-visible:ring-danger/30"
                    >
                        {isPending ? (
                            <>
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                                {pendingLabel}
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
