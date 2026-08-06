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
  /**
   * Formats an amount. Pass the currency the record was priced in; falls back
   * to the business base currency for values that carry none.
   */
  format: (
    value: string | number | null | undefined,
    code?: string,
    options?: FormatMoneyOptions,
  ) => string;
  /** The converted equivalent to show alongside a total, when configured. */
  secondary: (amount: number, code?: string) => SecondaryAmount | null;
  /**
   * The equivalent for an amount on an order or sale, using the rate that
   * record was priced at and only falling back to the live configuration when
   * it carries none.
   */
  secondaryFor: (
    amount: number,
    record:
      | {
          currency?: string;
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
  /** True until the configuration arrives; amounts format on Intl defaults. */
  isLoading: boolean;
};

/**
 * Currency-aware formatting for any client component. The underlying query is
 * cached by RTK Query, so calling this in many components costs one request.
 */
export function useMoney(): UseMoney {
  const { data: configuration, isLoading } = useGetBusinessCurrenciesQuery();

  return useMemo(() => {
    const baseCode = configuration?.baseCurrency ?? "";
    const base = findCurrency(configuration, baseCode);
    const display = findCurrency(configuration, configuration?.displayCurrency);

    function currencyFor(code?: string) {
      // An unmatched code still formats sensibly through Intl defaults.
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
