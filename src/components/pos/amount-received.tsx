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
import { formatCurrency } from "@/lib/money";

export interface AmountReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  onValidate: (receivedAmount: number) => void;
  isProcessing?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

export function AmountReceived({
  open,
  onOpenChange,
  amountDue,
  onValidate,
  isProcessing,
}: AmountReceivedDialogProps) {
  const [received, setReceived] = useState("");

  const receivedAmount = parseFloat(received || "0");
  const changeToGive = receivedAmount - amountDue;

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
        className="flex w-full max-h-[90vh] flex-col gap-0 bg-white p-0 sm:max-w-sm"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Amount received</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable middle content */}
        <div className="scrollbar-hide flex-1 overflow-y-auto scroll-smooth px-4 sm:px-6">
          {/* To pay */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">To pay</span>
            <span className="font-semibold text-primary">
              {formatCurrency(amountDue)}
            </span>
          </div>

          {/* Amount entered */}
          <div className="mt-3 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-4">
            <span
              className={`text-2xl font-bold tabular-nums ${
                received ? "text-primary" : "text-gray-300"
              }`}
            >
              {formatCurrency(receivedAmount)}
            </span>
          </div>

          {/* Change to give */}
          <div className="mt-3 flex flex-col items-center gap-1 rounded-xl bg-green-50 py-3">
            <span className="text-xs text-gray-500">Change to give</span>
            <span className="text-xl font-bold text-accent">
              {formatCurrency(Math.max(changeToGive, 0))}
            </span>
          </div>

          {/* Keypad */}
          <div className="mt-4 grid grid-cols-3 gap-2 pb-4">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                className="flex items-center justify-center rounded-xl border border-gray-200 py-3 text-lg font-semibold transition-colors hover:bg-gray-50 active:scale-[0.98]"
              >
                {key === "back" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-3 px-4 pb-5 pt-3 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl border border-accent py-3 text-sm font-bold text-accent transition-colors hover:bg-red-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onValidate(receivedAmount)}
            disabled={isProcessing || receivedAmount < amountDue}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Validate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}