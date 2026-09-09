import { AppliedDiscount } from "@/types/pos-type";

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
