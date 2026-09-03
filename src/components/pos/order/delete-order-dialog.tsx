"use client";

import { LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteOrderDialogProps {
  open: boolean;
  orderName: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteOrderDialog({
  open,
  orderName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteOrderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-[440px] gap-0 rounded-[24px] border border-red-200 dark:border-red-900/40 bg-card p-5 shadow-[0_24px_60px_rgba(15,26,18,0.22)] sm:p-7"
        showCloseButton={false}
      >
        <DialogHeader className="items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <Trash2 className="size-7" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-4 text-2xl font-bold text-foreground">
            Delete order?
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Order <span className="font-semibold text-foreground">{orderName}</span> will be permanently deleted from the database. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="w-full rounded-xl cursor-pointer"
          >
            Keep order
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700 active:scale-98 focus-visible:ring-red-600/30 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <LoaderCircle className="size-4 animate-spin shrink-0" aria-hidden="true" />
                <span>Deleting…</span>
              </>
            ) : (
              "Delete order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
