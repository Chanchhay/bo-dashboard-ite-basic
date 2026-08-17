import { TaxConfig, TaxInput } from "@/lib/api/tax";

export const DEFAULT_TAX: TaxConfig = {
  id: "tax_default",
  taxName: "VAT",
  taxType: "PERCENTAGE",
  taxRate: 10,
  taxAmount: 0,
  showTaxOnReceipt: true,
  isDefault: true,
  isActive: true,
  isTaxInclusive: false,
  createdDate: new Date().toISOString(),
};

const STORAGE_KEY = "ipos_default_tax_config";
let currentTax: TaxConfig = { ...DEFAULT_TAX };

export function getDefaultTax(): TaxConfig {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        currentTax = { ...DEFAULT_TAX, ...JSON.parse(raw) };
      }
    } catch {}
  }
  return currentTax;
}

export function updateDefaultTax(input: Partial<TaxInput>): TaxConfig {
  currentTax = {
    ...currentTax,
    ...input,
    taxName: input.taxName !== undefined ? input.taxName : currentTax.taxName,
    taxType: input.taxType !== undefined ? input.taxType : currentTax.taxType,
    taxRate: input.taxRate !== undefined ? input.taxRate : currentTax.taxRate,
    taxAmount: input.taxAmount !== undefined ? input.taxAmount : currentTax.taxAmount,
    showTaxOnReceipt: input.showTaxOnReceipt !== undefined ? input.showTaxOnReceipt : currentTax.showTaxOnReceipt,
    isActive: input.isActive !== undefined ? input.isActive : currentTax.isActive,
    isTaxInclusive: input.isTaxInclusive !== undefined ? input.isTaxInclusive : (currentTax.isTaxInclusive ?? false),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTax));
    } catch {}
  }
  return currentTax;
}

export function getActiveDefaultTax(): TaxConfig | null {
  return currentTax.isActive ? currentTax : null;
}

/** Backward compatibility helper for existing imports */
export function getStoredTaxes(): TaxConfig[] {
  return [currentTax];
}

/** Backward compatibility helper for existing imports */
export function saveStoredTaxes(_taxes: TaxConfig[]): void {
  // No-op
}
