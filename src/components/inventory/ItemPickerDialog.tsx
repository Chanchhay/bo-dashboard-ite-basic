"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PickerOption = {
    id: string;
    label: string;
    hint?: string;
    disabled?: boolean;
};
export function ItemPickerDialog({
    open,
    onOpenChange,
    title,
    description,
    options,
    emptyMessage,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    options: readonly PickerOption[];
    emptyMessage: string;
    onPick: (id: string) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {options.length === 0 ? (
                    <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </p>
                ) : (
                    <ul className="mt-5 flex flex-col gap-2">
                        {options.map((option) => (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    disabled={option.disabled}
                                    onClick={() => {
                                        onPick(option.id);
                                        onOpenChange(false);
                                    }}
                                    className="w-full rounded-xl border border-border px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <p className="font-medium text-foreground">
                                        {option.label}
                                    </p>
                                    {option.hint ? (
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {option.hint}
                                        </p>
                                    ) : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <DialogFooter className="mt-5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
