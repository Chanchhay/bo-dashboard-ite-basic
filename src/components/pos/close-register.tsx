"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Delete,
  Calculator,
  Building2,
  ArrowRightLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMoney } from "@/hooks/useMoney";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import { POS_ROUTES } from "@/lib/pos-routes";

function sanitizeAmount(raw: string, maxDecimals: number): string {
  if (!raw) return "";

  let val = raw.replace(maxDecimals > 0 ? /[^0-9.]/g : /[^0-9]/g, "");
  if (!val) return "";

  if (maxDecimals > 0) {
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }

    const [intPart, decPart] = val.split(".");
    let cleanInt = intPart.replace(/^0+(?=\d)/, "");
    if (cleanInt === "" && decPart !== undefined) cleanInt = "0";

    if (decPart !== undefined) {
      return `${cleanInt}.${decPart.slice(0, maxDecimals)}`;
    }
    return cleanInt;
  }

  return val.replace(/^0+(?=\d)/, "");
}

export type CloseRegisterData = {
  actualAmount: number;
  baseActualAmount?: number;
  secondaryCurrency?: string;
  secondaryActualAmount?: number;
  secondaryExchangeRate?: number;
  closingNote?: string;
};

export interface CloseRegisterProps {
  cashierName: string;
  /**
   * Anyone who joined the drawer after it was opened.
   */
  joinedCashiers?: string[];
  openedAt: string;
  openingAmount: number;
  baseOpeningAmount?: number | null;
  secondaryCurrency?: string | null;
  secondaryOpeningAmount?: number | null;
  secondaryExchangeRate?: number | null;
  note?: string | null;
  revenue: number;
  /** The currency this till is counted in, fixed when it opened. */
  currency?: string;
  orderCount: number;
  onConfirm: (data: CloseRegisterData) => void;
  isProcessing?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function CloseRegister({
  cashierName,
  joinedCashiers = [],
  openedAt,
  openingAmount,
  baseOpeningAmount,
  secondaryCurrency: secondaryCurrencyProp,
  secondaryOpeningAmount,
  secondaryExchangeRate: secondaryExchangeRateProp,
  note,
  revenue,
  currency,
  orderCount,
  onConfirm,
  isProcessing,
}: CloseRegisterProps) {
  const router = useRouter();
  const { format } = useMoney();

  const { data: config } = useGetBusinessCurrenciesQuery();

  const baseCode = (currency || config?.baseCurrency || "USD").toUpperCase();
  const baseCurrency = config?.currencies?.find(
    (c) => c.code.toUpperCase() === baseCode
  );
  const baseSymbol = baseCurrency?.symbol || "$";
  const baseDecimals = baseCurrency?.decimalPlaces ?? 2;

  // Currencies configured in BO that are not the base currency
  const nonBaseCurrencies = (config?.currencies || []).filter(
    (c) => c.code.toUpperCase() !== baseCode
  );

  const defaultSecondaryCode =
    secondaryCurrencyProp?.toUpperCase() ||
    (config?.displayCurrency &&
    config.displayCurrency.toUpperCase() !== baseCode
      ? config.displayCurrency.toUpperCase()
      : nonBaseCurrencies[0]?.code?.toUpperCase() || "");

  const [selectedSecondaryCode, setSelectedSecondaryCode] = useState<string>(
    defaultSecondaryCode
  );

  useEffect(() => {
    if (!selectedSecondaryCode && defaultSecondaryCode) {
      setSelectedSecondaryCode(defaultSecondaryCode);
    }
  }, [defaultSecondaryCode, selectedSecondaryCode]);

  const activeSecondaryCurrency =
    nonBaseCurrencies.find(
      (c) =>
        c.code.toUpperCase() ===
        (selectedSecondaryCode || defaultSecondaryCode).toUpperCase()
    ) ||
    (secondaryCurrencyProp
      ? {
          code: secondaryCurrencyProp.toUpperCase(),
          symbol: secondaryCurrencyProp.toUpperCase() === "KHR" ? "៛" : secondaryCurrencyProp,
          exchangeRate: secondaryExchangeRateProp || 1,
          decimalPlaces: secondaryCurrencyProp.toUpperCase() === "KHR" ? 0 : 2,
        }
      : undefined);

  const hasSecondary = Boolean(activeSecondaryCurrency);
  const secondarySymbol = activeSecondaryCurrency?.symbol || "";
  const secondaryExchangeRate =
    secondaryExchangeRateProp ||
    Number(activeSecondaryCurrency?.exchangeRate) ||
    1;
  const secondaryDecimals = activeSecondaryCurrency?.decimalPlaces ?? 0;

  const [activeField, setActiveField] = useState<"base" | "secondary">("base");
  const [baseAmount, setBaseAmount] = useState("");
  const [secondaryAmount, setSecondaryAmount] = useState("");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");

  const baseInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currencyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currencyDropdownOpen]);

  // Focus active input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      baseInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const numBase = Number.parseFloat(baseAmount) || 0;
  const numSecondary = Number.parseFloat(secondaryAmount) || 0;

  // Real-time conversion: (secondary / exchangeRate)
  const convertedSecondaryToBase =
    hasSecondary && secondaryExchangeRate > 0
      ? numSecondary / secondaryExchangeRate
      : 0;

  const totalCounted = numBase + convertedSecondaryToBase;
  const totalExpected = openingAmount + revenue;
  const totalDifferent = totalCounted - totalExpected;

  const handleDigit = useCallback(
    (digit: string) => {
      if (activeField === "base") {
        const input = baseInputRef.current;
        setBaseAmount((prev) => {
          if (!prev) {
            return digit === "." ? "0." : digit;
          }
          if (digit === "." && prev.includes(".")) return prev;
          const next = prev + digit;
          return sanitizeAmount(next, baseDecimals);
        });
        if (input) input.focus();
      } else {
        if (digit === "." && secondaryDecimals === 0) return;
        const input = secondaryInputRef.current;
        setSecondaryAmount((prev) => {
          if (!prev) {
            return digit === "." ? "0." : digit;
          }
          if (digit === "." && prev.includes(".")) return prev;
          const next = prev + digit;
          return sanitizeAmount(next, secondaryDecimals);
        });
        if (input) input.focus();
      }
    },
    [activeField, baseDecimals, secondaryDecimals]
  );

  const handleDelete = useCallback(() => {
    if (activeField === "base") {
      setBaseAmount((prev) => {
        if (!prev || prev.length <= 1) return "";
        return sanitizeAmount(prev.slice(0, -1), baseDecimals);
      });
      baseInputRef.current?.focus();
    } else {
      setSecondaryAmount((prev) => {
        if (!prev || prev.length <= 1) return "";
        return sanitizeAmount(prev.slice(0, -1), secondaryDecimals);
      });
      secondaryInputRef.current?.focus();
    }
  }, [activeField, baseDecimals, secondaryDecimals]);

  const handleBlur = (field: "base" | "secondary") => {
    if (field === "base") {
      if (!baseAmount) return;
      const num = Number.parseFloat(baseAmount);
      if (!Number.isNaN(num) && num > 0) {
        setBaseAmount(num.toFixed(baseDecimals));
      } else {
        setBaseAmount("");
      }
    } else {
      if (!secondaryAmount) return;
      const num = Number.parseFloat(secondaryAmount);
      if (!Number.isNaN(num) && num > 0) {
        setSecondaryAmount(
          secondaryDecimals > 0
            ? num.toFixed(secondaryDecimals)
            : String(Math.floor(num))
        );
      } else {
        setSecondaryAmount("");
      }
    }
  };

  const handleConfirm = useCallback(() => {
    if (isProcessing) return;
    if (!baseAmount && !secondaryAmount) return;

    const noteBreakdown =
      hasSecondary && numSecondary > 0
        ? `Closing Count: ${baseSymbol}${numBase.toFixed(baseDecimals)} ${baseCode} + ${secondarySymbol}${numSecondary.toLocaleString()} ${activeSecondaryCurrency!.code} (@ ${secondaryExchangeRate})`
        : undefined;

    const fullClosingNote = [noteBreakdown, closingNotes.trim()]
      .filter(Boolean)
      .join(" | ");

    onConfirm({
      actualAmount: Number(totalCounted.toFixed(baseDecimals)),
      baseActualAmount: numBase,
      secondaryCurrency:
        hasSecondary && numSecondary > 0
          ? activeSecondaryCurrency!.code
          : undefined,
      secondaryActualAmount:
        hasSecondary && numSecondary > 0 ? numSecondary : undefined,
      secondaryExchangeRate:
        hasSecondary && numSecondary > 0 ? secondaryExchangeRate : undefined,
      closingNote: fullClosingNote || undefined,
    });
  }, [
    isProcessing,
    baseAmount,
    secondaryAmount,
    hasSecondary,
    numSecondary,
    baseSymbol,
    numBase,
    baseDecimals,
    baseCode,
    secondarySymbol,
    activeSecondaryCurrency,
    secondaryExchangeRate,
    closingNotes,
    onConfirm,
    totalCounted,
  ]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.replace(POS_ROUTES.terminal);
        return;
      }

      if (
        document.activeElement !== baseInputRef.current &&
        document.activeElement !== secondaryInputRef.current
      ) {
        if (/^[0-9.]$/.test(e.key)) {
          e.preventDefault();
          handleDigit(e.key);
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, handleConfirm, router]);

  const hasAnyInput = Boolean(baseAmount || secondaryAmount);

  return (
    <div
      data-tour="pos-close-register"
      className="flex min-h-screen items-center justify-center bg-[#f4f4f5] p-3 sm:p-6"
    >
      <div className="flex w-full max-w-[460px] max-h-[95vh] flex-col rounded-[24px] sm:rounded-3xl bg-white shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-[#eff1f3]/90 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide">
                CLOSE CASH REGISTER
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">
                Base Currency: {baseCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.replace(POS_ROUTES.terminal)}
            aria-label="Back to the till"
            className="grid size-8 place-items-center rounded-lg text-gray-400 outline-none transition-colors hover:bg-gray-200/60 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form / Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col gap-3">
          {/* Shift Details Summary Card */}
          <div className="rounded-2xl border border-gray-200/70 bg-gray-50/60 p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Opened by</span>
              <span className="font-semibold text-gray-900">
                {cashierName}
                {joinedCashiers.length > 0 && ` (+${joinedCashiers.join(", ")})`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Opened at</span>
              <span className="font-semibold text-gray-900">{openedAt}</span>
            </div>
            <div className="flex justify-between items-start text-gray-600">
              <div className="flex flex-col">
                <span>Opening Cash</span>
                {secondaryOpeningAmount != null &&
                  secondaryOpeningAmount > 0 &&
                  secondaryCurrencyProp && (
                    <span className="text-[10px] text-gray-400">
                      inc. {format(secondaryOpeningAmount, secondaryCurrencyProp)}
                    </span>
                  )}
              </div>
              <span className="font-semibold text-gray-900">
                {format(openingAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Cash Sales ({orderCount} orders)</span>
              <span className="font-semibold text-gray-900">
                {format(revenue, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60 font-bold text-sm">
              <span className="text-gray-700">Expected Total</span>
              <span className="text-primary tabular-nums">
                {format(totalExpected, currency)}
              </span>
            </div>
          </div>

          <p className="text-center font-medium text-xs text-gray-500">
            Count and input cash in drawer by currency
          </p>

          {/* Cash Inputs */}
          <div className="flex flex-col gap-2.5">
            {/* Primary Cash (Base Currency) */}
            <div
              onClick={() => {
                setActiveField("base");
                baseInputRef.current?.focus();
              }}
              className={`flex flex-col rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all ${
                activeField === "base"
                  ? "border-primary bg-primary/[0.02]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                  <span>
                    {baseCode} ({baseSymbol})
                  </span>
                </div>
                <span className="text-[11px] font-medium text-gray-400">
                  Primary Cash
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-gray-400 font-bold text-base sm:text-lg shrink-0">
                  {baseSymbol}
                </span>
                <input
                  ref={baseInputRef}
                  type="text"
                  inputMode="decimal"
                  value={baseAmount}
                  placeholder={baseDecimals > 0 ? "0.00" : "0"}
                  onFocus={() => setActiveField("base")}
                  onChange={(e) =>
                    setBaseAmount(sanitizeAmount(e.target.value, baseDecimals))
                  }
                  onBlur={() => handleBlur("base")}
                  className="w-full bg-transparent text-right text-xl sm:text-2xl font-black tabular-nums text-gray-900 placeholder:text-gray-300 outline-none"
                />
              </div>
            </div>

            {/* Secondary Cash (if configured or opened with secondary currency) */}
            {hasSecondary && activeSecondaryCurrency && (
              <div
                onClick={() => {
                  setActiveField("secondary");
                  secondaryInputRef.current?.focus();
                }}
                className={`flex flex-col rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all ${
                  activeField === "secondary"
                    ? "border-primary bg-primary/[0.02]"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  {nonBaseCurrencies.length > 1 ? (
                    <div className="relative inline-block" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrencyDropdownOpen((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                      >
                        <span>
                          {activeSecondaryCurrency.code} (
                          {activeSecondaryCurrency.symbol})
                        </span>
                        <ChevronDown
                          className={`size-3.5 text-gray-400 transition-transform duration-150 ${
                            currencyDropdownOpen ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </button>

                      {currencyDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg shadow-gray-200/50">
                          {nonBaseCurrencies.map((c) => {
                            const isSelected =
                              c.code.toUpperCase() ===
                              (
                                selectedSecondaryCode || defaultSecondaryCode
                              ).toUpperCase();
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSecondaryCode(c.code);
                                  setSecondaryAmount("");
                                  setCurrencyDropdownOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span>
                                  {c.code} ({c.symbol})
                                </span>
                                {isSelected && (
                                  <Check className="size-3.5 text-primary" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                      <span>
                        {activeSecondaryCurrency.code} (
                        {activeSecondaryCurrency.symbol})
                      </span>
                    </div>
                  )}

                  <span className="text-[11px] font-medium text-gray-400">
                    Secondary Cash
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-gray-400 font-bold text-base sm:text-lg shrink-0">
                    {secondarySymbol}
                  </span>
                  <input
                    ref={secondaryInputRef}
                    type="text"
                    inputMode={secondaryDecimals > 0 ? "decimal" : "numeric"}
                    value={secondaryAmount}
                    placeholder={secondaryDecimals > 0 ? "0.00" : "0"}
                    onFocus={() => setActiveField("secondary")}
                    onChange={(e) =>
                      setSecondaryAmount(
                        sanitizeAmount(e.target.value, secondaryDecimals)
                      )
                    }
                    onBlur={() => handleBlur("secondary")}
                    className="w-full bg-transparent text-right text-xl sm:text-2xl font-black tabular-nums text-gray-900 placeholder:text-gray-300 outline-none"
                  />
                </div>

                {/* Conversion Subtext */}
                <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <ArrowRightLeft className="size-3 text-gray-400" />
                    Rate: 1 {baseCode} = {secondaryExchangeRate.toLocaleString()}{" "}
                    {activeSecondaryCurrency.code}
                  </span>
                  <span className="font-semibold text-gray-700">
                    ≈ {baseSymbol}
                    {convertedSecondaryToBase.toFixed(baseDecimals)} {baseCode}
                  </span>
                </div>
              </div>
            )}

            {/* Total Counted & Difference Banner */}
            <div className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 bg-white p-3 text-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  Total Counted Cash
                </span>
                <span className="text-base font-bold text-primary tabular-nums">
                  {baseSymbol}
                  {totalCounted.toFixed(baseDecimals)} {baseCode}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">Difference</span>
                <span
                  className={`font-bold tabular-nums ${
                    totalDifferent < -0.005
                      ? "text-brand-red"
                      : totalDifferent > 0.005
                      ? "text-primary"
                      : "text-gray-600"
                  }`}
                >
                  {totalDifferent > 0.005 ? "+" : totalDifferent < -0.005 ? "−" : ""}
                  {format(Math.abs(totalDifferent), currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleDigit(key)}
                disabled={isProcessing}
                className="flex h-10 sm:h-11 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDigit(".")}
              disabled={
                isProcessing ||
                (activeField === "secondary" && secondaryDecimals === 0)
              }
              className="flex h-10 sm:h-11 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              .
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDigit("0")}
              disabled={isProcessing}
              className="flex h-10 sm:h-11 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDelete}
              disabled={isProcessing}
              className="flex h-10 sm:h-11 items-center justify-center rounded-xl bg-gray-100 text-brand-red outline-none transition-all duration-75 hover:bg-red-50 active:scale-[0.96] active:bg-red-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Closing Notes{" "}
              <span className="text-[11px] font-normal text-gray-400">
                (Optional)
              </span>
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Reason for discrepancy or closing remarks..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-primary/50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="shrink-0 border-t border-gray-100 px-4 sm:px-6 py-3 bg-white">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !hasAnyInput}
            className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            <Calculator className="h-4 w-4" />
            {isProcessing
              ? "Closing Register..."
              : `Close Register (${baseSymbol}${totalCounted.toFixed(baseDecimals)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
