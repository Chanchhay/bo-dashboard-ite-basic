import { z } from "zod";

export type TaxType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface TaxConfig {
  id: string;
  taxName: string;
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  showTaxOnReceipt: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdDate?: string;
}

export const taxSchema = z.object({
  taxName: z
    .string()
    .trim()
    .min(1, "Tax name is required.")
    .max(100, "Tax name must be 100 characters or fewer."),
  taxType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate percentage cannot exceed 100%."),
  taxAmount: z.coerce
    .number()
    .min(0, "Tax amount cannot be negative.")
    .default(0),
  showTaxOnReceipt: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type TaxInput = z.infer<typeof taxSchema>;
