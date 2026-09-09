"use client";

import { Building2, Delete, X, Calculator, ArrowRightLeft, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import { POS_ROUTES, SALES_HOME } from "@/lib/pos-routes";

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

export type ClosedChannel = {
  channelName: string;
  todayHours?: string;
  summary?: string;
};

function getExchangeRateText(
  baseCode: string,
  secondaryCode: string,
  rate: number
): string {
  if (!rate || rate <= 0) return "";

  if (rate < 1) {
    const inverse = 1 / rate;
    const invFormatted =
      inverse >= 100
        ? Math.round(inverse).toLocaleString()
        : inverse.toLocaleString(undefined, { maximumFractionDigits: 4 });
    const directFormatted = rate.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
    return `1 ${secondaryCode} = ${invFormatted} ${baseCode} (1 ${baseCode} = ${directFormatted} ${secondaryCode})`;
  }

  const rateFormatted =
    rate >= 100
      ? Math.round(rate).toLocaleString()
      : rate.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const inverse = 1 / rate;
  const invFormatted = inverse.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
  return `1 ${baseCode} = ${rateFormatted} ${secondaryCode} (1 ${secondaryCode} = ${invFormatted} ${baseCode})`;
}

function getExchangeRateSummary(
  baseCode: string,
  secondaryCode: string,
  rate: number
): string {
  if (!rate || rate <= 0) return "";
  if (rate < 1) {
    const inverse = 1 / rate;
    const invFormatted =
      inverse >= 100
        ? Math.round(inverse).toLocaleString()
        : inverse.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `1 ${secondaryCode} = ${invFormatted} ${baseCode}`;
  }
  const rateFormatted =
    rate >= 100
      ? Math.round(rate).toLocaleString()
      : rate.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return `1 ${baseCode} = ${rateFormatted} ${secondaryCode}`;
}

export function CashRegister({
  onClose,
  closedChannel,
}: {
  onClose?: () => void;
  closedChannel?: ClosedChannel | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const { data: config } = useGetBusinessCurrenciesQuery();

  const baseCode = (config?.baseCurrency || "USD").toUpperCase();
  const baseCurrency = config?.currencies?.find(
    (c) => c.code.toUpperCase() === baseCode
  );
  const baseSymbol = baseCurrency?.symbol || (baseCode === "KHR" ? "៛" : "$");
  const baseDecimals = baseCode === "KHR" ? 0 : (baseCurrency?.decimalPlaces ?? 2);

  // Currencies configured in BO that are not the base currency
  const nonBaseCurrencies = (config?.currencies || []).filter(
    (c) => c.code.toUpperCase() !== baseCode
  );

  const defaultSecondaryCode =
    config?.displayCurrency &&
      config.displayCurrency.toUpperCase() !== baseCode
      ? config.displayCurrency.toUpperCase()
      : nonBaseCurrencies[0]?.code?.toUpperCase() || "";

  const [selectedSecondaryCode, setSelectedSecondaryCode] = useState<string>("");

  useEffect(() => {
    if (!selectedSecondaryCode && defaultSecondaryCode) {
      setSelectedSecondaryCode(defaultSecondaryCode);
    }
  }, [defaultSecondaryCode, selectedSecondaryCode]);

  const activeSecondaryCurrency = nonBaseCurrencies.find(
    (c) => c.code.toUpperCase() === (selectedSecondaryCode || defaultSecondaryCode).toUpperCase()
  );

  const hasSecondary = Boolean(activeSecondaryCurrency);
  const secondarySymbol = activeSecondaryCurrency?.symbol || "";
  const secondaryExchangeRate = Number(activeSecondaryCurrency?.exchangeRate) || 1;
  const secondaryDecimals =
    activeSecondaryCurrency?.code === "KHR"
      ? 0
      : (activeSecondaryCurrency?.decimalPlaces ?? (activeSecondaryCurrency?.code === "USD" ? 2 : 0));

  const [activeField, setActiveField] = useState<"base" | "secondary">("base");
  const [baseAmount, setBaseAmount] = useState("");
  const [secondaryAmount, setSecondaryAmount] = useState("");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const baseInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currencyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currencyDropdownOpen]);

  const numBase = Number.parseFloat(baseAmount) || 0;
  const numSecondary = Number.parseFloat(secondaryAmount) || 0;

  // Real-time conversion: (secondary / exchangeRate)
  const convertedSecondaryToBase =
    hasSecondary && secondaryExchangeRate > 0
      ? numSecondary / secondaryExchangeRate
      : 0;

  const totalOpeningBalance = numBase + convertedSecondaryToBase;

  const formattedStartingBreakdown =
    hasSecondary && (numBase > 0 || numSecondary > 0) && activeSecondaryCurrency
      ? `${baseSymbol}${
          baseDecimals > 0
            ? numBase.toFixed(baseDecimals)
            : Math.round(numBase).toLocaleString()
        } ${baseCode} + ${secondarySymbol}${
          secondaryDecimals > 0
            ? numSecondary.toFixed(secondaryDecimals)
            : Math.round(numSecondary).toLocaleString()
        } ${activeSecondaryCurrency.code}`
      : null;

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
      let clean = baseAmount.trim();
      if (clean.endsWith(".")) {
        clean = clean.slice(0, -1);
      }
      const num = Number.parseFloat(clean);
      if (Number.isNaN(num) || num < 0) {
        setBaseAmount("");
      } else {
        setBaseAmount(clean);
      }
    } else {
      if (!secondaryAmount) return;
      let clean = secondaryAmount.trim();
      if (clean.endsWith(".")) {
        clean = clean.slice(0, -1);
      }
      const num = Number.parseFloat(clean);
      if (Number.isNaN(num) || num < 0) {
        setSecondaryAmount("");
      } else {
        setSecondaryAmount(clean);
      }
    }
  };

  const handleOpenRegister = useCallback(async () => {
    if (closedChannel) return;

    if (!Number.isFinite(totalOpeningBalance) || totalOpeningBalance < 0) {
      toast({
        tone: "error",
        title: "Register not opened",
        description: "Enter a valid starting cash amount.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const rateSummary = getExchangeRateSummary(
        baseCode,
        activeSecondaryCurrency!.code,
        secondaryExchangeRate
      );

      const noteBreakdown =
        hasSecondary && numSecondary > 0
          ? `Float: ${baseSymbol}${numBase.toFixed(baseDecimals)} ${baseCode} + ${secondarySymbol}${numSecondary.toLocaleString()} ${activeSecondaryCurrency!.code} (@ ${rateSummary})`
          : undefined;

      const fullNote = [noteBreakdown, notes.trim()].filter(Boolean).join(" | ");

      const response = await fetch("/api/register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingBalance: Number(totalOpeningBalance.toFixed(baseDecimals)),
          baseOpeningBalance: numBase,
          secondaryCurrency: hasSecondary && numSecondary > 0 ? activeSecondaryCurrency!.code : undefined,
          secondaryOpeningBalance: hasSecondary && numSecondary > 0 ? numSecondary : undefined,
          secondaryExchangeRate: hasSecondary && numSecondary > 0 ? secondaryExchangeRate : undefined,
          note: fullNote || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        toast({
          tone: "error",
          title: "Register not opened",
          description: payload?.message ?? "Could not open the register.",
        });
        setIsLoading(false);
        return;
      }

      router.replace(POS_ROUTES.terminal);
    } catch {
      toast({
        tone: "error",
        title: "Register not opened",
        description: "Could not reach the server. Check your connection.",
      });
      setIsLoading(false);
    }
  }, [
    closedChannel,
    totalOpeningBalance,
    hasSecondary,
    numSecondary,
    baseSymbol,
    numBase,
    baseDecimals,
    baseCode,
    secondarySymbol,
    activeSecondaryCurrency,
    secondaryExchangeRate,
    notes,
    toast,
    router,
  ]);

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.replace(SALES_HOME);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleOpenRegister();
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
  }, [handleDigit, handleDelete, handleOpenRegister]);

  return (
    <div data-tour="pos-open-register" className="flex items-center justify-center min-h-screen bg-[#f4f4f5] p-3 sm:p-6">
      <div className="w-full max-w-[460px] rounded-[24px] sm:rounded-3xl bg-white shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#eff1f3]/90 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide">CASH REGISTER</h1>
              <p className="text-[11px] text-gray-500 font-medium">
                Base Currency: {baseCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-lg text-gray-400 outline-none transition-colors hover:bg-gray-200/60 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOpenRegister();
          }}
          className="flex flex-col gap-3.5 px-4 py-4 sm:px-6 sm:py-5"
        >
          {closedChannel ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-center"
            >
              <p className="text-sm font-bold text-warning">
                {closedChannel.channelName} is closed
              </p>
              <p className="text-xs text-gray-600">
                {closedChannel.todayHours
                  ? `Today: ${closedChannel.todayHours}`
                  : closedChannel.summary}
              </p>
              <p className="text-xs text-gray-500">
                The register cannot be opened while the channel is closed.
              </p>
            </div>
          ) : (
            <p className="text-center font-medium text-xs text-gray-500">
              Enter starting cash float for this register session
            </p>
          )}

          {/* Cash Inputs */}
          <div className="flex flex-col gap-2.5">
            {/* Primary Cash (Base Currency) */}
            <div
              onClick={() => {
                setActiveField("base");
                baseInputRef.current?.focus();
              }}
              className={`flex flex-col rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all ${activeField === "base"
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
                  placeholder="0"
                  onFocus={() => setActiveField("base")}
                  onChange={(e) =>
                    setBaseAmount(sanitizeAmount(e.target.value, baseDecimals))
                  }
                  onBlur={() => handleBlur("base")}
                  className="w-full bg-transparent text-right text-xl sm:text-2xl font-black tabular-nums text-gray-900 placeholder:text-gray-300 outline-none"
                />
              </div>
            </div>

            {/* Secondary Cash (if configured in BO) */}
            {hasSecondary && activeSecondaryCurrency && (
              <div
                onClick={() => {
                  setActiveField("secondary");
                  secondaryInputRef.current?.focus();
                }}
                className={`flex flex-col rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all ${activeField === "secondary"
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
                          {activeSecondaryCurrency.code} ({activeSecondaryCurrency.symbol})
                        </span>
                        <ChevronDown
                          className={`size-3.5 text-gray-400 transition-transform duration-150 ${currencyDropdownOpen ? "rotate-180 text-primary" : ""
                            }`}
                        />
                      </button>

                      {currencyDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg shadow-gray-200/50">
                          {nonBaseCurrencies.map((c) => {
                            const isSelected =
                              c.code.toUpperCase() ===
                              (selectedSecondaryCode || defaultSecondaryCode).toUpperCase();
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
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${isSelected
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
                        {activeSecondaryCurrency.code} ({activeSecondaryCurrency.symbol})
                      </span>
                    </div>
                  )}
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
                    placeholder="0"
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
                  <span
                    className="flex items-center gap-1 min-w-0"
                    title={getExchangeRateText(baseCode, activeSecondaryCurrency.code, secondaryExchangeRate)}
                  >
                    <ArrowRightLeft className="size-3 text-gray-400 shrink-0" />
                    <span className="truncate">Rate: {getExchangeRateText(baseCode, activeSecondaryCurrency.code, secondaryExchangeRate)}</span>
                  </span>
                  <span className="font-semibold text-gray-700 shrink-0 ml-2">
                    ≈ {baseSymbol}{convertedSecondaryToBase.toFixed(baseDecimals)} {baseCode}
                  </span>
                </div>
              </div>
            )}

            {/* Total Combined Starting Float Banner */}
            {hasSecondary && (
              <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Total Starting Cash
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-base font-bold text-primary tabular-nums">
                      {baseSymbol}
                      {baseDecimals > 0
                        ? totalOpeningBalance.toFixed(baseDecimals)
                        : Math.round(totalOpeningBalance).toLocaleString()}{" "}
                      {baseCode}
                    </span>
                    {formattedStartingBreakdown && (
                      <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                        {formattedStartingBreakdown}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                disabled={isLoading || Boolean(closedChannel)}
                className="flex h-11 sm:h-12 items-center justify-center rounded-xl bg-gray-100 text-lg sm:text-xl font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
              >
                {key}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleDigit(".")}
              disabled={
                isLoading ||
                Boolean(closedChannel) ||
                (activeField === "secondary" && secondaryDecimals === 0)
              }
              className="flex h-11 sm:h-12 items-center justify-center rounded-xl bg-gray-100 text-lg sm:text-xl font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              .
            </button>

            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={isLoading || Boolean(closedChannel)}
              className="flex h-11 sm:h-12 items-center justify-center rounded-xl bg-gray-100 text-lg sm:text-xl font-bold text-gray-900 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading || Boolean(closedChannel)}
              className="flex h-11 sm:h-12 items-center justify-center rounded-xl bg-gray-100 text-brand-red outline-none transition-all duration-75 hover:bg-red-50 active:scale-[0.96] active:bg-red-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Notes <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter session notes..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-primary/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || Boolean(closedChannel)}
            className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            <Calculator className="h-4 w-4" />
            {isLoading
              ? "Opening..."
              : `Open Register (${baseSymbol}${
                  baseDecimals > 0
                    ? totalOpeningBalance.toFixed(baseDecimals)
                    : Math.round(totalOpeningBalance).toLocaleString()
                })`}
          </button>
        </form>
      </div>
    </div>
  );
}
