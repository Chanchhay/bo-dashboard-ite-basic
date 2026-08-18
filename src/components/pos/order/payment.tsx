"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useMoney } from "@/hooks/useMoney";
import { Order } from "@/types/pos-type";
import { AmountReceived } from "../amount-received";
import { KhqrView } from "./khqr-view";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Khqr, Sale } from "@/lib/api/pos-order";
import { useCustomerDisplaySync } from "@/hooks/useCustomerDisplaySync";
import {
  useGenerateKhqrMutation,
  useGetBakongStatusQuery,
} from "@/services/posOrderApi";

type PaymentMethod = "CASH" | "DIGITAL";

export interface PaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onValidate: (method: PaymentMethod, receivedAmount?: number) => void;
  /** Called when a KHQR settles — the sale already exists by then. */
  onDigitalPaid?: (sale: Sale) => void;
  isProcessing?: boolean;
}

export function Payment({
  open,
  onOpenChange,
  order,
  onValidate,
  onDigitalPaid,
  isProcessing,
}: PaymentProps) {
  const { format, secondaryFor } = useMoney();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amountReceivedOpen, setAmountReceivedOpen] = useState(false);
  const [khqr, setKhqr] = useState<Khqr | null>(null);

  const { toast } = useToast();
 
  const { data: bakong } = useGetBakongStatusQuery();
  const [generateKhqr, { isLoading: isGenerating }] = useGenerateKhqrMutation();

  const canTakeDigital = Boolean(bakong?.configured && bakong?.active);

  async function showKhqr() {
    try {
      setKhqr(await generateKhqr().unwrap());
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not create a KHQR code",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  }

  const subtotal = parseFloat(order.subtotal);
  const discount = parseFloat(order.discount_amount);
  const total = parseFloat(order.total);
  const totalSecondary = secondaryFor(total, order);

  const storedDiscountRule = useMemo(() => {
    if (!order.id || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(`pos_cart_discount_${order.id}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, [order.id]);

  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountLabel =
    storedDiscountRule?.label ||
    (discountPercent > 0 ? `${discountPercent.toFixed(0)}% OFF` : null);

  // Reset KHQR code state when payment modal closes
  useEffect(() => {
    if (!open) {
      setKhqr(null);
    }
  }, [open]);

  useCustomerDisplaySync({
    businessId: order.business_owner_id,
    terminalId: "term_default",
    order: {
      id: order.id,
      businessId: order.business_owner_id,
      customerId: null,
      invoiceNumber: null,
      channel: "POS",
      status: "PENDING",
      subtotal,
      discountAmount: discount,
      total,
      currency: order.currency,
      displayCurrency: null,
      displayExchangeRate: null,
      note: null,
      items: (order.items || []).map((item) => {
        const unitPrice = parseFloat(item.unit_price) || 0;
        const discountAmount = parseFloat(item.discount_amount) || 0;
        return {
          id: item.id,
          itemId: item.product_id,
          variantId: item.variant_id ?? null,
          itemName: item.product_name,
          // Carried through so the customer screen can show what was picked,
          // not just what it was called.
          variantName: item.variant_name ?? null,
          unitName: item.unit_name ?? null,
          unitFactor: item.unit_factor ?? null,
          addOns: (item.add_ons || []).map((addOn) => ({
            addOnId: null,
            name: addOn.name,
            unitPrice: 0,
          })),
          quantity: item.quantity,
          unitPrice,
          discountAmount,
          lineTotal: unitPrice * item.quantity - discountAmount,
        };
      }),
      createdDate: null,
    },
    statusOverride: open && Boolean(khqr) ? "PAYMENT_PENDING" : undefined,
    qrCodeUrl: khqr?.qrImage ?? null,
  });

  function handleValidateClick() {
    if (method === "CASH") {
      setAmountReceivedOpen(true);
      return;
    }

    void showKhqr();
  }

  function handleAmountReceivedValidate(receivedAmount: number) {
    onValidate("CASH", receivedAmount);
    setAmountReceivedOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[824px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 bg-white/95 p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-1.5rem)] sm:w-[calc(100vw-1.5rem)] sm:rounded-[30px]"
          showCloseButton={false}
        >
          <DialogHeader className="flex h-16 shrink-0 flex-row items-center gap-3 px-4 sm:h-[84px] sm:px-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-primary sm:text-[30px]">
              Payment
            </h2>
          </DialogHeader>

          {khqr ? (
            <KhqrView
              khqr={khqr}
              isRegenerating={isGenerating}
              onRegenerate={() => void showKhqr()}
              onCancel={() => {
                setKhqr(null);
                onOpenChange(false);
              }}
              onPaid={(sale) => {
                setKhqr(null);
                onOpenChange(false);
                onDigitalPaid?.(sale);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 grid-cols-1 gap-7 overflow-y-auto overscroll-contain px-4 pb-5 pt-3 sm:grid-cols-2 sm:gap-12 sm:px-8 sm:pb-8 sm:pt-8">
                {/* Left: order summary */}
                <div className="flex min-w-0 flex-col">
                  <h3 className="text-sm font-bold tracking-[0.04em] text-[#020409] sm:text-lg">
                    ORDER SUMMARY
                  </h3>

                  <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:gap-5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 text-sm sm:text-lg"
                      >
                        <span className="min-w-0 truncate text-[#020409]">
                          {item.quantity}x&nbsp;&nbsp;{item.product_name}
                        </span>
                        <span className="shrink-0 font-semibold text-primary">
                          {format(item.unit_price, order.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-[#1e293b] pt-3 text-sm sm:mt-auto sm:text-lg">
                    <div className="flex justify-between text-[#3f493e]">
                      <span>Subtotal</span>
                      <span>{format(subtotal, order.currency)}</span>
                    </div>
                    <div className="flex justify-between text-[#00501a]">
                      <span className="flex items-center gap-1.5">
                        Discount
                        {discountLabel && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-[#00501a]">
                            ({discountLabel})
                          </span>
                        )}
                      </span>
                      <span>-{format(discount, order.currency)}</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-[#1e293b] pt-4 font-semibold">
                      <span>To pay</span>
                      <span className="text-primary">{format(total, order.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: total + payment method */}
                <div className="flex min-w-0 flex-col gap-7 sm:gap-8">
                  <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-[18px] bg-[#f5f5f5] p-6 text-center sm:min-h-36 sm:p-8">
                    <p className="text-sm text-[#020409] sm:text-lg">To pay</p>
                    <p className="text-4xl font-semibold leading-none text-primary sm:text-[40px]">
                      {format(total, order.currency)}
                    </p>
                    {totalSecondary && (
                      <p className="text-base font-medium text-[#3f493e] sm:text-lg">
                        {format(totalSecondary.amount, totalSecondary.currency.code)}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:gap-4">
                    <p className="text-sm font-semibold text-[#020409] sm:text-lg">
                      Payment method
                    </p>
                    <div data-tour="pos-payment-method" className={`grid gap-3 sm:gap-4 ${canTakeDigital ? "grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        type="button"
                        onClick={() => setMethod("CASH")}
                        aria-pressed={method === "CASH"}
                        className={`flex h-14 items-center justify-center gap-2 rounded-[15px] border text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#feb90d]/35 sm:h-[58px] sm:gap-3 sm:text-base ${
                          method === "CASH"
                            ? "border-[#feb90d] bg-[#feb90d]/5 text-[#feb90d]"
                            : "border-[#d9d9d9] text-[#6b7280] hover:bg-[#f5f5f5]"
                        }`}
                      >
                        <Banknote className="size-5 shrink-0 sm:size-6" aria-hidden="true" />
                        Cash
                      </button>
                      {canTakeDigital && (
                        <button
                          type="button"
                          onClick={() => setMethod("DIGITAL")}
                          aria-pressed={method === "DIGITAL"}
                          className={`flex h-14 items-center justify-center gap-2 rounded-[15px] border text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-[58px] sm:gap-3 sm:text-base ${
                            method === "DIGITAL"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-[#d9d9d9] text-[#6b7280] hover:bg-[#f5f5f5]"
                          }`}
                        >
                          <CreditCard className="size-5 shrink-0 sm:size-6" aria-hidden="true" />
                          KHQR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-1 gap-3 border-t border-[#1e293b]/10 bg-white/95 px-4 py-4 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-4 sm:px-6 sm:py-6">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-14 rounded-[25px] border border-brand-red text-brand-red font-semibold outline-none transition-colors hover:bg-brand-red/5 focus-visible:ring-2 focus-visible:ring-brand-red/30 sm:h-[58px] sm:text-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleValidateClick}
                  disabled={isProcessing}
                  className="h-14 rounded-[25px] bg-primary text-base font-semibold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:bg-primary/30 sm:h-[58px] sm:text-xl"
                >
                  {isProcessing || isGenerating ? "Processing..." : "Validate"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AmountReceived
        open={amountReceivedOpen}
        onOpenChange={setAmountReceivedOpen}
        amountDue={total}
        currency={order.currency}
        onValidate={handleAmountReceivedValidate}
        isProcessing={isProcessing}
      />
    </>
  );
}