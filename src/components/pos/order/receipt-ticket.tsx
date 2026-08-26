"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";

import type { Business } from "@/lib/api/business";
import type { BusinessCurrencyConfiguration } from "@/lib/api/currency";
import type { PosOrder, PosOrderItem, PosReceipt, Sale } from "@/lib/api/pos-order";
import type { TaxConfig } from "@/lib/api/tax";
import { getActiveDefaultTax } from "@/lib/tax-store";
import { useGetCustomersQuery } from "@/services/customerApi";
import {
  findCurrency,
  formatMoney,
  getRecordedSecondaryAmount,
  getSecondaryAmount,
} from "@/lib/money";
import { soldAsLabel } from "@/lib/pos/sold-as-label";
import { cn } from "@/lib/utils";

interface ReceiptTicketProps {
  business?: Business | null;
  order: PosOrder;
  receipt?: PosReceipt | null;
  /** Present immediately after payment; historical sale lookup is not exposed. */
  sale?: Sale | null;
  currencies?: BusinessCurrencyConfiguration;
  taxConfig?: TaxConfig | null;
  className?: string;
}

function businessInitials(name?: string | null) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function computeItemDiscountFromRule(
  item: PosOrderItem,
  orderItems: PosOrderItem[],
  rule: any
): number {
  if (item.discountAmount && item.discountAmount > 0) {
    return item.discountAmount;
  }
  if (!rule) return 0;

  // Check minimum conditions
  if (rule.minOrderAmount && rule.minOrderAmount > 0) {
    const subtotal = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    if (subtotal < rule.minOrderAmount) return 0;
  }

  if (rule.minQuantity && rule.minQuantity > 0) {
    const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty < rule.minQuantity) return 0;
  }

  let isEligible = true;
  if (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM") {
    const targetIds = new Set(rule.targetItemIds || []);
    if (targetIds.size > 0 && (!item.itemId || !targetIds.has(item.itemId))) {
      isEligible = false;
    }
  }

  if (!isEligible) return 0;

  const lineSubtotal = item.unitPrice * item.quantity;
  if (lineSubtotal <= 0) return 0;

  const targetIds = (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM")
    ? new Set(rule.targetItemIds || [])
    : null;

  // Handle Buy X Get Y discount scope calculation
  if (rule.buyQuantity && rule.getQuantity && rule.buyQuantity > 0 && rule.getQuantity > 0) {
    const eligibleUnits: { itemId: string; unitPrice: number }[] = [];
    for (const orderItem of orderItems) {
      if (!targetIds || targetIds.has(orderItem.itemId)) {
        for (let q = 0; q < orderItem.quantity; q++) {
          eligibleUnits.push({ itemId: orderItem.itemId, unitPrice: orderItem.unitPrice });
        }
      }
    }

    eligibleUnits.sort((a, b) => a.unitPrice - b.unitPrice);

    const freeCount = Math.floor(eligibleUnits.length / (rule.buyQuantity + rule.getQuantity)) * rule.getQuantity;
    if (freeCount <= 0) return 0;

    const freeUnits = eligibleUnits.slice(0, freeCount);
    const itemFreeQty = freeUnits.filter((u) => u.itemId === item.itemId).length;
    return itemFreeQty * item.unitPrice;
  }

  const eligibleSubtotal = orderItems.reduce((sum, i) => {
    if (!targetIds || targetIds.has(i.itemId)) {
      return sum + i.unitPrice * i.quantity;
    }
    return sum;
  }, 0);

  if (eligibleSubtotal <= 0) return 0;

  let disc = 0;
  if (rule.type === "PERCENTAGE") {
    disc = (lineSubtotal * rule.value) / 100;
    if (rule.maxDiscountAmount) {
      const totalPercentageDisc = (eligibleSubtotal * rule.value) / 100;
      if (totalPercentageDisc > rule.maxDiscountAmount) {
        disc = (lineSubtotal / eligibleSubtotal) * rule.maxDiscountAmount;
      }
    }
  } else if (rule.type === "FINAL_PRICE") {
    const targetAmount = Math.max(0, eligibleSubtotal - rule.value);
    disc = (lineSubtotal / eligibleSubtotal) * targetAmount;
  } else {
    const totalDisc = Math.min(eligibleSubtotal, rule.value);
    disc = (lineSubtotal / eligibleSubtotal) * totalDisc;
  }

  return Math.min(lineSubtotal, Math.max(0, parseFloat(disc.toFixed(2))));
}

export function ReceiptTicket({
  business,
  order,
  receipt,
  sale,
  currencies,
  taxConfig,
  className,
}: ReceiptTicketProps) {
  const { data: customers = [] } = useGetCustomersQuery();
  const customer = customers.find((c) => c.id === order.customerId);
  const businessName = business?.name?.trim() || "Your business";
  const invoiceNumber =
    receipt?.invoiceNumber || sale?.invoiceNumber || order.invoiceNumber || "—";
  const issuedAtValue = sale?.soldAt || receipt?.issuedAt || order.createdDate;
  const issuedAt = issuedAtValue ? new Date(issuedAtValue) : null;
  const currencyCode = sale?.currency || order.currency;
  // Prefer the business's own symbol and decimal places over the CLDR default.
  const currency = findCurrency(currencies, currencyCode) ?? currencyCode;
  const subtotal = sale?.subtotal ?? order.subtotal;
  const discount = sale?.discountAmount ?? order.discountAmount;
  const afterDiscount = Math.max(0, subtotal - discount);

  const activeTaxConfig = useMemo(() => {
    if (taxConfig !== undefined) return taxConfig;
    if (typeof window === "undefined") return null;
    return getActiveDefaultTax();
  }, [taxConfig]);

  const isHistoricalSale = Boolean(sale || (order && order.status === "PAID"));
  // `sale` is only ever passed right after a live payment; every other
  // viewer (Sales history, a reopened receipt) has to fall back to the
  // order's own record of how it was paid.
  const isPayLater = (sale?.paymentMethod ?? order.paymentMethod) === "PAY_LATER";

  const storedTaxRule = useMemo(() => {
    const id = sale?.orderId || order?.id;
    if (!id || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(`pos_order_tax_rule_${id}`);
      if (raw) return JSON.parse(raw);
    } catch { }
    return null;
  }, [sale?.orderId, order?.id]);

  let isTaxActive = false;
  let isTaxInclusive = false;
  let effectiveTaxRate = 0;
  let taxAmount = 0;

  const recordTaxInclusionType = sale?.taxInclusionType || order?.taxInclusionType;

  if (taxConfig !== undefined && taxConfig !== null) {
    // Explicit preview mode override (e.g. Tax Settings preview card)
    isTaxActive = taxConfig.isActive ?? false;
    isTaxInclusive = taxConfig.isTaxInclusive ?? false;
    effectiveTaxRate = isTaxActive ? (taxConfig.taxRate ?? 0) : 0;
    taxAmount = isTaxActive
      ? (isTaxInclusive
        ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
        : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2)))
      : 0;
  } else if (recordTaxInclusionType) {
    // Direct from Spring backend API (OrderResponse / SaleResponse)
    isTaxActive = (sale?.taxAmount && sale.taxAmount > 0) || (order?.taxAmount && order.taxAmount > 0) || (activeTaxConfig?.isActive ?? false);
    isTaxInclusive = recordTaxInclusionType === "INCLUSIVE";
    effectiveTaxRate = (sale?.taxRate || order?.taxRate) && (sale?.taxRate || order?.taxRate)! > 0
      ? (sale?.taxRate || order?.taxRate)!
      : (activeTaxConfig?.taxRate ?? 10);
    taxAmount = (sale?.taxAmount && sale.taxAmount > 0)
      ? sale.taxAmount
      : (order?.taxAmount && order.taxAmount > 0)
        ? order.taxAmount
        : (isTaxInclusive
          ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
          : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2)));
  } else if (storedTaxRule !== null) {
    // Historical frozen tax rule snapshot
    isTaxActive = storedTaxRule.isTaxActive ?? false;
    isTaxInclusive = storedTaxRule.taxInclusionType
      ? storedTaxRule.taxInclusionType === "INCLUSIVE"
      : (storedTaxRule.isTaxInclusive ?? false);
    effectiveTaxRate = storedTaxRule.taxRate ?? 0;
    taxAmount = storedTaxRule.taxAmount ?? 0;
  } else {
    // Check live store default tax settings
    const liveTaxActive = activeTaxConfig?.isActive ?? false;
    const liveTaxInclusive = activeTaxConfig?.isTaxInclusive ?? false;
    const liveTaxRate = activeTaxConfig?.taxRate ?? 10;

    if (isHistoricalSale && sale) {
      const saleTaxAmt = sale.taxAmount ?? 0;
      const saleTaxRate = sale.taxRate ?? 0;

      if (sale.totalAmount > afterDiscount + 0.01) {
        isTaxActive = true;
        isTaxInclusive = false;
        effectiveTaxRate = saleTaxRate > 0 ? saleTaxRate : liveTaxRate;
        taxAmount = saleTaxAmt > 0 ? saleTaxAmt : parseFloat((sale.totalAmount - afterDiscount).toFixed(2));
      } else if (saleTaxAmt > 0 || saleTaxRate > 0) {
        isTaxActive = true;
        isTaxInclusive = true;
        effectiveTaxRate = saleTaxRate > 0 ? saleTaxRate : liveTaxRate;
        taxAmount = saleTaxAmt;
      } else {
        isTaxActive = false;
        isTaxInclusive = false;
        effectiveTaxRate = 0;
        taxAmount = 0;
      }
    } else {
      // Current open cart
      isTaxActive = liveTaxActive;
      isTaxInclusive = liveTaxInclusive;
      effectiveTaxRate = isTaxActive
        ? ((order.taxRate && order.taxRate > 0) ? order.taxRate : liveTaxRate)
        : 0;

      const calculatedTax = isTaxActive
        ? (isTaxInclusive
          ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
          : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2)))
        : 0;

      taxAmount = isTaxActive
        ? ((order.taxAmount && order.taxAmount > 0) ? order.taxAmount : calculatedTax)
        : 0;
    }
  }

  const effectiveTaxName = activeTaxConfig?.taxName ?? "VAT";
  const effectiveShowTax = isTaxActive;

  const total = (isHistoricalSale && sale?.totalAmount && sale.totalAmount > 0)
    ? sale.totalAmount
    : (isTaxInclusive ? afterDiscount : Math.max(0, afterDiscount + taxAmount));
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountRatio = subtotal > 0 && discount > 0 ? discount / subtotal : 0;

  const storedRule = useMemo(() => {
    const id = sale?.orderId || sale?.id || order?.id;
    if (!id || typeof window === "undefined") return null;
    try {
      const raw =
        localStorage.getItem(`pos_order_discount_rule_${id}`) ||
        localStorage.getItem(`pos_cart_discount_${id}`);
      if (raw) return JSON.parse(raw);
    } catch { }
    return null;
  }, [sale?.orderId, sale?.id, order?.id]);

  const discountLabel = useMemo(() => {
    if (storedRule?.label) return storedRule.label;
    if (discount > 0) {
      return discountPercent > 0 ? `${discountPercent.toFixed(0)}% OFF` : "Savings";
    }
    return null;
  }, [storedRule, discount, discountPercent]);
  // The settled record carries the rate it was priced at; only an order still
  // open has to fall back to whatever is configured right now.
  const record = sale ?? order;
  const displayTotal =
    getRecordedSecondaryAmount(total, record, currencies) ??
    getSecondaryAmount(total, currencyCode, currencies);
  const locationStr = [business?.address, business?.cityOrProvince]
    .filter(Boolean)
    .join(", ");
  const statusStr = String(order.status || "");
  const isUnpaid = statusStr === "PENDING" || statusStr === "PARKED" || statusStr === "DRAFT" || (!sale && !receipt && statusStr !== "PAID");
  const documentTitle = isUnpaid
    ? "UNPAID ORDER TICKET"
    : receipt?.vatNumber
      ? "Tax invoice"
      : "Receipt";
  const documentTitleKhmer = isUnpaid
    ? "វិក្កយបត្រ (មិនទាន់ទូទាត់)"
    : receipt?.vatNumber
      ? "វិក្កយបត្រ"
      : "បង្កាន់ដៃ";

  return (
    <article
      className={cn(
        "receipt-ticket w-full max-w-[559px] rounded-[7px] bg-white px-[18px] pb-[26px] pt-5 shadow-[0_2px_5px_rgba(20,20,19,0.12)] print:max-w-none print:rounded-none print:shadow-none sm:px-[22px]",
        className,
      )}
    >
      <header className="flex flex-col items-center pb-[14px] text-center">
        <span className="grid size-[50px] place-items-center overflow-hidden rounded-lg bg-primary/5 text-base font-black text-primary">
          {business?.logo ? (
            // The owner controls this URL through the business-profile API.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt={`${businessName} logo`}
              className="size-full object-contain"
            />
          ) : businessInitials(businessName) ? (
            businessInitials(businessName)
          ) : (
            <Building2 className="size-6" aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-[13px] text-[22px] font-bold leading-[1.45] tracking-[0.44px] text-[#006b26]">
          {businessName}
        </h1>
        {locationStr && (
          <p className="mt-[7px] max-w-full text-[13px] leading-[1.5] text-[#3d4a3c]">
            {locationStr}
          </p>
        )}
        {business?.phoneNumber && (
          <p className="text-[13px] leading-[1.45] text-[#3d4a3c]">
            Tel: {business.phoneNumber}
          </p>
        )}
        {receipt?.vatNumber && (
          <p className="mt-1 font-mono text-xs leading-[1.45] text-[#3d4a3c]">
            VATTIN: {receipt.vatNumber}
          </p>
        )}
      </header>

      <section className="border-y border-dashed border-[#9aa79a] py-[9px] text-center">
        <h2 className="text-base font-bold uppercase leading-[1.45] tracking-[2.24px] text-[#006b26]">
          {documentTitle}
        </h2>
        <p className="text-[13px] leading-[1.45] text-[#3d4a3c]">
          {documentTitleKhmer}
        </p>
      </section>

      {isPayLater && (
        <div className="mt-2.5 rounded-[5px] border border-[#f2c14e] bg-[#fff8e6] px-3 py-2 text-center">
          <p className="text-[13px] font-bold uppercase tracking-widest text-[#8a5a06]">
            Payment pending
          </p>
          <p className="text-[11px] leading-[1.45] text-[#8a5a06]">
            មិនទាន់បង់ប្រាក់ · balance due at settlement
          </p>
        </div>
      )}

      <dl className="grid grid-cols-[minmax(0,125px)_minmax(0,1fr)] gap-x-2.5 gap-y-1 py-2.5 text-[13px] leading-[1.45] text-[#3d4a3c]">
        <dt>Receipt No.</dt>
        <dd className="truncate text-right font-mono font-bold text-[#0e140e]">
          {invoiceNumber}
        </dd>
        {customer && (
          <>
            <dt>Customer / អតិថិជន</dt>
            <dd className="truncate text-right font-semibold text-[#006b26]">
              {customer.globalCustomer?.fullName || "Valued Customer"}
              {customer.membershipType && ` (${customer.membershipType.typeName})`}
            </dd>
          </>
        )}
        <dt>Date / កាលបរិច្ឆេទ</dt>
        <dd className="text-right font-mono text-[#0e140e]">
          {issuedAt
            ? `${issuedAt.toLocaleDateString("en-GB")} · ${issuedAt.toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" },
            )}`
            : "—"}
        </dd>
        <dt>Ref / លេខយោង</dt>
        <dd className="truncate text-right text-[#0e140e]">
          {order.note?.trim() || order.channel}
        </dd>
      </dl>

      <div className="border-t border-dashed border-[#9aa79a]">
        <div className="grid grid-cols-[minmax(0,1fr)_36px_82px] gap-2 pb-[5px] pt-[7px] text-[11px] font-semibold uppercase leading-[1.45] tracking-[0.44px] text-[#3d4a3c]">
          <span>Item / Service</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Amount</span>
        </div>

        {order.items.map((item) => {
          const grossAmount = item.unitPrice * item.quantity;
          let itemDisc = item.discountAmount ?? 0;
          if (itemDisc <= 0 && storedRule) {
            itemDisc = computeItemDiscountFromRule(item, order.items, storedRule);
          }
          const netAmount = Math.max(0, grossAmount - itemDisc);
          const itemDiscPercent = grossAmount > 0 && itemDisc > 0 ? Math.round((itemDisc / grossAmount) * 100) : 0;

          return (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_36px_82px] items-start gap-2 border-b border-dashed border-[#dde4d9] py-[5px]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-[1.45] text-[#0e140e]">
                  {item.itemName}
                </p>
                {/* Exactly what was sold. A receipt is the record a refund is
                    argued from, and "Coke" alone cannot tell a single can from
                    a six pack — the two are different money and different
                    stock. */}
                {soldAsLabel(item) ? (
                  <p className="text-[11px] leading-[1.45] text-[#3d4a3c]">
                    {soldAsLabel(item)}
                  </p>
                ) : null}
                {item.addOns?.length ? (
                  <p className="text-[11px] leading-[1.45] text-[#6d7a77]">
                    {item.addOns.map((addOn) => `+ ${addOn.name}`).join(", ")}
                  </p>
                ) : null}
                {/* How it was made. Free, so it never shows in the money, but
                    a refund argued from this receipt turns on it. */}
                {item.selections?.length ? (
                  <p className="text-[11px] leading-[1.45] text-[#6d7a77]">
                    {item.selections
                      .map((selection) => `${selection.attributeName}: ${selection.label}`)
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="font-mono text-[11px] leading-[1.45] text-[#6d7a77]">
                  {formatMoney(item.unitPrice, currency)} ea
                  {itemDisc > 0 && (storedRule?.buyQuantity && storedRule?.getQuantity) ? (
                    <span className="ml-1.5 font-bold text-[#006b26]">
                      (FREE ITEM)
                    </span>
                  ) : itemDiscPercent > 0 && storedRule?.type === "PERCENTAGE" ? (
                    <span className="ml-1.5 font-bold text-[#006b26]">
                      ({itemDiscPercent}% OFF)
                    </span>
                  ) : itemDisc > 0 ? (
                    <span className="ml-1.5 font-bold text-[#006b26]">
                      (-{formatMoney(itemDisc, currency)})
                    </span>
                  ) : null}
                </p>
              </div>
              <span className="text-center font-mono text-sm leading-[1.45] text-[#0e140e]">
                {item.quantity}
              </span>
              <span className="text-right font-mono text-sm font-medium leading-[1.45] text-[#0e140e]">
                {itemDisc > 0 ? (
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-[11px] font-normal text-gray-400 line-through">
                      {formatMoney(grossAmount, currency)}
                    </span>
                    <span className="font-bold text-[#006b26]">
                      {formatMoney(netAmount, currency)}
                    </span>
                  </div>
                ) : (
                  formatMoney(grossAmount, currency)
                )}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="space-y-1 pt-2.5 text-[13px] leading-[1.45] text-[#3d4a3c]">
        <div className="flex justify-between gap-4">
          <dt>Subtotal / សរុបដើម</dt>
          <dd className="font-mono text-[#0e140e]">
            {formatMoney(subtotal, currency)}
          </dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-4 font-medium text-[#d14341]">
            <dt className="flex items-center gap-1">
              Discount / បញ្ចុះតម្លៃ
              {discountLabel && (
                <span className="font-semibold text-xs text-[#006b26]">
                  ({discountLabel})
                </span>
              )}
            </dt>
            <dd className="font-mono font-bold">
              -{formatMoney(discount, currency)}
            </dd>
          </div>
        )}

        {effectiveShowTax && !isTaxInclusive && taxAmount > 0 && (
          <div className="flex justify-between gap-4 text-[#52605b] text-xs">
            <dt>Amount Excl. Tax / សរុបមិនទាន់គិតអាករ</dt>
            <dd className="font-mono font-medium">
              {formatMoney(afterDiscount, currency)}
            </dd>
          </div>
        )}

        {effectiveShowTax && !isTaxInclusive && taxAmount > 0 && (
          <div className="flex justify-between gap-4 font-medium text-[#006b26]">
            <dt className="flex items-center gap-1">
              +
              {effectiveTaxName.includes("VAT") ? "VAT" : (effectiveTaxName.split("(")[0]?.trim() || effectiveTaxName)}
              {effectiveTaxRate > 0 ? ` (${effectiveTaxRate}%)` : ""} / អាករ
            </dt>
            <dd className="font-mono font-bold">
              +{formatMoney(taxAmount, currency)}
            </dd>
          </div>
        )}
      </dl>

      <dl className="mt-2.5 rounded-[5px] border border-[#cfe7ca] bg-[#f4fbed] px-3 py-2.5 text-[#006b26]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-bold uppercase">
            Total {!isTaxInclusive && effectiveShowTax && taxAmount > 0 ? "(Incl. Tax)" : ""} / សរុប{!isTaxInclusive && effectiveShowTax && taxAmount > 0 ? "រួមអាករ" : ""}
          </dt>
          <dd className="font-mono text-xl font-bold leading-none">
            {formatMoney(total, currency)}
          </dd>
        </div>
        {displayTotal && (
          <div className="mt-1 flex justify-between gap-4 text-xs text-[#3d4a3c]">
            <dt>
              សរុប ({displayTotal.currency.code}) · @ {displayTotal.rate.toLocaleString()}
            </dt>
            <dd className="font-mono font-bold text-[#0e140e]">
              {formatMoney(displayTotal.amount, displayTotal.currency)}
            </dd>
          </div>
        )}
      </dl>

      {isTaxActive && isTaxInclusive && (
        <p className="mt-2 text-center text-[11px] font-medium text-[#3d4a3c] italic">
          * Product prices include {effectiveTaxName.includes("VAT") ? "VAT" : effectiveTaxName} {effectiveTaxRate > 0 ? `(${effectiveTaxRate}%)` : ""} · តម្លៃរួមបញ្ចូលអាកររួចជាស្រេច
        </p>
      )}

      <dl className="space-y-1 border-b border-dashed border-[#9aa79a] py-2.5 text-[13px] leading-[1.45] text-[#3d4a3c]">
        {isPayLater ? (
          <>
            <div className="flex justify-between gap-4">
              <dt>Amount paid</dt>
              <dd className="font-mono text-[#0e140e]">
                {formatMoney(0, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 font-bold text-[#b45309]">
              <dt>Balance due / នៅជំពាក់</dt>
              <dd className="font-mono">{formatMoney(total, currency)}</dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between gap-4">
              <dt>
                Paid
                {(sale?.paymentMethod ?? order.paymentMethod) === "CASH"
                  ? " · Cash"
                  : (sale?.paymentMethod ?? order.paymentMethod) === "DIGITAL"
                    ? " · Digital"
                    : ""}
              </dt>
              <dd className="font-mono text-[#0e140e]">
                {formatMoney(
                  sale?.paymentMethod === "CASH" ? sale.paidAmount : total,
                  currency,
                )}
              </dd>
            </div>
            {sale?.paymentMethod === "CASH" && (
              <div className="flex justify-between gap-4">
                <dt>Change / អាប់</dt>
                <dd className="font-mono text-[#0e140e]">
                  {formatMoney(sale.changeAmount, currency)}
                </dd>
              </div>
            )}
          </>
        )}
      </dl>

      <footer className="pt-2.5 text-center">
        <p className="text-[13px] font-bold leading-[1.45] text-[#0e140e]">
          Thank you! · អរគុណ
        </p>
        {business?.website && (
          <p className="mt-0.5 text-[11px] leading-[1.45] text-[#3d4a3c]">
            {business.website}
          </p>
        )}
      </footer>
    </article>
  );
}
