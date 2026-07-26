export function toNumber(decimalString: string | number): number {
  return typeof decimalString === "number"
    ? decimalString
    : parseFloat(decimalString);
}
 
export function toMoneyString(value: number): string {
  return value.toFixed(2);
}
 
export function formatCurrency(value: string | number, symbol = "$"): string {
  return `${symbol}${toNumber(value).toFixed(2)}`;
}