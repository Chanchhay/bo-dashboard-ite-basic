"use client";

import { ArrowLeft, Printer, Banknote, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/money";

export interface ReceiptDetailViewProps {
  receiptId: string;
  onBack: () => void;
}

export function ReceiptDetailView({ receiptId, onBack }: ReceiptDetailViewProps) {
  const receipt: any = { business_name: "Mock Business", ticket_number: "T-123", sold_at: new Date().toISOString(), cashier_name: "John Doe", items: [], subtotal: 0, discount_amount: 0, total: 0, method_type: "CASH", received_amount: 0, change_amount: 0, status: "PAID" };
  const isLoading = false;

  return (
    <div className="flex h-full flex-col bg-[#f4f4f5]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Back to receipts</span>
          <span className="sm:hidden">Back</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white active:scale-[0.98] sm:px-4"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Ticket */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-0 sm:py-8">
        {isLoading || !receipt ? (
          <div className="text-center text-sm text-gray-400">
            Loading receipt...
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-lg font-extrabold text-gray-900">
                {receipt.business_name}
              </h1>
              <p className="text-xs text-gray-400">
                Ticket {receipt.ticket_number}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(receipt.sold_at).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            <div className="flex justify-between border-t border-dashed border-gray-300 pt-3 text-xs text-gray-500">
              <span>Served by</span>
              <span className="font-semibold text-gray-800">
                {receipt.cashier_name}
              </span>
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-2 border-t border-dashed border-gray-300 pt-3">
              {receipt.items.map((item: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-700">
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatCurrency(
                      parseFloat(item.unit_price) * item.quantity -
                        parseFloat(item.discount_amount)
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex flex-col gap-1.5 border-t border-dashed border-gray-300 pt-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discount_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="flex flex-col gap-1.5 border-t border-dashed border-gray-300 pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  {receipt.method_type === "CASH" ? (
                    <Banknote className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {receipt.method_type === "CASH" ? "Cash" : "Card"}
                </span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(receipt.total)}
                </span>
              </div>
              {receipt.method_type === "CASH" &&
                receipt.received_amount !== null && (
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>Received</span>
                      <span>{formatCurrency(receipt.received_amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Change</span>
                      <span>{formatCurrency(receipt.change_amount ?? 0)}</span>
                    </div>
                  </>
                )}
            </div>

            <div className="mt-2 flex justify-center">
              <span className="rounded-full bg-green-100 px-4 py-1 text-xs font-bold text-primary">
                {receipt.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}