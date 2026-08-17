"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Banknote, X, Delete } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMoney } from "@/hooks/useMoney";

export interface AmountReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  /** The order's own currency, which a base-currency change must not relabel. */
  currency?: string;
  onValidate: (receivedAmount: number) => void;
  isProcessing?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

const KeypadButton = memo(function KeypadButton({
  label,
  onPress,
}: {
  label: string;
  onPress: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPress(label)}
      style={{ touchAction: "manipulation" }}
      aria-label={label === "back" ? "Delete last digit" : undefined}
      className={`flex h-12 items-center justify-center rounded-lg bg-[#f2f4f6] text-xl font-semibold text-[#191c1e] shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none transition-transform duration-75 hover:bg-[#e9ecef] active:scale-[0.96] active:bg-[#e2e6e9] min-[400px]:h-14 sm:h-16 sm:text-2xl ${
        label === "back" ? "text-brand-red" : ""
      }`}
    >
      {label === "back" ? <Delete className="size-5" aria-hidden="true" /> : label}
    </button>
  );
});

export function AmountReceived({
  open,
  onOpenChange,
  amountDue,
  currency,
  onValidate,
  isProcessing,
}: AmountReceivedDialogProps) {
  const { format, secondary } = useMoney();
  const [received, setReceived] = useState("");
  const receivedRef = useRef(received);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  useEffect(() => {
    receivedRef.current = received;
  }, [received]);

  // Reset while rendering rather than in an effect: the cleared field is what
  // the freshly opened dialog should paint, not a second render after it.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReceived("");
  }

  // Put the caret in the field so the cashier can type straight away without
  // reaching for the mouse.
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Keypad presses insert at the caret rather than always appending, so a
  // mistyped digit in the middle can be fixed without clearing the field.
  const handleKey = useCallback((key: string) => {
    const input = inputRef.current;
    const value = receivedRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;

    const commit = (next: string, caret: number) => {
      setReceived(next);
      receivedRef.current = next;
      setTimeout(() => {
        input?.focus();
        input?.setSelectionRange(caret, caret);
      }, 0);
    };

    if (key === "back") {
      if (start !== end) {
        commit(value.slice(0, start) + value.slice(end), start);
      } else if (start > 0) {
        commit(value.slice(0, start - 1) + value.slice(start), start - 1);
      }
      return;
    }

    const selectionCoversDot =
      value.includes(".") &&
      start <= value.indexOf(".") &&
      end > value.indexOf(".");
    if (key === "." && value.includes(".") && !selectionCoversDot) return;

    if (start === end && value.replace(".", "").length >= 9) return;

    commit(value.slice(0, start) + key + value.slice(end), start + key.length);
  }, []);

  const receivedAmount = parseFloat(received || "0");
  const changeToGive = receivedAmount - amountDue;
  const dueSecondary = secondary(amountDue, currency);
  // Change is handed over in cash, so the second currency matters most here.
  const changeSecondary = secondary(Math.max(changeToGive, 0), currency);

  // Digits, the separator and backspace are the input's own job now. Only the
  // two keys that act on the dialog rather than the field are caught here.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const currentVal = parseFloat(receivedRef.current || "0");
        if (!isProcessing && currentVal >= amountDue) {
          onValidate(currentVal);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, amountDue, isProcessing, onValidate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[480px] flex-col gap-0 overflow-hidden rounded-[30px] border border-[#bbcabf] bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.24)]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#bbcabf] bg-[#eff1f3] px-4 sm:h-[70px] sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Banknote className="size-[18px]" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-primary sm:text-xl">
              Amount received
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close amount received"
            className="grid size-9 place-items-center rounded-full text-[#3c4a42] outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable middle content */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 py-3 sm:px-6 sm:py-5">
          {/* To pay */}
          <div className="flex items-center justify-between text-base sm:text-lg">
            <span className="font-semibold text-[#3c4a42]">To pay</span>
            <span className="flex flex-col items-end">
              <span className="text-xl font-bold text-primary sm:text-[25px]">
                {format(amountDue, currency)}
              </span>
              {dueSecondary && (
                <span className="text-sm font-medium text-[#3c4a42]">
                  {format(dueSecondary.amount, dueSecondary.currency.code)}
                </span>
              )}
            </span>
          </div>

          {/* Amount entered — a real input, so the caret can be moved and the
              value pasted, not just appended to. */}
          <div className="mt-3 flex min-h-16 items-center justify-center rounded-xl border border-[#bbcabf] bg-[#f2f4f6] px-5 py-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] min-[400px]:min-h-[82px] sm:min-h-[94px] sm:py-5">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              aria-label="Amount received"
              value={received}
              onChange={(e) => {
                const next = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(next)) setReceived(next);
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-center text-3xl font-bold tabular-nums tracking-[-0.02em] text-primary outline-none placeholder:text-gray-300 sm:text-[40px]"
            />
          </div>

          {/* Change to give */}
          <div className="mt-3 flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-[#006c49]/10 bg-[#006c49]/5 px-5 py-3 min-[400px]:min-h-[96px] sm:min-h-[109px] sm:gap-3">
            <span className="text-base text-[#3c4a42] sm:text-lg">Change to give</span>
            <span className="text-3xl font-black text-brand-red sm:text-[40px]">
              {format(Math.max(changeToGive, 0), currency)}
            </span>
            {changeSecondary && (
              <span className="text-lg font-bold text-[#3c4a42]">
                {format(changeSecondary.amount, changeSecondary.currency.code)}
              </span>
            )}
          </div>

          {/* Keypad */}
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {KEYS.map((key) => (
              <KeypadButton key={key} label={key} onPress={handleKey} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-[#bbcabf]/50 px-4 pb-4 pt-3 min-[360px]:grid-cols-2 min-[360px]:gap-3 sm:gap-4 sm:px-8 sm:pb-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-14 rounded-[20px] border border-brand-red text-base font-semibold text-brand-red outline-none transition-colors hover:bg-brand-red/5 focus-visible:ring-2 focus-visible:ring-brand-red/30 sm:text-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onValidate(receivedAmount)}
            disabled={isProcessing || receivedAmount < amountDue}
            className="h-14 rounded-[20px] border border-primary bg-primary text-base font-semibold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:border-primary/30 disabled:bg-primary/30 sm:text-lg"
          >
            {isProcessing ? "Processing..." : "Validate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
