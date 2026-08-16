"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";

import type { Business } from "@/lib/api/business";
import type { BusinessCurrencyConfiguration } from "@/lib/api/currency";
import type { PosOrder, PosReceipt, Sale } from "@/lib/api/pos-order";
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
  business: Business;
  order: PosOrder;
  receipt?: PosReceipt | null;
  /** Present immediately after payment; historical sale lookup is not exposed. */
  sale?: Sale | null;
  currencies?: BusinessCurrencyConfiguration;
  className?: string;
}

function businessInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const businessName = business.name?.trim() || "Your business";
  const invoiceNumber =
    receipt?.invoiceNumber || sale?.invoiceNumber || order.invoiceNumber || "—";
  const issuedAtValue = sale?.soldAt || receipt?.issuedAt || order.createdDate;
  const issuedAt = issuedAtValue ? new Date(issuedAtValue) : null;
  const currencyCode = sale?.currency || order.currency;
  // Prefer the business's own symbol and decimal places over the CLDR default.
  const currency = findCurrency(currencies, currencyCode) ?? currencyCode;
  const subtotal = sale?.subtotal ?? order.subtotal;
  const discount = sale?.discountAmount ?? order.discountAmount;

  // Active Tax calculations
  const taxRate = sale?.taxRate ?? order.taxRate ?? null;

  const activeTaxConfig = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getActiveDefaultTax();
  }, []);

  const effectiveTaxName = activeTaxConfig?.taxName ?? "VAT";
  const effectiveTaxRate = (taxRate && taxRate > 0) ? taxRate : (activeTaxConfig?.taxRate ?? 10);
  const effectiveShowTax = activeTaxConfig?.showTaxOnReceipt ?? true;

  const calculatedTax = (subtotal - discount) * (effectiveTaxRate / 100);
  const rawTaxAmount = (sale?.taxAmount && sale.taxAmount > 0)
    ? sale.taxAmount
    : (order.taxAmount && order.taxAmount > 0)
      ? order.taxAmount
      : calculatedTax;

  const taxAmount = Math.max(0, rawTaxAmount);

  const total = (sale?.totalAmount && sale.totalAmount > 0 && sale?.taxAmount && sale.taxAmount > 0)
    ? sale.totalAmount
    : Math.max(0, subtotal - discount + taxAmount);
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountRatio = subtotal > 0 && discount > 0 ? discount / subtotal : 0;

  const storedRule = useMemo(() => {
    if (!order?.id || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(`pos_cart_discount_${order.id}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, [order?.id]);

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
  const location = [business.address, business.cityOrProvince]
    .filter(Boolean)
    .join(", ");
  const documentTitle = receipt?.vatNumber ? "Tax invoice" : "Receipt";
  const documentTitleKhmer = receipt?.vatNumber ? "វិក្កយបត្រ" : "បង្កាន់ដៃ";

  return (
    <article
      className={cn(
        "receipt-ticket w-full max-w-[559px] rounded-[7px] bg-white px-[18px] pb-[26px] pt-5 shadow-[0_2px_5px_rgba(20,20,19,0.12)] print:max-w-none print:rounded-none print:shadow-none sm:px-[22px]",
        className,
      )}
    >
      <header className="flex flex-col items-center pb-[14px] text-center">
        <span className="grid size-[50px] place-items-center overflow-hidden rounded-lg bg-primary/5 text-base font-black text-primary">
          {business.logo ? (
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
        {location && (
          <p className="mt-[7px] max-w-full text-[13px] leading-[1.5] text-[#3d4a3c]">
            {location}
          </p>
        )}
        {business.phoneNumber && (
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
          const itemDisc = item.discountAmount ?? 0;
          const netAmount = item.lineTotal ?? (grossAmount - itemDisc);

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
                </p>
                {itemDisc > 0 && (
                  <p className="font-mono text-[11px] font-medium text-[#d14341]">
                    Disc: -{formatMoney(itemDisc, currency)}
                  </p>
                )}
              </div>
              <span className="text-center font-mono text-sm leading-[1.45] text-[#0e140e]">
                {item.quantity}
              </span>
              <span className="text-right font-mono text-sm font-medium leading-[1.45] text-[#0e140e]">
                {formatMoney(netAmount, currency)}
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
        {effectiveShowTax && taxAmount > 0 && (
          <div className="flex justify-between gap-4 font-medium text-[#006b26]">
            <dt className="flex items-center gap-1">
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
          <dt className="text-sm font-bold uppercase">Total</dt>
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

      <dl className="space-y-1 border-b border-dashed border-[#9aa79a] py-2.5 text-[13px] leading-[1.45] text-[#3d4a3c]">
        <div className="flex justify-between gap-4">
          <dt>
            Paid
            {sale
              ? ` · ${sale.paymentMethod === "CASH" ? "Cash" : "Digital"}`
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
      </dl>

      <footer className="pt-2.5 text-center">
        <p className="text-[13px] font-bold leading-[1.45] text-[#0e140e]">
          Thank you! · អរគុណ
        </p>
        {business.website && (
          <p className="mt-0.5 text-[11px] leading-[1.45] text-[#3d4a3c]">
            {business.website}
          </p>
        )}
      </footer>
    </article>
  );
}
