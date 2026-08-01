import { AppliedDiscount } from "@/types/pos-type";
import { formatCurrency } from "./money";


export function formatDiscount(discount: AppliedDiscount | null): string {
  if (!discount) return "";

  switch (discount.type) {
    case "PERCENTAGE":
      return `${discount.value}%`;
    case "FIXED":
      return formatCurrency(discount.value);
    case "COUPON":
      return `Coupon: ${discount.value}`;
    default:
      return "";
  }
}