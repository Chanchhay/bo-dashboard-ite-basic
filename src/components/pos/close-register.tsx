"use client";

import { useState } from "react";
import { X, Delete, Calculator, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrencySymbol } from "@/hooks/useCurrencySymbol";
import { useMoney } from "@/hooks/useMoney";
import { POS_ROUTES } from "@/lib/pos-routes";

export interface CloseRegisterProps {
  cashierName: string;
  openedAt: string; // e.g. "24/07/2026 - 08:12"
  openingAmount: number;
  revenue: number;
  /** The currency this till is counted in, fixed when it opened. */
  currency?: string;
  orderCount: number;
  onConfirm: (totalCounted: number) => void;
  isProcessing?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

export function CloseRegister({
  cashierName,
  openedAt,
  openingAmount,
  revenue,
  currency,
  orderCount,
  onConfirm,
  isProcessing,
}: CloseRegisterProps) {
  const { format } = useMoney();
  const { symbol: baseSymbol } = useCurrencySymbol(currency);
  const symbol = baseSymbol;
  const router = useRouter();
  const [counted, setCounted] = useState("");

  const totalExpected = openingAmount + revenue;
  const totalCounted = parseFloat(counted || "0");
  const totalDifferent = totalCounted - totalExpected;

  function handleKey(key: string) {
    if (key === "back") {
      setCounted((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "." && counted.includes(".")) return;
    if (counted.replace(".", "").length >= 9) return;
    setCounted((prev) => prev + key);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden p-4">
      <div className="flex w-full max-w-md max-h-full flex-col rounded-3xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-100">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-sm font-bold tracking-wide">CASH REGISTER</h1>
          </div>
          {/* Explicit destination, not `back()` — arriving here by redirect
              would otherwise send the cashier somewhere unrelated. Backing out
              of a count returns to the till with the shift still open. */}
          <button
            type="button"
            onClick={() => router.replace(POS_ROUTES.terminal)}
            aria-label="Back to the till"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — no scroll, sized to fit */}
        <div className="flex-1 px-6 min-h-0">
          <p className="pt-3 text-center text-sm text-gray-500">
            Close the current cash register session
          </p>

          <div className="mt-3 flex flex-col gap-2 border-b border-input pb-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Opened by</span>
              <span className="font-semibold">{cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Opened at</span>
              <span className="font-semibold">{openedAt}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 border-b border-input pb-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Opening amount</span>
              <span className="font-semibold">
                {format(openingAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue</span>
              <span className="font-semibold">{format(revenue, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Orders</span>
              <span className="font-semibold">{orderCount}</span>
            </div>
          </div>

          <div className="mt-2 flex justify-between text-sm">
            <span className="font-semibold text-primary">Total Expected</span>
            <span className="text-lg font-bold text-primary">
              {format(totalExpected, currency)}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-xs font-bold tracking-wide text-gray-500">
              TOTAL COUNTED
            </p>
            <div className="flex items-center justify-between rounded-xl bg-gray-100 px-4 py-2.5">
              <span className="text-xl font-bold text-gray-400">{symbol}</span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  counted ? "text-black" : "text-gray-300"
                }`}
              >
                {counted ? counted : "0.00"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Different</span>
              <span
                className={`font-semibold ${
                  totalDifferent < 0
                    ? "text-brand-red"
                    : totalDifferent > 0
                      ? "text-primary"
                      : "text-gray-500"
                }`}
              >
                {totalDifferent >= 0 ? "+" : "-"}
                {format(Math.abs(totalDifferent), currency)}
              </span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 pb-3">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                className="flex items-center justify-center rounded-xl border border-gray-200 py-2.5 text-lg font-semibold transition-colors hover:bg-gray-50 active:scale-[0.98]"
              >
                {key === "back" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 px-6 pb-4 pt-1">
          <button
            type="button"
            onClick={() => onConfirm(totalCounted)}
            disabled={isProcessing || !counted}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" />
            {isProcessing ? "Closing..." : "Close Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
