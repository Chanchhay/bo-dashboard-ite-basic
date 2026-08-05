"use client";

import { Building2, Delete, X, Calculator } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { POS_ROUTES, SALES_HOME } from "@/lib/pos-routes";

export function CashRegister({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();

  const [amount, setAmount] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    setAmount((prev) => {
      if (prev === "0.00") {
        return digit === "." ? "0." : digit;
      }
      if (digit === "." && prev.includes(".")) return prev;

      const [, decimals] = prev.split(".");
      if (decimals && decimals.length >= 2) return prev;
      return prev + digit;
    });
  };

  const handleDelete = () => {
    setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0.00"));
  };

  const handleOpenRegister = async () => {
    const openingBalance = Number.parseFloat(amount);

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      toast({
        tone: "error",
        title: "Register not opened",
        description: "Enter the starting cash amount.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingBalance,
          note: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        toast({
          tone: "error",
          title: "Register not opened",
          description: payload?.message ?? "Could not open the register.",
        });
        setIsLoading(false);
        return;
      }

      // Straight to the terminal — the float is counted, the shift has begun.
      // `replace` so Back can't return to a register that is already open.
      router.replace(POS_ROUTES.terminal);
    } catch {
      toast({
        tone: "error",
        title: "Register not opened",
        description: "Could not reach the server. Check your connection.",
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    router.replace(SALES_HOME);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f4f4f5] p-6">
      <div className="w-full max-w-95 rounded-3xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-100">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-sm font-bold tracking-wide">CASH REGISTER</h1>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6">
          <p className="text-center font-medium text-sm text-gray-500">
            Open a new cash register session to continue
          </p>

          {/* Starting cash */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-gray-500">
              STARTING CASH
            </label>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <span className="text-gray-400">$</span>
              <span className="text-lg font-semibold text-gray-800">
                {amount}
              </span>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                disabled={isLoading}
                className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleDigit(".")}
              disabled={isLoading}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
            >
              .
            </button>

            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={isLoading}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-500">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter session notes..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleOpenRegister}
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-transform active:scale-[0.98] active:bg-[#15803d] disabled:opacity-40"
          >
            <Calculator className="h-4 w-4" />
            {isLoading ? "Opening..." : "Open Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
