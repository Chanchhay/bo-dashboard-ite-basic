export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value) || 0;
}

export function toMoneyString(value: number): string {
  return value.toFixed(2);
}

export function formatCurrency(
  value: string | number | null | undefined,
  symbol = "$"
): string {
  if (value === null || value === undefined) return "—";
  return `${symbol}${toNumber(value).toFixed(2)}`;
}

/** Formats an amount using the currency recorded by the backend. */
export function formatCurrencyAmount(
  value: string | number | null | undefined,
  currency: string,
): string {
  const amount = toNumber(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
