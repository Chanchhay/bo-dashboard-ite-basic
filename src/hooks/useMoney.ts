"use client";

import { useMemo } from "react";

import type { BusinessCurrency } from "@/lib/api/currency";
import {
  findCurrency,
  formatMoney,
  getRecordedSecondaryAmount,
  getSecondaryAmount,
  convertAmount,
  type FormatMoneyOptions,
  type SecondaryAmount,
} from "@/lib/money";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";

export type UseMoney = {
  format: (
    value: string | number | null | undefined,
    code?: string | null,
    options?: FormatMoneyOptions,
  ) => string;
  secondary: (amount: number, code?: string | null) => SecondaryAmount | null;
  secondaryFor: (
    amount: number,
    record:
      | {
          currency?: string | null;
          displayCurrency?: string | null;
          displayExchangeRate?: number | null;
        }
      | null
      | undefined,
  ) => SecondaryAmount | null;
  convert: (amount: number, fromCode: string, toCode: string) => number | null;
  base?: BusinessCurrency;
  display?: BusinessCurrency;
  baseCode: string;
  isLoading: boolean;
};

export function useMoney(): UseMoney {
  const { data: configuration, isLoading } = useGetBusinessCurrenciesQuery();

  return useMemo(() => {
    const baseCode = configuration?.baseCurrency ?? "";
    const base = findCurrency(configuration, baseCode);
    const display = findCurrency(configuration, configuration?.displayCurrency);

    function currencyFor(code?: string | null) {
      return findCurrency(configuration, code) ?? code ?? base ?? baseCode;
    }

    return {
      format: (value, code, options) =>
        formatMoney(value, currencyFor(code), options),
      secondary: (amount, code) =>
        getSecondaryAmount(amount, code || baseCode, configuration),
      secondaryFor: (amount, record) => {
        if (!record) return null;
        return (
          getRecordedSecondaryAmount(amount, record, configuration) ??
          getSecondaryAmount(
            amount,
            record.currency || baseCode,
            configuration,
          )
        );
      },
      convert: (amount, fromCode, toCode) =>
        convertAmount(
          amount,
          findCurrency(configuration, fromCode),
          findCurrency(configuration, toCode),
        ),
      base,
      display,
      baseCode,
      isLoading,
    };
  }, [configuration, isLoading]);
}
