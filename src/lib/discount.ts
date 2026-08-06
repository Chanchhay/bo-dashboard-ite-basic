import { AppliedDiscount } from "@/types/pos-type";

/**
 * Renders a discount for display.
 *
 * The money formatter is passed in rather than imported: a fixed-amount
 * discount is in the business's own currency, which only a caller holding the
 * configuration knows. Pass `format` from `useMoney()`.
 */
export function formatDiscount(
  discount: AppliedDiscount | null,
  format: (value: string | number) => string,
): string {
  if (!discount) return "";

  switch (discount.type) {
    case "PERCENTAGE":
      return `${discount.value}%`;
    case "FIXED":
      return format(discount.value);
    case "COUPON":
      return `Coupon: ${discount.value}`;
    default:
      return "";
  }
}
