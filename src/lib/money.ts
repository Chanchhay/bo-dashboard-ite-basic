import type {
  BusinessCurrency,
  BusinessCurrencyConfiguration,
} from "@/lib/api/currency";

/**
 * The minimum a caller needs to render an amount. Anything holding a
 * `BusinessCurrency` from the API satisfies this.
 */
export type CurrencyLike = {
  code: string;
  symbol?: string;
  decimalPlaces?: number;
  exchangeRate?: number;
};

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value) || 0;
}

export function toMoneyString(value: number): string {
  return value.toFixed(2);
}

/**
 * Fraction digits to use when the business has not configured the currency.
 * Intl knows the real minor unit for most codes (JPY 0, USD 2, BHD 3).
 */
export function defaultDecimalPlaces(code: string): number {
  try {
    return (
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function fractionDigits(currency: CurrencyLike | undefined, code: string) {
  const configured = currency?.decimalPlaces;
  return typeof configured === "number" && Number.isFinite(configured)
    ? Math.min(Math.max(configured, 0), 3)
    : defaultDecimalPlaces(code);
}

function symbolFor(currency: CurrencyLike | undefined, code: string) {
  // A business may define its own symbol, and that wins over CLDR's.
  if (currency?.symbol?.trim()) return currency.symbol.trim();

  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export type FormatMoneyOptions = {
  /** Render the ISO code instead of the symbol, e.g. `USD 12.50`. */
  useCode?: boolean;
  /** Text to return for null/undefined input. Defaults to an em dash. */
  fallback?: string;
};

/**
 * Formats an amount in a specific currency, honouring the symbol and decimal
 * places the business configured. Pass either a configured currency or a bare
 * ISO code; with a code alone the Intl defaults apply.
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency: CurrencyLike | string | undefined,
  options: FormatMoneyOptions = {},
): string {
  const { useCode = false, fallback = "—" } = options;
  if (value === null || value === undefined) return fallback;

  const resolved = typeof currency === "string" ? undefined : currency;
  const code = (typeof currency === "string" ? currency : currency?.code) ?? "";

  if (!code) return toNumber(value).toFixed(2);

  const digits = fractionDigits(resolved, code);
  const amount = new Intl.NumberFormat(undefined, {
    style: "decimal",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value));

  return useCode
    ? `${code} ${amount}`
    : `${symbolFor(resolved, code)}${amount}`;
}

/**
 * Formats using only an ISO code. Prefer `formatMoney` with the configured
 * currency; this is the fallback for records whose currency is not in the
 * business configuration.
 */
export function formatCurrencyAmount(
  value: string | number | null | undefined,
  currency: string,
): string {
  return formatMoney(value, currency);
}

export function findCurrency(
  configuration: BusinessCurrencyConfiguration | undefined,
  code: string | undefined,
): BusinessCurrency | undefined {
  if (!configuration || !code) return undefined;
  const wanted = code.toUpperCase();
  return configuration.currencies.find(
    (currency) => currency.code.toUpperCase() === wanted,
  );
}

/**
 * Rates are quoted as units of the currency per one unit of the base, so the
 * base itself carries a rate of 1. Converting therefore goes through the base.
 */
export function convertAmount(
  amount: number,
  from: CurrencyLike | undefined,
  to: CurrencyLike | undefined,
): number | null {
  if (!from || !to) return null;
  if (from.code === to.code) return amount;

  const fromRate = Number(from.exchangeRate);
  const toRate = Number(to.exchangeRate);
  if (!(fromRate > 0) || !(toRate > 0)) return null;

  const converted = (amount * toRate) / fromRate;
  const digits = fractionDigits(to, to.code);
  return Number(converted.toFixed(digits));
}

export type SecondaryAmount = {
  /** Configured where possible, otherwise just the code for Intl to resolve. */
  currency: CurrencyLike;
  /** Units of the display currency per one unit of the source currency. */
  rate: number;
  amount: number;
};

/**
 * The equivalent recorded against a settled order or sale.
 *
 * Preferred over {@link getSecondaryAmount} wherever a record carries its own
 * rate: rates move, and a receipt has to keep showing the figure the customer
 * was actually handed rather than one recomputed from today's configuration.
 */
export function getRecordedSecondaryAmount(
  amount: number,
  record: {
    displayCurrency?: string | null;
    displayExchangeRate?: number | null;
  },
  configuration?: BusinessCurrencyConfiguration,
): SecondaryAmount | null {
  const code = record.displayCurrency;
  const rate = Number(record.displayExchangeRate);

  if (!code || !Number.isFinite(rate) || rate <= 0) return null;

  // The configured entry only supplies presentation — symbol and decimals.
  // The rate always comes from the record.
  // Symbol is left unset when the currency is not configured, so Intl resolves
  // it rather than the code standing in for it.
  const currency: CurrencyLike = findCurrency(configuration, code) ?? {
    code,
    exchangeRate: rate,
    decimalPlaces: defaultDecimalPlaces(code),
  };

  const digits = fractionDigits(currency, code);
  return {
    currency,
    rate,
    amount: Number((amount * rate).toFixed(digits)),
  };
}

/**
 * The converted equivalent to show alongside a price, or null when the
 * business has no distinct display currency configured. For amounts on a
 * settled record, prefer {@link getRecordedSecondaryAmount}.
 */
export function getSecondaryAmount(
  amount: number,
  sourceCode: string | undefined,
  configuration: BusinessCurrencyConfiguration | undefined,
): SecondaryAmount | null {
  if (!configuration?.displayCurrency) return null;

  const source = findCurrency(configuration, sourceCode);
  const display = findCurrency(configuration, configuration.displayCurrency);
  if (!source || !display || source.code === display.code) return null;

  const converted = convertAmount(amount, source, display);
  if (converted === null) return null;

  return {
    currency: display,
    rate: Number(display.exchangeRate) / Number(source.exchangeRate),
    amount: converted,
  };
}
