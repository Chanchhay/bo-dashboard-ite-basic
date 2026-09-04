"use client";

import { use, useMemo, useState } from "react";
import {
  CheckCircle2,
  Moon,
  QrCode,
  ShoppingBag,
  Store,
  Sun,
} from "lucide-react";
import { useCustomerDisplayListener } from "@/hooks/useCustomerDisplayListener";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useMoney } from "@/hooks/useMoney";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import { ReceiptTicket } from "@/components/pos/order/receipt-ticket";
import { soldAsLabel } from "@/lib/pos/sold-as-label";
import type { Business } from "@/lib/api/business";
import type { PosOrder, Sale } from "@/lib/api/pos-order";
import Image from "next/image";

interface CustomerDisplayPageProps {
  params: Promise<{ terminalId: string }>;
}

// Default fallback business cover photo if no custom thumbnail has been uploaded yet
const DEFAULT_BUSINESS_THUMBNAIL =
  "https://zeew.eu/wp-content/uploads/2025/09/360_F_157167850_C8MN16DXyxNmJGvqlLJZm4pcO9DCwImy.jpg";

export default function CustomerDisplayPage({ params }: CustomerDisplayPageProps) {
  const { terminalId } = use(params);
  const { data: businessProfile } = useGetBusinessProfileQuery();
  const displayData = useCustomerDisplayListener(terminalId, businessProfile?.id);
  const { format, secondaryFor } = useMoney();
  const [isDarkMode, setIsDarkMode] = useState(false); // Default clean mode like POS terminal

  const status = displayData?.status ?? "IDLE";
  const items = displayData?.items ?? [];
  const total = displayData?.total ?? 0;
  const subtotal = displayData?.subtotal ?? 0;
  const discount = displayData?.discountAmount ?? 0;
  const discountLabel = displayData?.discountLabel ?? null;
  const currency = displayData?.currency ?? null;
  const tax = displayData?.tax ?? 0;
  const taxRate = displayData?.taxRate ?? 0;
  const isTaxInclusive = displayData?.taxInclusionType === "INCLUSIVE";
  const taxLabel = businessProfile?.taxLabel || "VAT";

  // Real business name, logo & thumbnail from database / published state
  const storeName =
    displayData?.businessName || businessProfile?.name || "Business Store";
  const storeLogo = displayData?.businessLogo || businessProfile?.logo;
  const storeThumbnail =
    displayData?.businessThumbnail ||
    businessProfile?.thumbnail ||
    DEFAULT_BUSINESS_THUMBNAIL;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const secondaryTotal = secondaryFor(total, { currency });

  const businessObj = useMemo(
    () =>
      ({
        id: businessProfile?.id || displayData?.businessId || "",
        name: storeName,
        logo: storeLogo || null,
        address: businessProfile?.address,
        cityOrProvince: businessProfile?.cityOrProvince,
        phoneNumber: businessProfile?.phoneNumber,
        website: businessProfile?.website,
      }) as Business,
    [businessProfile, displayData?.businessId, storeName, storeLogo],
  );

  const completedOrderObj = useMemo(
    () =>
      ({
        id: "completed-order",
        businessId: businessProfile?.id || "",
        channel: "POS",
        invoiceNumber: displayData?.invoiceNumber || "—",
        currency: currency,
        subtotal: subtotal,
        discountAmount: discount,
        discountLabel: discountLabel,
        taxRate: taxRate,
        taxAmount: tax,
        taxInclusionType: displayData?.taxInclusionType ?? null,
        total: total,
        createdDate: displayData?.updatedAt,
        items: items.map((i) => ({
          id: i.id,
          itemId: i.itemId,
          itemName: i.name,
          variantName: i.variantName ?? null,
          unitName: i.unitName ?? null,
          unitFactor: i.unitFactor ?? null,
          addOns: (i.addOns || []).map((addOn) => ({
            addOnId: null,
            name: addOn.name,
            unitPrice: 0,
          })),
          quantity: i.quantity,
          freeQuantity: i.freeQuantity ?? 0,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
          lineTotal: i.lineTotal,
        })),
      }) as PosOrder,
    [
      businessProfile?.id,
      displayData?.invoiceNumber,
      displayData?.updatedAt,
      displayData?.taxInclusionType,
      currency,
      subtotal,
      discount,
      discountLabel,
      taxRate,
      tax,
      total,
      items,
    ],
  );

  const completedSaleObj = useMemo(() => {
    if (status !== "COMPLETED") return null;
    return {
      id: "completed-sale",
      orderId: "completed-order",
      invoiceNumber: displayData?.invoiceNumber || "",
      paymentMethod: displayData?.paymentMethod || "CASH",
      paidAmount: displayData?.paidAmount ?? total,
      changeAmount: displayData?.changeAmount ?? 0,
      subtotal: subtotal,
      discountAmount: discount,
      discountLabel: discountLabel,
      taxRate: taxRate,
      taxAmount: tax,
      taxInclusionType: displayData?.taxInclusionType ?? null,
      totalAmount: total,
      currency: currency,
      soldAt: displayData?.updatedAt || new Date().toISOString(),
    } as Sale;
  }, [
    status,
    displayData?.invoiceNumber,
    displayData?.paymentMethod,
    displayData?.paidAmount,
    displayData?.changeAmount,
    displayData?.updatedAt,
    displayData?.taxInclusionType,
    subtotal,
    discount,
    discountLabel,
    taxRate,
    tax,
    total,
    currency,
  ]);

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans select-none transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f4f6f9] text-slate-900"
        }`}
    >
      {/* LEFT PANEL: Full-Bleed Business Thumbnail Cover (38% width) */}
      <div className="relative flex w-[38%] flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-white">
        {/* Full-Height Business Thumbnail Image Layer */}
        {/* eslint-disable-next-html-element-suppress */}
        <Image
          src={storeThumbnail}
          alt={storeName}
          height={100}
          width={100}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
        />

        {/* Gradient Overlay for Crisp Text & QR Code Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/75 backdrop-blur-[1px]" />

        {/* Left Panel Floating Overlay Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-6 lg:p-8">
          {/* <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/80 backdrop-blur-md px-4 py-2.5 border border-white/15 shadow-xl">
              {storeLogo ? (
                <Image
                  src={storeLogo}
                  alt={storeName}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl object-cover border border-white/30"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md">
                  <Store className="h-5 w-5" />
                </div>
              )}
              <span className="font-black text-base tracking-tight text-white">
                {storeName}
              </span>
            </div>
            <span className="rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-white border border-white/15 shadow-md">
              Official Store
            </span>
          </div> */}

          {/* Center Content (BIG KHQR Code during payment / Receipt Ticket on COMPLETED / Hero Welcome Card during idle) */}
          {status === "PAYMENT_PENDING" ? (
            <div className="my-auto flex flex-col items-center text-center px-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-2 flex items-center gap-1.5 rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-extrabold text-amber-300 border border-amber-500/30 backdrop-blur-md">
                <QrCode className="h-4 w-4 text-amber-400" />
                <span>SCAN KHQR TO PAY</span>
              </div>

              {/* Large Big QR Code in Center */}
              {displayData?.qrCodeUrl ? (
                <div className="relative my-4 p-3.5 rounded-2xl bg-white border-4 border-primary/30 shadow-2xl">
                  {/* eslint-disable-next-html-element-suppress */}
                  <img
                    src={displayData.qrCodeUrl}
                    alt="Payment KHQR Code"
                    className="h-64 w-64 lg:h-72 lg:w-72 rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-64 w-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/30 bg-slate-900/90 backdrop-blur-md p-4 shadow-inner my-4">
                  <QrCode className="h-16 w-16 text-primary animate-bounce" />
                  <span className="mt-3 text-xs text-white/80 font-semibold">
                    Generating KHQR Code...
                  </span>
                </div>
              )}

              {/* Total Payment Amount Prominently Shown in Center */}
              <div className="mt-1 flex flex-col items-center rounded-2xl bg-slate-950/85 backdrop-blur-md px-6 py-3 border border-white/15 shadow-2xl">
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  Total Amount Due
                </span>
                <div className="text-3xl lg:text-4xl font-black text-amber-400 tracking-tight leading-tight">
                  {format(total, currency)}
                </div>
                {secondaryTotal && (
                  <div className="text-base font-extrabold text-slate-200 mt-0.5">
                    {format(secondaryTotal.amount, secondaryTotal.currency.code)}
                  </div>
                )}
              </div>

              <p className="mt-4 text-[11px] font-semibold text-white/80">
                Accepts Bakong, ABA, ACLEDA & all Banking Apps
              </p>
            </div>
          ) : status === "COMPLETED" ? (
            <div className="my-auto flex flex-col items-center overflow-y-auto px-1 py-2 animate-in fade-in duration-300 w-full max-h-[92vh] scrollbar-hide">
              <div className="mb-2 flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold text-primary border border-primary/25 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>RECEIPT · វិក្កយបត្រ</span>
              </div>
              <ReceiptTicket
                business={businessObj}
                order={completedOrderObj}
                sale={completedSaleObj}
                className="mx-auto my-1 max-h-[82vh] overflow-y-auto shadow-2xl border border-white/20 text-slate-900 scale-95"
              />
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center text-center px-4 animate-in fade-in duration-200">
              {/* Store Logo Hero Icon */}
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-950/80 backdrop-blur-md shadow-2xl border border-white/20 overflow-hidden">
                {storeLogo ? (
                  /* eslint-disable-next-html-element-suppress */
                  <img
                    src={storeLogo}
                    alt={storeName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                    }}
                  />
                ) : (
                  <Store className="h-12 w-12 text-amber-400" />
                )}
              </div>

              <h2 className="text-3xl lg:text-4xl font-black text-white drop-shadow-lg tracking-tight">
                Welcome to {storeName}
              </h2>
              <p className="mt-3 text-sm text-slate-200 max-w-xs leading-relaxed font-medium drop-shadow-md">
                Enjoy special member rewards & instant promotions on every purchase.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Header, Cart Table & Totals (62% width) */}
      <div className="flex flex-1 flex-col">
        {/* Top Primary Header Bar */}
        <div className="flex h-16 shrink-0 items-center justify-between bg-primary px-6 text-white shadow-md">
          {/* Store Logo & Real Name */}
          <div className="flex items-center gap-3">
            {storeLogo ? (
              /* eslint-disable-next-html-element-suppress */
              <Image
                src={storeLogo}
                alt={storeName}
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-lg object-cover bg-white p-0.5 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                }}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">
                <Store className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Header Controls (Light/Dark mode) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Toggle Light / Dark Mode"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Item List Table / Completion Screen */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === "IDLE" || items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <ShoppingBag className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                បញ្ជីទំនិញទទេ (Cart Empty)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Items added by cashier will appear here automatically.
              </p>
            </div>
          ) : status === "COMPLETED" ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                ទូទាត់ប្រាក់រួចរាល់ (Sale Completed)
              </h3>
              {displayData?.invoiceNumber && (
                <p className="mt-2 font-mono text-base font-bold text-primary">
                  Invoice #{displayData.invoiceNumber}
                </p>
              )}
              <p className={`mt-3 text-sm max-w-sm font-medium leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Your payment was received successfully. Thank you for shopping with us!
              </p>

              <div className={`mt-6 grid grid-cols-2 gap-4 w-full max-w-md p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
                <div className={`flex flex-col items-center p-3 rounded-xl shadow-sm ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Total Items</span>
                  <span className={`text-xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{totalQuantity}</span>
                </div>
                <div className={`flex flex-col items-center p-3 rounded-xl shadow-sm ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Grand Total</span>
                  <span className="text-xl font-bold text-primary mt-1">{format(total, currency)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Structured Table (Matching Image 2) */
            <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs">
                {/* Table Header */}
                <thead
                  className={`border-b text-xs font-bold ${isDarkMode
                      ? "border-slate-800 bg-slate-900 text-slate-300"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                >
                  <tr>
                    <th className="py-3 px-4">ឈ្មោះទំនិញ (Item Name)</th>
                    <th className="py-3 px-3 text-center">ចំនួន (Qty)</th>
                    <th className="py-3 px-3 text-right">តម្លៃ (Price)</th>
                    <th className="py-3 px-3 text-right">បញ្ចុះតម្លៃ (Discount)</th>
                    <th className="py-3 px-4 text-right">សរុប (Total)</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody
                  className={`divide-y text-xs font-medium ${isDarkMode
                      ? "divide-slate-800 text-slate-200"
                      : "divide-slate-200 text-slate-800"
                    }`}
                >
                  {items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className={
                        index % 2 === 0
                          ? isDarkMode
                            ? "bg-slate-900/40"
                            : "bg-white"
                          : isDarkMode
                            ? "bg-slate-900/80"
                            : "bg-slate-50/70"
                      }
                    >
                      <td className="py-3.5 px-4 font-bold text-sm">
                        {item.name}
                        {/* What was picked. This screen is here to be checked
                            against, which it cannot be if it only ever says
                            the item's name. */}
                        {soldAsLabel(item) ? (
                          <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                            {soldAsLabel(item)}
                          </span>
                        ) : null}
                        {item.addOns?.length ? (
                          <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                            {item.addOns
                              .map((addOn) => `+ ${addOn.name}`)
                              .join(", ")}
                          </span>
                        ) : null}
                        {/* The promotion that quietly turned into extra units
                            on this line — invisible otherwise, since the
                            quantity column alone reads as an ordinary sale. */}
                        {item.freeQuantity ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                            {item.freeQuantity} FREE
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-primary">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {format(item.unitPrice, currency)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-primary font-semibold">
                        {item.discountAmount > 0
                          ? `-${format(item.discountAmount, currency)}`
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm text-slate-900 dark:text-white">
                        {format(item.lineTotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Total Block (Hidden when COMPLETED to prevent duplicate summary bar) */}
        {status !== "COMPLETED" && (
          <div
            className={`shrink-0 border-t p-6 shadow-lg transition-colors duration-300 ${isDarkMode
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
              }`}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Left calculation summary */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>ចំនួនទំនិញសរុប (Total Items):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {totalQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>សរុប (Subtotal):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {format(subtotal, currency)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span>
                      បញ្ចុះតម្លៃ{discountLabel ? ` (${discountLabel})` : ""} (Discount):
                    </span>
                    <span className="font-bold text-primary">
                      -{format(discount, currency)}
                    </span>
                  </div>
                )}
                {tax > 0 && !isTaxInclusive && (
                  <div className="flex justify-between">
                    <span>
                      +{taxLabel.includes("VAT") ? "VAT" : taxLabel}
                      {taxRate > 0 ? ` (${taxRate}%)` : ""} (Tax):
                    </span>
                    <span className="font-bold text-primary dark:text-sky-400">
                      +{format(tax, currency)}
                    </span>
                  </div>
                )}
                {tax > 0 && isTaxInclusive && (
                  <div className="flex justify-between italic text-slate-400">
                    <span>
                      Incl. {taxLabel.includes("VAT") ? "VAT" : taxLabel}
                      {taxRate > 0 ? ` (${taxRate}%)` : ""}:
                    </span>
                    <span className="font-mono font-bold">
                      ({format(tax, currency)})
                    </span>
                  </div>
                )}
              </div>

              {/* Right Grand Total Box */}
              <div className="flex flex-col items-end justify-center rounded-2xl bg-primary/10 dark:bg-primary/20 p-4 border border-primary/20">
                <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-sky-300">
                  សរុបចុងក្រោយ (Grand Total)
                </span>
                <div className="text-3xl lg:text-4xl font-black tracking-tight text-primary dark:text-sky-400">
                  {format(total, currency)}
                </div>
                {secondaryTotal && (
                  <div className="text-sm font-extrabold text-slate-600 dark:text-slate-300 mt-0.5">
                    {format(secondaryTotal.amount, secondaryTotal.currency.code)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer info bar */}
        {/* <div className="flex h-8 shrink-0 items-center justify-between bg-slate-900 px-6 text-[11px] font-semibold text-slate-400">
          <span>{storeName} POS System</span>
          <span>POWERED BY IPOS</span>
        </div> */}
      </div>
    </div>
  );
}
