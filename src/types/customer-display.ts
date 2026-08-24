export type CustomerDisplayStatus =
  | "IDLE"
  | "CART_UPDATED"
  | "PAYMENT_PENDING"
  | "COMPLETED";

export interface CustomerDisplayItem {
  id: string;
  itemId: string;
  name: string;
  /**
   * What was actually picked, so the customer can check it before paying.
   *
   * A name alone cannot tell a single can from a six pack, and those are
   * different money — the screen exists to be disagreed with, which it cannot
   * be if it does not say what it charged for.
   */
  variantName?: string | null;
  unitName?: string | null;
  /** How many base units one of {@link unitName} holds. */
  unitFactor?: number | null;
  addOns?: { name: string }[];
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  image?: string | null;
}

export interface CustomerDisplayPayload {
  terminalId: string;
  businessId?: string;
  businessName?: string | null;
  businessLogo?: string | null;
  businessThumbnail?: string | null;
  status: CustomerDisplayStatus;
  items: CustomerDisplayItem[];
  subtotal: number;
  discountAmount: number;
  tax: number;
  taxRate?: number | null;
  total: number;
  currency: string;
  invoiceNumber?: string | null;
  qrCodeUrl?: string | null;
  customerName?: string | null;
  paymentMethod?: "CASH" | "DIGITAL" | "PAY_LATER" | null;
  paidAmount?: number | null;
  changeAmount?: number | null;
  updatedAt: string;
}
