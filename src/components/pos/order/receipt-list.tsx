"use client";

import { useState } from "react";
import {
  ClipboardList,
  Banknote,
  CreditCard,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { useGetReceiptsQuery } from "@/features/order/receipt-api";
import { EmployeeFilter } from "./employee-filter";
import { DateRangeFilter, DateRangePreset } from "./date-range-filter";

// TODO: replace with real staff/cashier list once that table exists
const MOCK_EMPLOYEES = [
  { id: "1", name: "Sok Sok" },
  { id: "2", name: "Nita Sok" },
];

export interface ReceiptsListProps {
  onOpenReceipt: (receiptId: string) => void;
}

function presetToDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "this_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case "custom":
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function ReceiptsList({ onOpenReceipt }: ReceiptsListProps) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const { from, to } = presetToDateRange(datePreset);

  const { data, isLoading } = useGetReceiptsQuery({
    from,
    to,
    cashierId: employeeId ?? undefined,
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-gray-400">Loading receipts...</div>;
  }

  const { receipts, summary, totalResults, page } = data;

  return (
    <div className="flex h-full flex-col px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-green-600 sm:text-2xl">
          Receipts
        </h1>
        <p className="text-sm text-gray-500">
          View all terminal transactions and refunds.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
        <SummaryCard
          label="Total"
          value={formatCurrency(summary.total)}
          sub={`${summary.receiptCount} receipts`}
          icon={<ClipboardList className="h-4 w-4 text-green-700" />}
        />
        <SummaryCard
          label="Cash"
          value={formatCurrency(summary.cash)}
          icon={<Banknote className="h-4 w-4 text-green-700" />}
        />
        <SummaryCard
          label="Card"
          value={formatCurrency(summary.card)}
          icon={<CreditCard className="h-4 w-4 text-green-700" />}
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
          <DateRangeFilter
            from={new Date(from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            to={new Date(to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            preset={datePreset}
            onChange={setDatePreset}
          />
          <EmployeeFilter
            employees={MOCK_EMPLOYEES}
            value={employeeId}
            onChange={setEmployeeId}
          />
        </div>
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table — md and up */}
      <div className="mt-4 hidden flex-1 overflow-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
            <tr>
              <th className="p-3 font-semibold">Ticket #</th>
              <th className="p-3 font-semibold">Date/Time</th>
              <th className="p-3 font-semibold">Employee</th>
              <th className="p-3 font-semibold">Items</th>
              <th className="p-3 font-semibold">Payment</th>
              <th className="p-3 font-semibold">Amount</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => {
              const date = new Date(r.sold_at);
              return (
                <tr
                  key={r.id}
                  onClick={() => onOpenReceipt(r.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-3 font-bold text-gray-800">
                    {r.ticket_number}
                  </td>
                  <td className="p-3 text-gray-600">
                    <div>
                      {date.toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="p-3 text-gray-700">{r.cashier_name}</td>
                  <td className="p-3 text-gray-600">
                    {r.item_count} item{r.item_count === 1 ? "" : "(s)"}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5 text-green-600">
                      {r.method_type === "CASH" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {r.method_type === "CASH" ? "Cash" : "Card"}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-gray-900">
                    {formatCurrency(r.amount, "")} €
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card list — below md, replaces the table */}
     {/* Card list — below md, replaces the table */}
<div className="scrollbar-hide mt-4 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden md:hidden">
        <div className="divide-y divide-gray-100">
          {receipts.map((r) => {
            const date = new Date(r.sold_at);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpenReceipt(r.id)}
                className="flex w-full flex-col gap-2 p-4 text-left active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {r.ticket_number}
                    </p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      })}
                      {" · "}
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    {r.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{r.cashier_name}</span>
                  <span>
                    {r.item_count} item{r.item_count === 1 ? "" : "(s)"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                    {r.method_type === "CASH" ? (
                      <Banknote className="h-3.5 w-3.5" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    {r.method_type === "CASH" ? "Cash" : "Card"}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(r.amount, "")} €
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <span>Show 10 / {totalResults} total results</span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">
            {page} Page/1
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
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
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">
          {label}
        </span>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
      <p className="mt-1.5 truncate text-base font-bold text-accent sm:mt-2 sm:text-2xl">
        {value}
      </p>
      {sub && (
        <p className="mt-1 hidden text-xs text-gray-500 sm:block">{sub}</p>
      )}
    </div>
  );
}