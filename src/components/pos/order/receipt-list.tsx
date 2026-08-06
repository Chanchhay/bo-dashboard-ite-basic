"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
} from "lucide-react";

import {
  DateRangeFilter,
  type DateRangePreset,
} from "@/components/pos/order/date-range-filter";
import { EmployeeFilter } from "@/components/pos/order/employee-filter";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMoney } from "@/hooks/useMoney";
import { printReceipt } from "@/lib/print-receipt";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import {
  useGetReceiptQuery,
  useGetReceiptsQuery,
} from "@/services/posOrderApi";

export interface ReceiptsListProps {
  onOpenReceipt: (receiptId: string) => void;
  currentRegisterUser: { id: string; name: string } | null;
  registerCashSales?: number;
  registerCurrency?: string;
}

const PAGE_SIZE = 10;

function getDateRange(preset: DateRangePreset) {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (preset === "yesterday") {
    from.setDate(from.getDate() - 1);
    to.setDate(to.getDate() - 1);
  } else if (preset === "this_week") {
    const daysSinceMonday = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - daysSinceMonday);
  } else if (preset === "this_month") {
    from.setDate(1);
  }

  return { from, to };
}

function formatFilterDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReceiptsList({
  onOpenReceipt,
  currentRegisterUser,
  registerCashSales,
  registerCurrency,
}: ReceiptsListProps) {
  const [page, setPage] = useState(0);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const printTriggeredFor = useRef<string | null>(null);
  const printErrorShownFor = useRef<string | null>(null);
  const { toast } = useToast();
  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);
  const receiptsQuery = useGetReceiptsQuery({
    page,
    size: PAGE_SIZE,
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });
  const businessQuery = useGetBusinessProfileQuery();
  const currenciesQuery = useGetBusinessCurrenciesQuery();
  const { format } = useMoney();
  const printQuery = useGetReceiptQuery(printOrderId ?? "", {
    skip: printOrderId === null,
  });

  useEffect(() => {
    if (
      !printOrderId ||
      !printQuery.currentData ||
      !businessQuery.data ||
      printTriggeredFor.current === printOrderId
    ) {
      return;
    }

    printTriggeredFor.current = printOrderId;
    const handleAfterPrint = () => {
      printTriggeredFor.current = null;
      setPrintOrderId(null);
    };
    const frame = window.requestAnimationFrame(() => printReceipt());

    window.addEventListener("afterprint", handleAfterPrint, { once: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [businessQuery.data, printOrderId, printQuery.currentData]);

  useEffect(() => {
    if (
      !printOrderId ||
      !printQuery.error ||
      printErrorShownFor.current === printOrderId
    ) {
      return;
    }

    printErrorShownFor.current = printOrderId;
    toast({
      tone: "error",
      title: "Could not prepare receipt",
      description: getApiErrorMessage(printQuery.error, "Please try again."),
    });
  }, [printOrderId, printQuery.error, toast]);

  const startPrinting = (orderId: string) => {
    printTriggeredFor.current = null;
    printErrorShownFor.current = null;

    if (printOrderId === orderId && printQuery.error) {
      void printQuery.refetch();
      return;
    }

    setPrintOrderId(orderId);
  };

  if (receiptsQuery.isLoading) {
    return (
      <div className="grid min-h-64 place-items-center p-6 text-sm text-[#636b74]">
        Loading paid receipts…
      </div>
    );
  }

  if (receiptsQuery.error || !receiptsQuery.data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold text-[#37423b]">Could not load receipts</p>
        <p className="max-w-sm text-sm text-[#636b74]">
          {getApiErrorMessage(
            receiptsQuery.error,
            "Check the connection and try again.",
          )}
        </p>
        <button
          type="button"
          onClick={() => void receiptsQuery.refetch()}
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const { content: receipts, page: metadata } = receiptsQuery.data;
  const pageCurrencies = new Set(receipts.map((order) => order.currency));
  const pageTotal = receipts.reduce((sum, order) => sum + order.total, 0);
  const currency =
    receipts[0]?.currency || businessQuery.data?.baseCurrency || "USD";
  // The till's own currency when it recorded one; older sessions have none.
  const cashCurrency =
    registerCurrency || businessQuery.data?.baseCurrency || currency;
  const currentUserOptions = currentRegisterUser ? [currentRegisterUser] : [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1408px] flex-col px-4 pb-5 pt-5 sm:px-8 sm:pt-8 lg:px-12">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-primary sm:text-[32px] sm:leading-10">
          Receipts
        </h1>
        <p className="mt-1 text-sm text-[#636b74] sm:text-base">
          View all terminal transactions and refunds.
        </p>
      </header>

      <div className="mt-6 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:mt-8 lg:grid-cols-3 lg:gap-6">
        <SummaryCard
          label="Total"
          value={
            pageCurrencies.size > 1
              ? "Multiple currencies"
              : format(pageTotal, currency)
          }
          sub={`${receipts.length} shown of ${metadata.totalElements}`}
          icon={<ReceiptText aria-hidden="true" />}
        />
        <SummaryCard
          label="Cash"
          value={
            registerCashSales === undefined
              ? "—"
              : format(registerCashSales, cashCurrency)
          }
          sub="Current register"
          icon={<Banknote aria-hidden="true" />}
        />
        <SummaryCard
          label="KHQR"
          value="—"
          sub="Not exposed by receipts API"
          icon={<QrCode aria-hidden="true" />}
        />
      </div>

      <div className="mt-4 flex w-full items-center gap-2 overflow-x-auto scrollbar-none py-1 sm:gap-3 lg:mt-[26px]">
        <DateRangeFilter
          from={formatFilterDate(dateRange.from)}
          to={formatFilterDate(dateRange.to)}
          preset={datePreset}
          onChange={(preset) => {
            setDatePreset(preset);
            setPage(0);
          }}
        />
        <EmployeeFilter
          employees={currentUserOptions}
          value={currentRegisterUser?.id ?? null}
          onChange={() => undefined}
          allowAll={false}
          emptyLabel="Register user unavailable"
        />
        <button
          type="button"
          onClick={() => void receiptsQuery.refetch()}
          disabled={receiptsQuery.isFetching}
          aria-label="Refresh receipts"
          className="grid size-11 sm:size-[50px] shrink-0 place-items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1e29] text-primary outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
        >
          <RefreshCw
            className={receiptsQuery.isFetching ? "size-4 sm:size-5 animate-spin" : "size-4 sm:size-5"}
            aria-hidden="true"
          />
        </button>
      </div>

      <section
        className="mt-5 flex-none overflow-hidden rounded-xl bg-white shadow-[0_10px_15px_-3px_rgba(15,23,42,0.10)] md:min-h-0 md:flex-1"
        aria-busy={receiptsQuery.isFetching}
      >
        <div className="hidden max-h-full overflow-auto md:block">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="border-b border-[#45464d]/20 bg-white text-left text-[11px] uppercase tracking-[0.1em] text-[#7c839b]">
              <tr>
                {[
                  "Ticket #",
                  "Date / time",
                  "Employee",
                  "Items",
                  "Payment",
                  "Amount",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th key={label} className="h-[66px] px-4 font-bold lg:px-6">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-8 py-16 text-center text-sm text-[#636b74]"
                  >
                    No paid receipts in this date range.
                  </td>
                </tr>
              ) : (
                receipts.map((order) => {
                  const created = order.createdDate
                    ? new Date(order.createdDate)
                    : null;
                  const itemCount = order.items.reduce(
                    (count, item) => count + item.quantity,
                    0,
                  );
                  const isPrinting =
                    printOrderId === order.id && printQuery.isFetching;

                  return (
                    <tr
                      key={order.id}
                      className="h-[90px] border-b border-[#45464d]/10 last:border-b-0 hover:bg-[#fbfcfa]"
                    >
                      <td className="px-4 font-bold text-[#191c1e] lg:px-6">
                        {order.invoiceNumber || `#${order.id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 text-[#45464d] lg:px-6">
                        {created ? (
                          <>
                            <div>{created.toLocaleDateString()}</div>
                            <div className="mt-0.5 text-[11px] text-[#737686]">
                              {created.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="px-4 font-medium text-[#7c839b] lg:px-6"
                        title="Historical cashier is not included in the receipts API"
                      >
                        —
                      </td>
                      <td className="px-4 font-medium text-[#45464d] lg:px-6">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </td>
                      <td
                        className="px-4 font-medium text-[#7c839b] lg:px-6"
                        title="Historical payment method is not included in the receipts API"
                      >
                        —
                      </td>
                      <td className="px-4 text-lg font-bold text-[#191c1e] lg:px-6">
                        {format(order.total, order.currency)}
                      </td>
                      <td className="px-4 lg:px-6">
                        <span className="rounded-full bg-primary/20 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-primary">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startPrinting(order.id)}
                            disabled={isPrinting}
                            aria-label={`Print receipt ${order.invoiceNumber || order.id}`}
                            className="grid size-10 place-items-center rounded-lg text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-40"
                          >
                            <Printer className="size-[18px]" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(order.id)}
                            aria-label={`Open receipt ${order.invoiceNumber || order.id}`}
                            className="grid size-10 place-items-center rounded-lg text-[#7c839b] outline-none transition-colors hover:bg-[#f5f5f5] hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                          >
                            <ExternalLink className="size-[18px]" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#45464d]/10 md:hidden">
          {receipts.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-[#636b74]">
              No paid receipts in this date range.
            </p>
          ) : (
            receipts.map((order) => {
              const created = order.createdDate
                ? new Date(order.createdDate)
                : null;
              const itemCount = order.items.reduce(
                (count, item) => count + item.quantity,
                0,
              );

              return (
                <article key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(order.id)}
                      className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    >
                      <p className="truncate text-sm font-bold text-[#191c1e]">
                        {order.invoiceNumber || `#${order.id.slice(0, 8)}`}
                      </p>
                      <p className="mt-0.5 text-xs text-[#737686]">
                        {created ? created.toLocaleString() : "Date unavailable"}
                      </p>
                    </button>
                    <span className="shrink-0 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold text-primary">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#636b74]">
                    <span>
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                    <span className="text-base font-bold text-[#191c1e]">
                      {format(order.total, order.currency)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#bbcabf] pt-3">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(order.id)}
                      className="min-h-10 rounded-lg px-2 text-xs font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25"
                    >
                      View receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => startPrinting(order.id)}
                      disabled={printOrderId === order.id && printQuery.isFetching}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-40"
                    >
                      <Printer className="size-4" aria-hidden="true" />
                      Print
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex min-h-[90px] flex-col gap-3 border-t border-[#45464d]/10 px-4 py-4 text-xs text-[#45464d] sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:text-sm">
          <span className="flex items-center gap-2">
            Show
            <span className="grid h-9 min-w-14 place-items-center rounded-lg border border-[#d9d9d9] bg-white font-medium">
              {PAGE_SIZE}
            </span>
            / {metadata.totalElements} results
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={metadata.number <= 0 || receiptsQuery.isFetching}
              aria-label="Previous receipts page"
              className="grid size-9 place-items-center rounded-lg text-[#737686] outline-none hover:bg-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-white">
              {metadata.number + 1}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                metadata.number + 1 >= metadata.totalPages ||
                receiptsQuery.isFetching
              }
              aria-label="Next receipts page"
              className="grid size-9 place-items-center rounded-lg text-[#737686] outline-none hover:bg-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-30"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {printOrderId && printQuery.currentData && businessQuery.data && (
        <ReceiptTicket
          className="fixed left-[-10000px] top-0"
          business={businessQuery.data}
          order={printQuery.currentData.order}
          receipt={printQuery.currentData.receipt}
          currencies={currenciesQuery.data}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-h-[166px] rounded-xl border border-[#c6c6cd] bg-white px-6 pb-7 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-base font-semibold uppercase leading-4 tracking-[0.075em] text-primary sm:text-[23px]">
            {label}
          </span>
          <p className="mt-3 truncate text-[30px] font-semibold leading-[1.35] text-[#d14341]">
            {value}
          </p>
          <p className="mt-2 text-sm text-[#45464d]">{sub}</p>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-6">
          {icon}
        </div>
      </div>
    </div>
  );
}
