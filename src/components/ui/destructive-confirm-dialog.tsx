"use client";

import { Info, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * `danger` is the default: deleting, removing, anything unrecoverable. `info`
 * is for confirmations that merely want a beat before an additive action, so
 * they don't borrow the red that should mean "you cannot undo this".
 */
type Tone = "danger" | "info";

/*
 * Fills stay fixed across themes because white ink sits on them — `--brand-red`
 * and `--primary` hold one value in both. The ring and badge use the tokens
 * that lighten in dark, where they are text rather than backgrounds.
 */
const TONES: Record<
    Tone,
    {
        icon: typeof TriangleAlert;
        border: string;
        badge: string;
        confirm: string;
        pendingLabel: string;
    }
> = {
    danger: {
        icon: TriangleAlert,
        border: "border-danger/20",
        badge: "bg-danger/10 text-danger",
        confirm:
            "bg-brand-red text-white hover:bg-brand-red/90 focus-visible:ring-danger/30",
        pendingLabel: "Deleting…",
    },
    info: {
        icon: Info,
        border: "border-primary/20",
        badge: "bg-primary/10 text-primary",
        confirm:
            "bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/30",
        pendingLabel: "Working…",
    },
};

type DestructiveConfirmDialogProps = {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    pendingLabel?: string;
    tone?: Tone;
    isPending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DestructiveConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = "Cancel",
    pendingLabel,
    tone = "danger",
    isPending,
    onOpenChange,
    onConfirm,
}: DestructiveConfirmDialogProps) {
    const { icon: Icon, border, badge, confirm, ...toneDefaults } = TONES[tone];

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
                className={`w-[calc(100vw-2rem)] max-w-[440px] gap-0 rounded-3xl border ${border} bg-card p-5 shadow-[0_24px_60px_rgba(15,26,18,0.22)] sm:p-7`}
                showCloseButton={false}
            >
                <DialogHeader className="items-center text-center">
                    <span
                        className={`grid size-14 place-items-center rounded-2xl ${badge}`}
                    >
                        <Icon className="size-7" aria-hidden="true" />
                    </span>
                    <DialogTitle className="mt-4 text-2xl font-bold text-[#191c1e] dark:text-[#f8fafc]">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 max-w-sm text-sm leading-6 text-[#636b74] dark:text-[#94a3b8]">
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
                        className={`w-full ${confirm}`}
                    >
                        {isPending ? (
                            <>
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                                {pendingLabel ?? toneDefaults.pendingLabel}
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
