"use client";

import { ArrowLeft, Printer, RefreshCw } from "lucide-react";

import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { getApiErrorMessage } from "@/lib/api-error";
import { printReceipt } from "@/lib/print-receipt";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import { useGetReceiptQuery } from "@/services/posOrderApi";

export interface ReceiptDetailViewProps {
  receiptId: string;
  onBack: () => void;
}

export function ReceiptDetailView({
  receiptId,
  onBack,
}: ReceiptDetailViewProps) {
  const receiptQuery = useGetReceiptQuery(receiptId);
  const businessQuery = useGetBusinessProfileQuery();
  const currenciesQuery = useGetBusinessCurrenciesQuery();
  const isLoading = receiptQuery.isLoading || businessQuery.isLoading;
  const error = receiptQuery.error || businessQuery.error;

  return (
    <div className="flex min-h-full flex-col bg-[#f5f5f5] print:bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d9d9d9] bg-white px-4 py-3 print:hidden sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#636b74] outline-none hover:bg-[#f5f5f5] hover:text-[#191c1e] focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back to receipts</span>
          <span className="sm:hidden">Back</span>
        </button>
        <button
          type="button"
          onClick={printReceipt}
          disabled={!receiptQuery.data || !businessQuery.data}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-40"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print
        </button>
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto px-4 py-6 print:overflow-visible print:p-0 sm:py-8">
        {isLoading ? (
          <div
            className="h-[680px] w-full max-w-[559px] animate-pulse rounded-[7px] bg-white/70"
            aria-label="Loading receipt"
          />
        ) : error || !receiptQuery.data || !businessQuery.data ? (
          <div className="flex min-h-64 max-w-sm flex-col items-center justify-center gap-3 text-center">
            <p className="font-semibold text-[#37423b]">Could not load receipt</p>
            <p className="text-sm text-[#636b74]">
              {getApiErrorMessage(error, "Check the connection and try again.")}
            </p>
            <button
              type="button"
              onClick={() => {
                void receiptQuery.refetch();
                void businessQuery.refetch();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : (
          <ReceiptTicket
            business={businessQuery.data}
            order={receiptQuery.data.order}
            receipt={receiptQuery.data.receipt}
            currencies={currenciesQuery.data}
          />
        )}
      </div>
    </div>
  );
}
