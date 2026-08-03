"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";

export interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onCreate: (data: { name: string }) => void;
  isCreating?: boolean;
}

export function NewOrder({
  open,
  onOpenChange,
  itemCount,
  onCreate,
  isCreating,
}: NewOrderDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Order name is required");
      return;
    }
    onCreate({ name: name.trim() });
  };

  const handleCancel = () => {
    setName("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[768px] gap-0 overflow-y-auto overscroll-contain rounded-[24px] border-0 bg-white p-4 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] sm:max-h-[calc(100dvh-1.5rem)] sm:w-[calc(100vw-1.5rem)] sm:rounded-[30px] sm:p-8 lg:p-10"
        showCloseButton={false}
      >
        <DialogHeader className="relative flex-row items-start gap-3 pr-9 sm:gap-6 sm:pr-14">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dcfce7] bg-[#f0fdf4] sm:size-[74px]">
            <ClipboardList className="size-7 text-primary sm:size-10" aria-hidden="true" />
          </div>
          <div className="text-left">
            <h2 className="text-[22px] font-bold leading-tight text-primary sm:text-4xl sm:leading-10">
              New order
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] sm:mt-2 sm:text-xl sm:leading-7">
              Name this order to find it easily later
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close new order"
            className="absolute -top-1 right-0 grid size-10 place-items-center rounded-full text-[#9ca3af] outline-none transition-colors hover:bg-black/5 hover:text-[#37423b] focus-visible:ring-2 focus-visible:ring-primary/30 sm:size-12"
          >
            <X className="size-6 sm:size-8" aria-hidden="true" />
          </button>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-4 sm:mt-10 sm:gap-8">
          <div className="flex flex-col gap-2 sm:gap-3">
            <label htmlFor="new-order-name" className="text-base font-bold text-[#37423b] sm:text-xl">
              Order name <span className="text-brand-red">*</span>
            </label>
            <input
              id="new-order-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Ex: John, Order 5, Table 2..."
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "new-order-name-error" : undefined}
              className="h-14 w-full rounded-[20px] border-0 bg-[#f3f4f6] px-5 text-base text-[#37423b] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-primary/30 sm:h-16 sm:rounded-[25px] sm:px-6 sm:text-xl"
            />
            {error && <p id="new-order-name-error" className="text-sm text-brand-red">{error}</p>}
          </div>

          <div className="flex h-14 items-center rounded-[20px] bg-[#f3f4f6] px-5 text-base text-[#4b5563] sm:h-16 sm:rounded-[25px] sm:px-6 sm:text-xl">
            {itemCount} {itemCount === 1 ? "item" : "items"} in cart
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-6 sm:pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="h-14 rounded-[22px] text-brand-red font-bold outline-none transition-colors hover:bg-brand-red/5 focus-visible:ring-2 focus-visible:ring-brand-red/30 sm:h-16 sm:rounded-[25px] sm:text-xl border border-brand-red"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="h-14 rounded-[22px] bg-primary text-base font-bold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:bg-primary/30 sm:h-16 sm:rounded-[24px] sm:text-xl"
            >
              {isCreating ? "Creating..." : "Create order"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
