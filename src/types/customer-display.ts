export type CustomerDisplayStatus =
  | "IDLE"
  | "CART_UPDATED"
  | "PAYMENT_PENDING"
  | "COMPLETED";

export interface CustomerDisplayItem {
  id: string;
  itemId: string;
  name: string;
  variantName?: string | null;
  unitName?: string | null;
  unitFactor?: number | null;
  addOns?: { name: string }[];
  quantity: number;
  freeQuantity?: number;
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
  discountLabel?: string | null;
  tax: number;
  taxRate?: number | null;
  taxInclusionType?: "INCLUSIVE" | "EXCLUSIVE" | null;
  total: number;
  currency: string | null;
  invoiceNumber?: string | null;
  qrCodeUrl?: string | null;
  customerName?: string | null;
  paymentMethod?: "CASH" | "DIGITAL" | "PAY_LATER" | null;
  paidAmount?: number | null;
  changeAmount?: number | null;
  updatedAt: string;
}
