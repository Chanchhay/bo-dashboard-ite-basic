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

"use client";

import { useState } from "react";
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
  const [received, setReceived] = useState("");

  const receivedAmount = parseFloat(received || "0");
  const changeToGive = receivedAmount - amountDue;
  const dueSecondary = secondary(amountDue, currency);
  // Change is handed over in cash, so the second currency matters most here.
  const changeSecondary = secondary(Math.max(changeToGive, 0), currency);

  function handleKey(key: string) {
    if (key === "back") {
      setReceived((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "." && received.includes(".")) return;
    if (received.replace(".", "").length >= 9) return;
    setReceived((prev) => prev + key);
  }

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

          {/* Amount entered */}
          <div className="mt-3 flex min-h-16 items-center justify-center rounded-xl border border-[#bbcabf] bg-[#f2f4f6] px-5 py-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] min-[400px]:min-h-[82px] sm:min-h-[94px] sm:py-5">
            <span
              className={`text-3xl font-bold tabular-nums tracking-[-0.02em] sm:text-[40px] ${
                received ? "text-primary" : "text-gray-300"
              }`}
            >
              {format(receivedAmount, currency)}
            </span>
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
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                aria-label={key === "back" ? "Delete last digit" : undefined}
                className={`flex h-12 items-center justify-center rounded-lg bg-[#f2f4f6] text-xl font-semibold text-[#191c1e] shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none transition-colors hover:bg-[#e9ecef] focus-visible:ring-2 focus-visible:ring-primary/30 active:bg-[#e2e6e9] min-[400px]:h-14 sm:h-16 sm:text-2xl ${
                  key === "back" ? "text-brand-red" : ""
                }`}
              >
                {key === "back" ? <Delete className="size-5" aria-hidden="true" /> : key}
              </button>
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
