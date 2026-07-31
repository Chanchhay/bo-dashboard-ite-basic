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