"use client";

import { Clock, Printer } from "lucide-react";

import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import type { PosOrder, Sale } from "@/lib/api/pos-order";
import { printReceipt } from "@/lib/print-receipt";
import { useMoney } from "@/hooks/useMoney";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import { useGetReceiptQuery } from "@/services/posOrderApi";

export interface PaidReceiptViewProps {
  order: PosOrder;
  sale: Sale;
  onNewOrder: () => void;
}

export function PaidReceiptView({
  order,
  sale,
  onNewOrder,
}: PaidReceiptViewProps) {
  const { format } = useMoney();
  const businessQuery = useGetBusinessProfileQuery();
  const currenciesQuery = useGetBusinessCurrenciesQuery();
  const receiptQuery = useGetReceiptQuery(sale.orderId);
  const isPayLater = sale.paymentMethod === "PAY_LATER";

  if (businessQuery.isLoading) {
    return (
      <div
        className="mx-auto mt-8 h-[680px] w-[calc(100%-2rem)] max-w-[559px] animate-pulse rounded-[7px] bg-white/70"
        aria-label="Loading business receipt"
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center overflow-y-auto bg-[#f5f5f5] px-4 py-6 print:bg-white print:p-0 sm:py-8">
      {isPayLater && (
        <div className="mb-4 flex w-full max-w-[559px] items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 print:hidden">
          <Clock className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">
            Sale closed as Pay later — {format(sale.totalAmount, sale.currency)}{" "}
            still owed. Settle it from Sales → Pay Later.
          </p>
        </div>
      )}
      <ReceiptTicket
        business={businessQuery.data ?? null}
        order={order || receiptQuery.data?.order}
        receipt={receiptQuery.data?.receipt}
        sale={sale}
        currencies={currenciesQuery.data}
      />

      <div className="mt-4 flex w-full max-w-[559px] gap-3 print:hidden">
        <button
          type="button"
          onClick={printReceipt}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#bbcabf] bg-white text-sm font-bold text-[#37423b] outline-none transition-colors hover:bg-[#fbfcfa] focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print
        </button>
        <button
          type="button"
          onClick={onNewOrder}
          className="h-12 flex-1 rounded-xl bg-primary text-sm font-bold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          New order
        </button>
      </div>
    </div>
  );
}
