export type CustomerDisplayStatus =
  | "IDLE"
  | "CART_UPDATED"
  | "PAYMENT_PENDING"
  | "COMPLETED";

export interface CustomerDisplayItem {
  id: string;
  itemId: string;
  name: string;
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
  total: number;
  currency: string;
  invoiceNumber?: string | null;
  qrCodeUrl?: string | null;
  customerName?: string | null;
  updatedAt: string;
}
