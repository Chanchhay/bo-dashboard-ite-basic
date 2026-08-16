import { TaxConfig, TaxInput } from "@/lib/api/tax";

const TAX_STORAGE_KEY = "ipos_business_tax_configs";

const DEFAULT_INITIAL_TAXES: TaxConfig[] = [
  {
    id: "tax_vat_10",
    taxName: "VAT",
    taxType: "PERCENTAGE",
    taxRate: 10,
    taxAmount: 0,
    showTaxOnReceipt: true,
    isDefault: true,
    isActive: true,
    createdDate: new Date().toISOString(),
  },
  {
    id: "tax_sales_5",
    taxName: "Sales Tax",
    taxType: "PERCENTAGE",
    taxRate: 5,
    taxAmount: 0,
    showTaxOnReceipt: true,
    isDefault: false,
    isActive: false,
    createdDate: new Date().toISOString(),
  },
];

export function getStoredTaxes(): TaxConfig[] {
  if (typeof window === "undefined") return DEFAULT_INITIAL_TAXES;
  try {
    const raw = localStorage.getItem(TAX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to parse stored tax configurations:", err);
  }
  try {
    localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TAXES));
  } catch {}
  return DEFAULT_INITIAL_TAXES;
}

export function saveStoredTaxes(taxes: TaxConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(taxes));
  } catch (err) {
    console.error("Failed to save tax configurations:", err);
  }
}

export function getActiveDefaultTax(): TaxConfig {
  const taxes = getStoredTaxes();
  const defaultActive = taxes.find((t) => t.isDefault && t.isActive);
  if (defaultActive) return defaultActive;
  const anyActive = taxes.find((t) => t.isActive);
  if (anyActive) return anyActive;
  return DEFAULT_INITIAL_TAXES[0];
}

export function createTaxConfig(input: TaxInput): TaxConfig {
  const taxes = getStoredTaxes();
  const newTax: TaxConfig = {
    id: `tax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    taxName: input.taxName,
    taxType: input.taxType,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    showTaxOnReceipt: input.showTaxOnReceipt,
    isDefault: input.isDefault,
    isActive: input.isActive,
    createdDate: new Date().toISOString(),
  };

  let updated = [...taxes];
  if (newTax.isDefault) {
    updated = updated.map((t) => ({ ...t, isDefault: false }));
  }
  updated.unshift(newTax);
  saveStoredTaxes(updated);
  return newTax;
}

export function updateTaxConfig(id: string, input: TaxInput): TaxConfig {
  const taxes = getStoredTaxes();
  let updatedTax: TaxConfig | null = null;

  const updated = taxes.map((t) => {
    if (t.id === id) {
      updatedTax = {
        ...t,
        taxName: input.taxName,
        taxType: input.taxType,
        taxRate: input.taxRate,
        taxAmount: input.taxAmount,
        showTaxOnReceipt: input.showTaxOnReceipt,
        isDefault: input.isDefault,
        isActive: input.isActive,
      };
      return updatedTax;
    }
    if (input.isDefault) {
      return { ...t, isDefault: false };
    }
    return t;
  });

  saveStoredTaxes(updated);
  if (!updatedTax) throw new Error("Tax configuration not found.");
  return updatedTax;
}

export function deleteTaxConfig(id: string): void {
  const taxes = getStoredTaxes();
  const updated = taxes.filter((t) => t.id !== id);
  saveStoredTaxes(updated);
}

export function setDefaultTaxConfig(id: string): TaxConfig[] {
  const taxes = getStoredTaxes();
  const updated = taxes.map((t) => ({
    ...t,
    isDefault: t.id === id,
    isActive: t.id === id ? true : t.isActive,
  }));
  saveStoredTaxes(updated);
  return updated;
}

export function toggleTaxConfigStatus(id: string): TaxConfig[] {
  const taxes = getStoredTaxes();
  const updated = taxes.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t));
  saveStoredTaxes(updated);
  return updated;
}
