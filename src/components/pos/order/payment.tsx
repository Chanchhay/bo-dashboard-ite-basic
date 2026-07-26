"use client";

import { useState } from "react";
import { CreditCard, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/money";
import { Order } from "@/types/pos-type";

type PaymentMethod = "CASH" | "DIGITAL";

export interface PaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onValidate: (method: PaymentMethod) => void;
  isProcessing?: boolean;
}

export function Payment({
  open,
  onOpenChange,
  order,
  onValidate,
  isProcessing,
}: PaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discount_amount);
  const total = parseFloat(order.total);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full p-6">
        <DialogHeader className="flex-row items-center gap-2 space-y-0">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold ">Payment</h2>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-10 pt-2">
          {/* Left: order summary */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wide text-gray-500">
              ORDER SUMMARY
            </h3>

            <div className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(item.unit_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-col gap-3 border-t border-input pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between border-t border-input pt-2 font-semibold ">
                <span>To pay</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Right: total + payment method */}
          <div className="flex flex-col items-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-sm text-gray-500">To pay</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(total)}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2">
              <p className=" text-sm font-bold text-gray-700">
                Payment method
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMethod("CASH")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    method === "CASH"
                      ? "border-secondary bg-amber-50 text-accent"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("DIGITAL")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                    method === "DIGITAL"
                      ? "border-primary bg-green-50 text-primary"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Card
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 pt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1   rounded-xl border border-accent py-3 text-sm font-bold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onValidate(method)}
            disabled={isProcessing}
            className="flex-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Validate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}