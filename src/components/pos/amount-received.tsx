"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export function AmountReceived({
  open,
  onOpenChange,
  amountDue,
  currency,
  onValidate,
  isProcessing,
}: AmountReceivedDialogProps) {
  const { format, secondary } = useMoney();
  const [inputValue, setInputValue] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus & select input when modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setInputValue("");
      setActiveKey(null);
    }
  }

  const receivedAmount = parseFloat(inputValue || "0");
  const changeToGive = receivedAmount - amountDue;
  const dueSecondary = secondary(amountDue, currency);
  const changeSecondary = secondary(Math.max(changeToGive, 0), currency);
  const isSufficient = receivedAmount >= amountDue;

  // Insert or delete at exact cursor position
  const handleKey = useCallback(
    (key: string) => {
      const input = inputRef.current;
      if (!input) {
        if (key === "back") {
          setInputValue((prev) => prev.slice(0, -1));
        } else if (key === "clear") {
          setInputValue("");
        } else if (key === "." && !inputValue.includes(".")) {
          setInputValue((prev) => prev + ".");
        } else if (/^[0-9]$/.test(key)) {
          setInputValue((prev) => (prev === "0" ? key : prev + key));
        }
        return;
      }

      const start = input.selectionStart ?? inputValue.length;
      const end = input.selectionEnd ?? inputValue.length;

      if (key === "back") {
        if (start !== end) {
          // Range selected: remove selected portion
          const next = inputValue.slice(0, start) + inputValue.slice(end);
          setInputValue(next);
          setTimeout(() => {
            input.focus();
            input.setSelectionRange(start, start);
          }, 0);
        } else if (start > 0) {
          // Remove single character before cursor
          const next = inputValue.slice(0, start - 1) + inputValue.slice(start);
          setInputValue(next);
          setTimeout(() => {
            input.focus();
            input.setSelectionRange(start - 1, start - 1);
          }, 0);
        }
        return;
      }

      if (key === "clear") {
        setInputValue("");
        setTimeout(() => input.focus(), 0);
        return;
      }

      if (key === ".") {
        if (inputValue.includes(".") && !(start <= inputValue.indexOf(".") && end > inputValue.indexOf("."))) {
          return;
        }
      }

      if (/^[0-9]|\.$/.test(key)) {
        if (inputValue.replace(".", "").length >= 9 && start === end) return;

        const next = inputValue.slice(0, start) + key + inputValue.slice(end);
        setInputValue(next);
        setTimeout(() => {
          input.focus();
          const newPos = start + key.length;
          input.setSelectionRange(newPos, newPos);
        }, 0);
      }
    },
    [inputValue]
  );

  const handleValidate = useCallback(() => {
    if (isSufficient && !isProcessing) {
      onValidate(receivedAmount);
    }
  }, [isSufficient, isProcessing, onValidate, receivedAmount]);

  // Keyboard Enter / Escape navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleValidate();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleValidate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[440px] flex-col gap-0 overflow-hidden rounded-[24px] border border-[#bbcabf] bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.24)] outline-none"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#bbcabf]  px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Banknote className="size-[18px]" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-primary">
              Amount received
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close amount received"
            className="grid size-8 place-items-center rounded-full text-[#6a6e6c] outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body - Fits screen without scroll */}
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {/* To pay */}
          <div className="flex items-center justify-between text-base sm:text-lg">
            <span className="font-semibold text-[#3c4a42]">To pay</span>
            <span className="flex flex-col items-end">
              <span className="text-xl font-bold text-primary sm:text-[24px]">
                {format(amountDue, currency)}
              </span>
              {dueSecondary && (
                <span className="text-xs font-medium text-[#3c4a42]">
                  {format(dueSecondary.amount, dueSecondary.currency.code)}
                </span>
              )}
            </span>
          </div>

          {/* Amount entered - Real input field with cursor support! */}
          <div className="relative flex h-14 items-center justify-center rounded-xl border border-[#bbcabf] bg-[#f2f4f6] px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] sm:h-16">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setInputValue(val);
                }
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-center text-2xl font-bold tabular-nums text-primary placeholder:text-gray-300 outline-none sm:text-3xl"
            />
          </div>

          {/* Change to give */}
          <div className="flex h-20 flex-col items-center justify-center gap-0.5 rounded-lg border border-[#006c49]/10 bg-[#006c49]/5 px-4 py-2 sm:h-22">
            <span className="text-sm font-medium text-[#3c4a42]">Change to give</span>
            <span className="text-2xl font-black text-brand-red sm:text-3xl">
              {format(Math.max(changeToGive, 0), currency)}
            </span>
            {changeSecondary && (
              <span className="text-xs font-bold text-[#3c4a42]">
                {format(changeSecondary.amount, changeSecondary.currency.code)}
              </span>
            )}
          </div>

          {/* Keypad Grid (3x4) */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key) => {
              const isActive = activeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleKey(key)}
                  aria-label={key === "back" ? "Delete digit at cursor" : undefined}
                  className={`flex h-11 items-center justify-center rounded-lg bg-[#f2f4f6] text-xl font-semibold text-[#191c1e] shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none transition-all hover:bg-[#e9ecef] focus-visible:ring-2 focus-visible:ring-primary/30 active:bg-[#e2e6e9] active:scale-[0.97] sm:h-12 ${
                    key === "back" ? "text-brand-red" : ""
                  } ${isActive ? "ring-2 ring-primary bg-[#e2e6e9] scale-[0.97]" : ""}`}
                >
                  {key === "back" ? <Delete className="size-5" aria-hidden="true" /> : key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#bbcabf]/50 px-4 pb-4 pt-3 sm:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 rounded-[18px] border border-brand-red text-base font-semibold text-brand-red outline-none transition-colors hover:bg-brand-red/5 focus-visible:ring-2 focus-visible:ring-brand-red/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={isProcessing || receivedAmount < amountDue}
            className="h-12 rounded-[18px] border border-primary bg-primary text-base font-semibold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:border-primary/30 disabled:bg-primary/30"
          >
            {isProcessing ? "Processing..." : "Validate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
