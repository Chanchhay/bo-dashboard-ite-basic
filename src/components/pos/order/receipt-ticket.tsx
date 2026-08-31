"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";

import type { Business } from "@/lib/api/business";
import type { BusinessCurrencyConfiguration } from "@/lib/api/currency";
import type { PosOrder, PosOrderItem, PosReceipt, Sale } from "@/lib/api/pos-order";
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
    if (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM") {
      disc = Math.min(lineSubtotal, rule.value * item.quantity);
    } else {
      const totalDisc = Math.min(eligibleSubtotal, rule.value);
      disc = (lineSubtotal / eligibleSubtotal) * totalDisc;
    }
  }

  return Math.min(lineSubtotal, Math.max(0, parseFloat(disc.toFixed(2))));
}

export function ReceiptTicket({
  business,
  order,
  receipt,
  sale,
  currencies,
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

  // Once the backend has attributed the discount to specific lines (any line
  // carries its own non-zero discountAmount), that breakdown is authoritative
  // — a line the backend left at zero really got nothing, most commonly a
  // storewide Buy X Get Y that gave its free unit to a different, cheaper
  // line entirely. Only a fully legacy order with no per-line breakdown at
  // all falls back to guessing a proportional split.
  const hasExplicitLineDiscounts = (order.items || []).some(
    (item) => (item.discountAmount ?? 0) > 0,
  );

  const rawSubtotal = sale?.subtotal ?? order.subtotal ?? 0;
  const itemsDiscountSum = (order.items || []).reduce((sum, item) => {
    let itemDisc = item.discountAmount ?? 0;
    if (itemDisc <= 0 && !hasExplicitLineDiscounts && storedRule) {
      itemDisc = computeItemDiscountFromRule(item, order.items, storedRule);
    }
    return sum + itemDisc;
  }, 0);

  const rawDiscount = sale?.discountAmount ?? order.discountAmount ?? 0;
  const discount = Math.max(rawDiscount, itemsDiscountSum);
  const subtotal = rawSubtotal > 0 ? rawSubtotal : (order.items || []).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const afterDiscount = Math.max(0, subtotal - discount);

  // `sale` is only ever passed right after a live payment; every other
  // viewer (Sales history, a reopened receipt) has to fall back to the
  // order's own record of how it was paid.
  const isPayLater = (sale?.paymentMethod ?? order.paymentMethod) === "PAY_LATER";

  // Tax was computed once, server-side, when the order was created (or last
  // repriced) — reading it straight off the record matches every other
  // channel and never drifts from what was actually charged.
  const isTaxInclusive = (sale?.taxInclusionType ?? order?.taxInclusionType) === "INCLUSIVE";
  const effectiveTaxRate = sale?.taxRate ?? order?.taxRate ?? 0;
  const isTaxActive = (sale?.taxAmount ?? order?.taxAmount ?? 0) > 0 || effectiveTaxRate > 0;
  const effectiveTaxName = business?.taxLabel || "VAT";
  const effectiveShowTax = isTaxActive;

  const taxAmount = isTaxActive
    ? (isTaxInclusive
      ? Math.round((afterDiscount - afterDiscount / (1 + effectiveTaxRate / 100)) * 100) / 100
      : Math.round(afterDiscount * (effectiveTaxRate / 100) * 100) / 100)
    : 0;

  const total = isTaxInclusive
    ? afterDiscount
    : Math.max(0, afterDiscount + taxAmount);
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountRatio = subtotal > 0 && discount > 0 ? discount / subtotal : 0;

  // The backend names the discount the same way on every channel — prefer
  // that over the locally-stored rule, which only exists on the device that
  // applied it and is never populated at all on the customer display.
  const discountLabel = useMemo(() => {
    if (sale?.discountLabel) return sale.discountLabel;
    if (order?.discountLabel) return order.discountLabel;
    // The order/sale record itself often has no aggregate label even though
    // the backend already named the discount on whichever line(s) it
    // actually applied to — reuse that real name instead of fabricating a
    // percentage that may not even describe the discount (e.g. a Buy X Get Y
    // showing up as "27% OFF", which is just discount÷subtotal, not what the
    // discount actually is).
    const firstLineLabel = (order.items || []).find(
      (item) => (item.discountAmount ?? 0) > 0 && item.discountLabel,
    )?.discountLabel;
    if (firstLineLabel) return firstLineLabel;
    if (storedRule?.label) return storedRule.label;
    if (discount > 0) {
      return discountPercent > 0 ? `${discountPercent.toFixed(0)}% OFF` : "Savings";
    }
    return null;
  }, [sale?.discountLabel, order?.discountLabel, order.items, storedRule, discount, discountPercent]);
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
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
              }}
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
        {(customer?.globalCustomer?.phoneNumber || order.customerPhone) && (
          <>
            <dt>Phone / លេខទូរស័ព្ទ</dt>
            <dd className="truncate text-right font-mono text-[#0e140e]">
              {customer?.globalCustomer?.phoneNumber || order.customerPhone}
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
          if (itemDisc <= 0 && !hasExplicitLineDiscounts && storedRule) {
            itemDisc = computeItemDiscountFromRule(item, order.items, storedRule);
          }
          if (itemDisc <= 0 && !hasExplicitLineDiscounts && discount > 0 && subtotal > 0) {
            itemDisc = parseFloat(((grossAmount / subtotal) * discount).toFixed(2));
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
                {item.selections?.length ? (
                  <p className="text-[11px] leading-[1.45] text-[#6d7a77]">
                    {item.selections
                      .map((selection) => `${selection.attributeName}: ${selection.label}`)
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="font-mono text-[11px] leading-[1.45] text-[#6d7a77]">
                  {formatMoney(item.unitPrice, currency)} ea
                  {itemDisc > 0 && (
                    <span className="ml-1.5 font-bold text-[#d14341]">
                      {item.discountLabel
                        ? `(${item.discountLabel})`
                        : storedRule?.label
                          ? `(${storedRule.label})`
                          : discountLabel
                            ? `(${discountLabel})`
                            : itemDiscPercent > 0
                              ? `(${itemDiscPercent}% OFF)`
                              : `(-${formatMoney(itemDisc, currency)})`}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-center font-mono text-sm leading-[1.45] text-[#0e140e]">
                {item.quantity}
              </span>
              <span className="text-right font-mono text-sm font-medium leading-[1.45] text-[#0e140e]">
                {itemDisc > 0 ? (
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-[11px] font-normal text-[#d14341] line-through">
                      {formatMoney(grossAmount, currency)}
                    </span>
                    <span className="font-bold text-primary">
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
                <span className="font-semibold text-xs text-primary">
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
          <div className="flex justify-between gap-4 font-medium text-primary">
            <dt className="flex items-center gap-1">
              +
              {effectiveTaxName}
              {effectiveTaxRate > 0 ? ` (${effectiveTaxRate}%)` : ""} / អាករ
            </dt>
            <dd className="font-mono font-bold">
              +{formatMoney(taxAmount, currency)}
            </dd>
          </div>
        )}
      </dl>

      <dl className="mt-2.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-primary dark:border-primary/40 dark:bg-primary/20">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-bold uppercase text-primary">
            Total / សរុប
          </dt>
          <dd className="font-mono text-xl font-bold leading-none text-primary">
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
          * Product prices include {effectiveTaxName} {effectiveTaxRate > 0 ? `(${effectiveTaxRate}%)` : ""} · តម្លៃរួមបញ្ចូលអាកររួចជាស្រេច
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
                  {formatMoney(
                    sale.paidAmount != null && sale.paidAmount >= total
                      ? Math.max(0, sale.paidAmount - total)
                      : (sale.changeAmount ?? 0),
                    currency,
                  )}
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
