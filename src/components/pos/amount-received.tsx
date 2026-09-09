"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Banknote, X, Delete } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMoney } from "@/hooks/useMoney";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";

export interface AmountReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  /** The order's own currency, which a base-currency change must not relabel. */
  currency?: string | null;
  onValidate: (receivedAmount: number, tenderNote?: string) => void;
  isProcessing?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

const KeypadButton = memo(function KeypadButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPress(label)}
      disabled={disabled}
      style={{ touchAction: "manipulation" }}
      aria-label={label === "back" ? "Delete last digit" : undefined}
      className="flex h-12 sm:h-13.5 items-center justify-center rounded-2xl bg-gray-100/90 text-xl sm:text-2xl font-bold text-gray-800 outline-none transition-all duration-75 hover:bg-gray-200/80 active:scale-[0.96] active:bg-gray-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
    >
      {label === "back" ? (
        <Delete className="size-5 sm:size-6 text-brand-red" aria-hidden="true" />
      ) : (
        label
      )}
    </button>
  );
});

export function AmountReceived({
  open,
  onOpenChange,
  amountDue,
  currency,
  onValidate,
  isProcessing,
}: AmountReceivedDialogProps) {
  const { format, secondary, base, display } = useMoney();
  const { data: config } = useGetBusinessCurrenciesQuery();

  const baseCode = (currency || base?.code || config?.baseCurrency || "USD").toUpperCase();
  const baseCurrency =
    base || config?.currencies?.find((c) => c.code.toUpperCase() === baseCode);
  const baseSymbol = baseCurrency?.symbol || "$";
  const baseDecimals = baseCurrency?.decimalPlaces ?? 2;

  // Currencies configured in BO that are not the base currency
  const nonBaseCurrencies = useMemo(
    () => (config?.currencies || []).filter((c) => c.code.toUpperCase() !== baseCode),
    [config, baseCode]
  );

  const defaultSecondaryCode =
    config?.displayCurrency && config.displayCurrency.toUpperCase() !== baseCode
      ? config.displayCurrency.toUpperCase()
      : nonBaseCurrencies[0]?.code?.toUpperCase() || "";

  const [selectedSecondaryCode, setSelectedSecondaryCode] = useState<string>("");

  useEffect(() => {
    if (!selectedSecondaryCode && defaultSecondaryCode) {
      setSelectedSecondaryCode(defaultSecondaryCode);
    }
  }, [defaultSecondaryCode, selectedSecondaryCode]);

  const activeSecondary =
    nonBaseCurrencies.find(
      (c) => c.code.toUpperCase() === (selectedSecondaryCode || defaultSecondaryCode).toUpperCase()
    ) || (display && display.code.toUpperCase() !== baseCode ? display : null);

  const hasSecondary = Boolean(activeSecondary);
  const secondaryRate = Number(activeSecondary?.exchangeRate) || 1;
  const secondarySymbol = activeSecondary?.symbol || activeSecondary?.code || "";
  const secondaryDecimals = activeSecondary?.decimalPlaces ?? 0;

  const [activeField, setActiveField] = useState<"base" | "secondary">("base");
  const [baseReceived, setBaseReceived] = useState("");
  const [secondaryReceived, setSecondaryReceived] = useState("");

  const baseInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBaseReceived("");
      setSecondaryReceived("");
      setActiveField("base");
    }
  }

  // Focus caret into the active field on mount
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      baseInputRef.current?.focus();
      baseInputRef.current?.select();
    }, 60);
    return () => clearTimeout(timer);
  }, [open]);

  // Caret restore handling
  const pendingCaretRef = useRef<{ field: "base" | "secondary"; pos: number } | null>(null);

  useLayoutEffect(() => {
    if (!pendingCaretRef.current) return;
    const { field, pos } = pendingCaretRef.current;
    pendingCaretRef.current = null;
    const input = field === "base" ? baseInputRef.current : secondaryInputRef.current;
    input?.focus();
    input?.setSelectionRange(pos, pos);
  }, [baseReceived, secondaryReceived]);

  const hasInput = Boolean(baseReceived || secondaryReceived);
  const numBase = parseFloat(baseReceived || "0");
  const numSecondary = parseFloat(secondaryReceived || "0");

  const convertedSecondary =
    hasSecondary && secondaryRate > 0 ? numSecondary / secondaryRate : 0;

  const totalReceived = numBase + convertedSecondary;
  const changeToGive = totalReceived - amountDue;

  // Change in secondary currency
  const changeDueSecondary =
    hasSecondary && secondaryRate > 0 ? Math.max(changeToGive, 0) * secondaryRate : 0;

  const handleKey = useCallback(
    (key: string) => {
      const isBase = activeField === "base";
      const input = isBase ? baseInputRef.current : secondaryInputRef.current;
      const currentVal = isBase ? baseReceived : secondaryReceived;
      const decimals = isBase ? baseDecimals : secondaryDecimals;

      const start = input?.selectionStart ?? currentVal.length;
      const end = input?.selectionEnd ?? currentVal.length;

      const commit = (next: string, caret: number) => {
        if (isBase) setBaseReceived(next);
        else setSecondaryReceived(next);
        pendingCaretRef.current = { field: activeField, pos: caret };
      };

      if (key === "back") {
        if (start !== end) {
          commit(currentVal.slice(0, start) + currentVal.slice(end), start);
        } else if (start > 0) {
          commit(currentVal.slice(0, start - 1) + currentVal.slice(start), start - 1);
        }
        return;
      }

      if (key === "." && decimals === 0) return;

      const selectionCoversDot =
        currentVal.includes(".") &&
        start <= currentVal.indexOf(".") &&
        end > currentVal.indexOf(".");
      if (key === "." && currentVal.includes(".") && !selectionCoversDot) return;

      if (start === end && currentVal.replace(".", "").length >= 12) return;

      commit(currentVal.slice(0, start) + key + currentVal.slice(end), start + key.length);
    },
    [activeField, baseReceived, secondaryReceived, baseDecimals, secondaryDecimals]
  );

  const getTenderNote = useCallback(() => {
    if (hasSecondary && activeSecondary) {
      if (numBase > 0 && numSecondary > 0) {
        return `Tendered: ${baseSymbol}${numBase.toFixed(baseDecimals)} ${baseCode} + ${numSecondary.toLocaleString()} ${activeSecondary.code}`;
      }
      if (numBase === 0 && numSecondary > 0) {
        return `Tendered: ${numSecondary.toLocaleString()} ${activeSecondary.code}`;
      }
      if (numBase > 0) {
        return `Tendered: ${baseSymbol}${numBase.toFixed(baseDecimals)} ${baseCode}`;
      }
    } else if (numBase > 0) {
      return `Tendered: ${baseSymbol}${numBase.toFixed(baseDecimals)} ${baseCode}`;
    }
    return undefined;
  }, [hasSecondary, activeSecondary, numBase, numSecondary, baseSymbol, baseDecimals, baseCode]);

  const handleValidate = useCallback(() => {
    if (isProcessing || totalReceived < amountDue) return;
    onValidate(Number(totalReceived.toFixed(baseDecimals)), getTenderNote());
  }, [isProcessing, totalReceived, amountDue, onValidate, baseDecimals, getTenderNote]);

  // Keyboard shortcuts (Enter to validate, Escape to close, digits & backspace)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleValidate();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleKey("back");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleValidate, onOpenChange, handleKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[44%] -translate-y-[46%] max-h-[96vh] overflow-y-auto overflow-x-hidden w-[calc(100vw-2rem)] max-w-[480px] sm:max-w-[490px] rounded-[28px] sm:rounded-[32px] border border-gray-200 bg-white p-0 shadow-[0_25px_70px_rgba(15,23,42,0.28)]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-[#f8f9fa] px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 sm:size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Banknote className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-primary">
              Amount received
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close amount received"
            className="grid size-8 sm:size-9 place-items-center rounded-xl text-gray-400 outline-none transition-colors hover:bg-gray-200/60 hover:text-gray-700 cursor-pointer"
          >
            <X className="size-4 sm:size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 pt-3.5 pb-5 flex flex-col gap-2.5 sm:gap-3">
          {/* To pay row */}
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg font-semibold text-gray-700">To pay</span>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
                {format(amountDue, currency)}
              </span>
              {hasSecondary && activeSecondary && (
                <span className="block text-xs font-semibold text-gray-400 tabular-nums mt-0.5">
                  ≈ {format(amountDue * secondaryRate, activeSecondary.code)}
                </span>
              )}
            </div>
          </div>

          {/* 2 Input Boxes - Layered on top of each other (Stacked Vertically) */}
          <div className="flex flex-col gap-2 sm:gap-2.5">
            {/* Box 1: Primary Cash (Base Currency) */}
            <div
              onClick={() => {
                setActiveField("base");
                baseInputRef.current?.focus();
              }}
              className={`relative flex items-center justify-between rounded-2xl border px-4 py-2.5 sm:px-5 sm:py-3 cursor-text transition-all ${activeField === "base"
                  ? "border-primary bg-white"
                  : "border-gray-200 bg-[#f9fafb] hover:border-gray-300 hover:bg-white"
                }`}
            >
              <div className="flex flex-col shrink-0 select-none pointer-events-none">
                <span className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {baseCode} ({baseSymbol})
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                  Primary Cash
                </span>
              </div>
              <input
                ref={baseInputRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={baseReceived}
                onFocus={() => setActiveField("base")}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(next)) setBaseReceived(next);
                }}
                className={`w-full bg-transparent text-right text-2xl sm:text-3xl font-black tabular-nums outline-none caret-primary pl-4 ${activeField === "base"
                    ? "text-primary placeholder:text-primary/30"
                    : "text-gray-700 placeholder:text-gray-300"
                  }`}
              />
            </div>

            {/* Box 2: Secondary Cash (Layered below Box 1) */}
            {hasSecondary && activeSecondary && (
              <div
                onClick={() => {
                  setActiveField("secondary");
                  secondaryInputRef.current?.focus();
                }}
                className={`relative flex items-center justify-between rounded-2xl border px-4 py-2.5 sm:px-5 sm:py-3 cursor-text transition-all ${activeField === "secondary"
                    ? "border-primary bg-white"
                    : "border-gray-200 bg-[#f9fafb] hover:border-gray-300 hover:bg-white"
                  }`}
              >
                <div className="flex flex-col shrink-0 select-none pointer-events-none">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {activeSecondary.code} ({secondarySymbol})
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                    Rate: 1 {baseCode} = {secondaryRate.toLocaleString()} {activeSecondary.code}
                  </span>
                </div>
                <input
                  ref={secondaryInputRef}
                  type="text"
                  inputMode={secondaryDecimals > 0 ? "decimal" : "numeric"}
                  placeholder="0"
                  value={secondaryReceived}
                  onFocus={() => setActiveField("secondary")}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (secondaryDecimals > 0) {
                      if (/^[0-9]*\.?[0-9]*$/.test(next)) setSecondaryReceived(next);
                    } else {
                      if (/^[0-9]*$/.test(next)) setSecondaryReceived(next);
                    }
                  }}
                  className={`w-full bg-transparent text-right text-2xl sm:text-3xl font-black tabular-nums outline-none caret-primary pl-4 ${activeField === "secondary"
                      ? "text-primary placeholder:text-primary/30"
                      : "text-gray-700 placeholder:text-gray-300"
                    }`}
                />
              </div>
            )}
          </div>

          {/* Change to give box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-[#f8faf8] py-2 sm:py-2.5 text-center">
            <span className="text-xs sm:text-sm font-medium text-gray-600">
              {!hasInput || changeToGive >= 0 ? "Change to give" : "Remaining due"}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-brand-red tabular-nums">
              {!hasInput
                ? format(0, currency)
                : format(Math.abs(changeToGive), currency)}
            </span>
            {hasSecondary && activeSecondary && (
              <>
                {hasInput && changeToGive > 0 && (
                  <span className="text-xs font-semibold text-gray-500 mt-0.5 tabular-nums">
                    ≈ {format(changeDueSecondary, activeSecondary.code)}
                  </span>
                )}
                {hasInput && changeToGive < 0 && (
                  <span className="text-xs font-semibold text-gray-500 mt-0.5 tabular-nums">
                    ≈ {format(Math.abs(changeToGive) * secondaryRate, activeSecondary.code)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Keypad 3x4 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-0.5">
            {KEYS.map((key) => (
              <KeypadButton
                key={key}
                label={key}
                onPress={handleKey}
                disabled={key === "." && activeField === "secondary" && secondaryDecimals === 0}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 sm:h-13 rounded-2xl border border-brand-red bg-white text-base sm:text-lg font-bold text-brand-red outline-none transition-all hover:bg-red-50/60 active:scale-[0.98] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isProcessing || totalReceived < amountDue}
              className="h-12 sm:h-13 rounded-2xl bg-primary text-base sm:text-lg font-bold text-primary-foreground outline-none transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm flex items-center justify-center"
            >
              {isProcessing ? "Processing..." : "Validate"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}