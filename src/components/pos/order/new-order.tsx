"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";

export interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onCreate: (data: { name: string; comment: string }) => void;
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
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Order name is required");
      return;
    }
    onCreate({ name: name.trim(), comment: comment.trim() });
  };

  const handleCancel = () => {
    setName("");
    setComment("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold">New order</h2>
            <p className="text-sm text-gray-500">
              Name this order to find it easily later
            </p>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">
              Order name <span className="text-accent">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Ex: John, Order 5, Table 2..."
              className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm  placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-xs text-accent">{error}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold ">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notes, instructions..."
              rows={4}
              className="w-full resize-none rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm  placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
            {itemCount} {itemCount === 1 ? "item" : "items"} in cart
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-xl border border-accent py-3 text-sm font-bold text-accent transition-colors hover:bg-accent hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create order"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}