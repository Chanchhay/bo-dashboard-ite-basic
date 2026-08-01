"use client";

import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { BusinessReceiptInfo, Order, PaymentInput } from "@/types/pos-type";

// TODO: pull from `businesses` (name_en, address, phone) + a new
// khmer-name / vat columns, and from `business_currencies.exchange_rate`
// for the KHR conversion. Hardcoded for now since those fields/queries
// don't exist yet.
const MOCK_BUSINESS: BusinessReceiptInfo = {
  name_en: "Moon Restaurant",
  name_km: "ភោជនីយដ្ឋាន មូន",
  address: "#128, St. 271, Toul Tumpung, Phnom Penh",
  phone: "023 987 654 · 077 123 456",
  vat_number: "K001-902803456",
  vat_rate: 0.1,
  exchange_rate: 4100, // KHR per $1
};

export interface PaidReceiptViewProps {
  order: Order;
  paymentMethod: PaymentInput["method_type"];
  receivedAmount?: number;
  onNewOrder: () => void;
}

export function PaidReceiptView({
  order,
  paymentMethod,
  receivedAmount,
  onNewOrder,
}: PaidReceiptViewProps) {
  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discount_amount);
  const afterDiscount = subtotal - discount;
  const vat = afterDiscount * MOCK_BUSINESS.vat_rate;
  const total = afterDiscount + vat;

  const discountPercent =
    subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;

  const change =
    paymentMethod === "CASH" && receivedAmount !== undefined
      ? receivedAmount - total
      : 0;

  const soldAt = new Date();

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto bg-background py-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-primary">
            {MOCK_BUSINESS.name_en}
          </h1>
          <p className="text-sm text-gray-500">{MOCK_BUSINESS.name_km}</p>
          <p className="mt-2 text-xs text-gray-500">{MOCK_BUSINESS.address}</p>
          <p className="text-xs text-gray-500">Tel: {MOCK_BUSINESS.phone}</p>
          <p className="text-xs text-gray-400">
            VATTIN: {MOCK_BUSINESS.vat_number}
          </p>
        </div>

        <div className="mt-3 border-t border-dashed border-gray-300 pt-3 text-center">
          <p className="text-sm font-bold text-primary">TAX INVOICE</p>
          <p className="text-xs text-gray-400">វិក្កយបត្រ</p>
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-gray-300 pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Receipt No. <span className="text-gray-400">/ លេខវិក្កយបត្រ</span>
            </span>
            <span className="font-semibold text-gray-800">
              INV-{order.id.padStart(8, "0")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              Date <span className="text-gray-400">/ កាលបរិច្ឆេទ</span>
            </span>
            <span className="text-gray-700">
              {soldAt.toLocaleDateString("en-GB")} ·{" "}
              {soldAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              Ref <span className="text-gray-400">/ លេខយោង</span>
            </span>
            <span className="text-gray-700">{order.note || order.channel}</span>
          </div>
        </div>

        {/* Items */}
        <div className="mt-3 border-t border-dashed border-gray-300 pt-3">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
            <span>Item / Service</span>
            <div className="flex gap-4">
              <span>Qty</span>
              <span>Amount</span>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between text-sm"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(item.unit_price)} ea
                  </p>
                </div>
                <div className="flex gap-4 text-right">
                  <span className="w-6 text-gray-600">{item.quantity}</span>
                  <span className="w-14 font-semibold text-gray-800">
                    {formatCurrency(
                      parseFloat(item.unit_price) * item.quantity,
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-gray-300 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-accent">
            <span>Discount ({discountPercent}%)</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT {Math.round(MOCK_BUSINESS.vat_rate * 100)}%</span>
            <span>{formatCurrency(vat)}</span>
          </div>
        </div>

        {/* Total box */}
        <div className="mt-3 rounded-xl bg-green-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">TOTAL</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              សរុប (រៀល) · @ {MOCK_BUSINESS.exchange_rate.toLocaleString()}៛
            </span>
            <span>
              {Math.round(total * MOCK_BUSINESS.exchange_rate).toLocaleString()}
              ៛
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-gray-300 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Paid · {paymentMethod === "CASH" ? "Cash" : "ABA KHQR"}
            </span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(
                paymentMethod === "CASH" ? (receivedAmount ?? total) : total,
              )}
            </span>
          </div>
          {paymentMethod === "CASH" && (
            <div className="flex justify-between">
              <span className="text-gray-500">Change / អាប់</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(Math.max(change, 0))}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-center text-xs text-gray-500">
          <p className="font-semibold">Thank you! · អរគុណសម្រាប់ការគាំទ្រ</p>
          <p className="text-gray-400">
            Goods sold are not refundable. <br />
            ទំនិញលក់រួចមិនអាចដូរឬសងវិញបានទេ
          </p>
        </div>
      </div>
      {/* Actions */}
      <div className="mt-4 w-100 flex gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex flex-1  items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition active:scale-[0.98]"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onNewOrder}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          New order
        </button>
      </div>
    </div>
  );
}
