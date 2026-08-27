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

interface CancelOrderDialogProps {
  open: boolean;
  orderName: string;
  isCancelling: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CancelOrderDialog({
  open,
  orderName,
  isCancelling,
  onOpenChange,
  onConfirm,
}: CancelOrderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isCancelling) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-[440px] gap-0 rounded-[24px] border border-red-100 dark:border-red-900/40 bg-card p-5 shadow-[0_24px_60px_rgba(15,26,18,0.22)] sm:p-7"
        showCloseButton={false}
      >
        <DialogHeader className="items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-brand-red">
            <TriangleAlert className="size-7" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-4 text-2xl font-bold text-foreground">
            Cancel order?
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">{orderName}</span>{" "}
            will be cancelled. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
            className="w-full"
          >
            Keep order
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onConfirm}
            disabled={isCancelling}
            className="w-full bg-brand-red text-white hover:bg-brand-red/90 focus-visible:ring-brand-red/30"
          >
            {isCancelling ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Cancelling...
              </>
            ) : (
              "Cancel order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
