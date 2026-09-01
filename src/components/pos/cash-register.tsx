"use client";

import { Building2, Delete, X, Calculator } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useCurrencySymbol } from "@/hooks/useCurrencySymbol";
import { POS_ROUTES, SALES_HOME } from "@/lib/pos-routes";

function sanitizeAmount(raw: string): string {
  if (!raw) return "0";

  // Keep only digits and decimal dot
  let val = raw.replace(/[^0-9.]/g, "");

  // Keep only the first decimal point
  const parts = val.split(".");
  if (parts.length > 2) {
    val = parts[0] + "." + parts.slice(1).join("");
  }

  const [intPart, decPart] = val.split(".");
  // Strip leading zeros before digits e.g. "03233" -> "3233"
  let cleanInt = intPart.replace(/^0+(?=\d)/, "");
  if (cleanInt === "") cleanInt = "0";

  if (decPart !== undefined) {
    return `${cleanInt}.${decPart.slice(0, 2)}`;
  }
  return cleanInt;
}

export type ClosedChannel = {
  channelName: string;
  todayHours?: string;
  summary?: string;
};

export function CashRegister({
  onClose,
  closedChannel,
}: {
  onClose?: () => void;
  /**
   * Set when the POS channel is shut. The drawer cannot be opened while the
   * channel it sells through is closed, so the keypad is inert rather than
   * inviting a count that the server will refuse.
   */
  closedChannel?: ClosedChannel | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { symbol } = useCurrencySymbol();

  const [amount, setAmount] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDigit = (digit: string) => {
    const input = inputRef.current;

    setAmount((prev) => {
      if (prev === "0.00" || prev === "0") {
        return digit === "." ? "0." : digit;
      }

      if (input && document.activeElement === input) {
        const start = input.selectionStart ?? prev.length;
        const end = input.selectionEnd ?? prev.length;

        if (digit === "." && prev.includes(".") && !prev.slice(start, end).includes(".")) {
          return prev;
        }

        const next = prev.slice(0, start) + digit + prev.slice(end);
        const sanitized = sanitizeAmount(next);

        setTimeout(() => {
          const newPos = Math.min(start + 1, sanitized.length);
          input.setSelectionRange(newPos, newPos);
        }, 0);

        return sanitized;
      }

      if (digit === "." && prev.includes(".")) return prev;
      const [, decimals] = prev.split(".");
      if (decimals && decimals.length >= 2) return prev;
      return sanitizeAmount(prev + digit);
    });
  };

  const handleDelete = () => {
    const input = inputRef.current;

    setAmount((prev) => {
      if (input && document.activeElement === input) {
        const start = input.selectionStart ?? prev.length;
        const end = input.selectionEnd ?? prev.length;

        if (start !== end) {
          const next = prev.slice(0, start) + prev.slice(end);
          const sanitized = sanitizeAmount(next);
          setTimeout(() => {
            input.setSelectionRange(start, start);
          }, 0);
          return sanitized;
        }

        if (start > 0) {
          const next = prev.slice(0, start - 1) + prev.slice(start);
          const sanitized = sanitizeAmount(next);
          const newPos = Math.max(0, start - 1);
          setTimeout(() => {
            input.setSelectionRange(newPos, newPos);
          }, 0);
          return sanitized;
        }

        return prev;
      }

      if (prev.length <= 1) return "0";
      return sanitizeAmount(prev.slice(0, -1));
    });
  };

  const handleBlur = () => {
    // Format nicely with 2 decimal places on blur e.g. "3233" -> "3233.00"
    const num = Number.parseFloat(amount);
    if (!Number.isNaN(num) && num >= 0) {
      setAmount(num.toFixed(2));
    } else {
      setAmount("0.00");
    }
  };

  const handleOpenRegister = async () => {
    if (closedChannel) return;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleOpenRegister();
        return;
      }

      if (document.activeElement !== inputRef.current) {
        if (/^[0-9.]$/.test(e.key)) {
          e.preventDefault();
          handleDigit(e.key);
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, handleOpenRegister]);

  return (
    <div data-tour="pos-open-register" className="flex items-center justify-center min-h-screen bg-[#f4f4f5] p-6">
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
            className="text-gray-400 transition-colors hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOpenRegister();
          }}
          className="flex flex-col gap-5 px-6 py-6"
        >
          {closedChannel ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center"
            >
              <p className="text-sm font-bold text-warning">
                {closedChannel.channelName} is closed
              </p>
              <p className="text-xs text-gray-600">
                {closedChannel.todayHours
                  ? `Today: ${closedChannel.todayHours}`
                  : closedChannel.summary}
              </p>
              <p className="text-xs text-gray-500">
                The register cannot be opened while the channel is closed.
              </p>
            </div>
          ) : (
            <p className="text-center font-medium text-sm text-gray-500">
              Open a new cash register session to continue
            </p>
          )}

          {/* Starting cash */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-gray-500">
              STARTING CASH
            </label>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <span className="text-gray-400 font-bold shrink-0">{symbol}</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                onBlur={handleBlur}
                className="w-full bg-transparent text-right text-lg font-semibold text-gray-800 outline-none"
              />
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                disabled={isLoading || Boolean(closedChannel)}
                className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleDigit(".")}
              disabled={isLoading || Boolean(closedChannel)}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              .
            </button>

            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={isLoading || Boolean(closedChannel)}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading || Boolean(closedChannel)}
              className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <Delete className="h-5 w-5 text-brand-red" />
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
            type="submit"
            disabled={isLoading || Boolean(closedChannel)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-transform active:scale-[0.98] active:bg-[#15803d] disabled:opacity-40 cursor-pointer"
          >
            <Calculator className="h-4 w-4" />
            {isLoading ? "Opening..." : "Open Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
