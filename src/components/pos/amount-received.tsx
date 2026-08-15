<<<<<<< HEAD
// "use client";

// import { useState } from "react";
// import { Banknote, X, Delete } from "lucide-react";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { formatCurrency } from "@/lib/money";

// export interface AmountReceivedDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   amountDue: number;
//   onValidate: (receivedAmount: number) => void;
//   isProcessing?: boolean;
// }

// const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

// export function AmountReceived({
//   open,
//   onOpenChange,
//   amountDue,
//   onValidate,
//   isProcessing,
// }: AmountReceivedDialogProps) {
//   const [received, setReceived] = useState("");

//   const receivedAmount = parseFloat(received || "0");
//   const changeToGive = receivedAmount - amountDue;

//   function handleKey(key: string) {
//     if (key === "back") {
//       setReceived((prev) => prev.slice(0, -1));
//       return;
//     }
//     if (key === "." && received.includes(".")) return;
//     if (received.replace(".", "").length >= 9) return;
//     setReceived((prev) => prev + key);
//   }

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent
//         className="sm:max-w-sm w-full bg-white max-h-[90vh] flex flex-col gap-0 p-0"
//         showCloseButton={false}
//       >
//         {/* Header */}
//         <div className="flex shrink-0 items-center justify-between px-6 pt-6">
//           <div className="flex items-center gap-2">
//             <Banknote className="h-5 w-5 text-primary" />
//             <h2 className="text-base font-bold ">
//               Amount received
//             </h2>
//           </div>
//           <button
//             type="button"
//             onClick={() => onOpenChange(false)}
//             className="text-gray-400 transition-colors hover:text-gray-600"
//           >
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         {/* Scrollable middle content */}
//         <div className="flex-1 overflow-y-auto scroll-smooth px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
//           {/* To pay */}
//           <div className="mt-4 flex items-center justify-between text-sm">
//             <span className="text-gray-500">To pay</span>
//             <span className="font-semibold text-primary">
//               {formatCurrency(amountDue)}
//             </span>
//           </div>

//           {/* Amount entered */}
//           <div className="mt-3 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 py-4">
//             <span
//               className={`text-2xl font-bold tabular-nums ${
//                 received ? "text-primary" : "text-gray-300"
//               }`}
//             >
//               {formatCurrency(receivedAmount)}
//             </span>
//           </div>

//           {/* Change to give */}
//           <div className="mt-3 flex flex-col items-center gap-1 rounded-xl bg-green-50 py-3">
//             <span className="text-xs text-gray-500">Change to give</span>
//             <span
//               className={`text-xl font-bold ${
//                 changeToGive < 0 ? "text-accent" : "text-accent"
//               }`}
//             >
//               {formatCurrency(Math.max(changeToGive, 0))}
//             </span>
//           </div>

//           {/* Keypad */}
//           <div className="mt-4 grid grid-cols-3 gap-2 pb-4">
//             {KEYS.map((key) => (
//               <button
//                 key={key}
//                 type="button"
//                 onClick={() => handleKey(key)}
//                 className="flex items-center justify-center rounded-xl border border-gray-200 py-3 text-lg font-semibold  transition-colors hover:bg-gray-50 active:scale-[0.98]"
//               >
//                 {key === "back" ? <Delete className="h-5 w-5" /> : key}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="flex shrink-0 gap-3 px-6 pb-6 pt-3">
//           <button
//             type="button"
//             onClick={() => onOpenChange(false)}
//             className="flex-1 rounded-xl border border-accent py-3 text-sm font-bold text-accent transition-colors hover:bg-red-50"
//           >
//             Cancel
//           </button>
//           <button
//             type="button"
//             onClick={() => onValidate(receivedAmount)}
//             disabled={isProcessing || receivedAmount < amountDue}
//             className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
//           >
//             {isProcessing ? "Processing..." : "Validate"}
//           </button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

import { memo, useCallback, useEffect, useRef, useState } from "react";
=======
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
>>>>>>> 8d6ace14c638ceeb7c6e92b60b742db2bc34735e
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
<<<<<<< HEAD
  const [received, setReceived] = useState("");
  const receivedRef = useRef(received);

  useEffect(() => {
    receivedRef.current = received;
  }, [received]);

  // Reset input when dialog opens
  useEffect(() => {
    if (open) {
      setReceived("");
      receivedRef.current = "";
    }
  }, [open]);

  const handleKey = useCallback((key: string) => {
    setReceived((prev) => {
      if (key === "back") {
        return prev.slice(0, -1);
      }
      if (key === ".") {
        if (prev.includes(".")) return prev;
        return prev ? prev + "." : "0.";
      }
      if (prev.replace(".", "").length >= 9) return prev;
      return prev + key;
    });
  }, []);
=======
  const [inputValue, setInputValue] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
>>>>>>> 8d6ace14c638ceeb7c6e92b60b742db2bc34735e

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

<<<<<<< HEAD
  // Listen for physical keyboard events when modal is open (without tearing down on every keystroke)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      } else if (key === "." || key === ",") {
        e.preventDefault();
        handleKey(".");
      } else if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        handleKey("back");
      } else if (key === "Enter") {
        e.preventDefault();
        const currentVal = parseFloat(receivedRef.current || "0");
        if (!isProcessing && currentVal >= amountDue) {
          onValidate(currentVal);
        }
      } else if (key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKey, amountDue, isProcessing, onValidate, onOpenChange]);
=======
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
>>>>>>> 8d6ace14c638ceeb7c6e92b60b742db2bc34735e

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

<<<<<<< HEAD
          {/* Keypad */}
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {KEYS.map((key) => (
              <KeypadButton key={key} label={key} onPress={handleKey} />
            ))}
=======
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
                  {key === "back" ? <Delete className="size-5 text-brand-red" aria-hidden="true" /> : key}
                </button>
              );
            })}
>>>>>>> 8d6ace14c638ceeb7c6e92b60b742db2bc34735e
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
