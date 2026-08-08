"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Crown,
  Minus,
  Plus,
  Tag,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useMoney } from "@/hooks/useMoney";

import type { Order } from "@/types/pos-type";
import type { PosOrder, PosOrderItem, Sale } from "@/lib/api/pos-order";

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetCustomersQuery } from "@/services/customerApi";
import {
  useGetCurrentOrderQuery,
  useParkOrderMutation,
  useRemoveOrderItemMutation,
  usePayOrderMutation,
  useUpdateOrderItemMutation,
  useSetOrderCustomerMutation,
  useSetOrderDiscountMutation,
} from "@/services/posOrderApi";
import { NewOrder } from "./new-order";
import { Payment } from "./payment";
import { CustomerSelectModal } from "../customer-select-modal";
import {
  DiscountSelectModal,
  type AppliedDiscountRule,
} from "../discount-select-modal";

export interface OrderTableProps {
  onPaymentSuccess?: (paidOrder: PosOrder, sale: Sale) => void;
  /** Selects the Order tab after the current order is parked. */
  onOrderCreated?: () => void;
  isEditingOrder?: boolean;
}

/**
 * The payment dialog still speaks the older snake_case `Order`.
 */
function legacyOrderShape(order: PosOrder): Order {
  const subtotalNum = order.subtotal ?? 0;
  const discountNum = order.discountAmount ?? 0;
  const computedTotal = Math.max(0, subtotalNum - discountNum);

  return {
    id: order.id,
    business_owner_id: order.businessId,
    invoice_number: order.invoiceNumber,
    customer_id: order.customerId,
    cashier_id: null,
    channel: order.channel,
    status: order.status,
    subtotal: String(subtotalNum),
    discount_amount: String(discountNum),
    applied_discounts: null,
    total: String(computedTotal),
    currency: order.currency,
    note: order.note,
    comment: null,
    created_at: order.createdDate ?? "",
    updated_at: null,
    items: order.items.map((line) => ({
      id: line.id,
      business_owner_id: order.businessId,
      order_id: order.id,
      product_id: line.itemId,
      variant_id: line.variantId,
      product_name: line.itemName,
      variant_name: null,
      quantity: line.quantity,
      unit_price: String(line.unitPrice),
      unit_cost: "0",
      discount_amount: String(line.discountAmount),
      applied_discount: null,
    })),
  };
}

/* ---------------------------------- row ---------------------------------- */

interface ItemRowProps {
  item: PosOrderItem;
  /** The order's own currency — an order opened before a base change keeps it. */
  currency?: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  /** Quantity buttons are held while the line is being written. */
  busy?: boolean;
}

const ItemRow = memo(function ItemRow({
  item,
  currency,
  onIncrease,
  onDecrease,
  onRemove,
  busy,
}: ItemRowProps) {
  const { format } = useMoney();

  return (
    <tr className="align-middle">
      <td className="break-words px-2 py-2.5 text-xs text-gray-800 sm:px-4 sm:text-sm">
        {item.itemName}
      </td>

      <td className="px-1 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-1 sm:justify-start sm:gap-2">
          <button
            type="button"
            aria-label={`Decrease ${item.itemName}`}
            onClick={onDecrease}
            disabled={busy}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-red-400 text-brand-red transition hover:bg-red-50 active:scale-90 disabled:opacity-40 sm:size-5"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-4 text-center tabular-nums text-gray-800">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label={`Increase ${item.itemName}`}
            onClick={onIncrease}
            disabled={busy}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-500 text-primary transition hover:bg-green-50 active:scale-90 disabled:opacity-40 sm:size-5"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </td>

      <td className="px-2 py-2.5 text-xs font-semibold text-brand-red sm:px-4 sm:text-sm">
        {format(item.lineTotal, currency)}
        {item.quantity > 1 && (
          <span className="mt-0.5 block text-xs font-normal text-gray-400">
            {format(item.unitPrice, currency)} each
          </span>
        )}
      </td>

      <td className="px-2 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Remove ${item.itemName}`}
            onClick={onRemove}
            disabled={busy}
            className="grid size-9 place-items-center rounded-full text-brand-red transition hover:bg-red-50 active:scale-90 disabled:opacity-40 sm:size-8"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/* --------------------------------- table --------------------------------- */

export function OrderTable({
  onPaymentSuccess,
  onOrderCreated,
  isEditingOrder = false,
}: OrderTableProps) {
  const { format, secondaryFor } = useMoney();
  const { toast } = useToast();

  const { data: order, isLoading, error } = useGetCurrentOrderQuery();
  const { data: customers = [] } = useGetCustomersQuery();

  const [updateOrderItem] = useUpdateOrderItemMutation();
  const [removeOrderItem] = useRemoveOrderItemMutation();
  const [parkOrder, { isLoading: isParking }] = useParkOrderMutation();
  const [payOrder, { isLoading: isPaying }] = usePayOrderMutation();
  const [setOrderCustomer] = useSetOrderCustomerMutation();
  const [setOrderDiscount] = useSetOrderDiscountMutation();

  // Which line is mid-request, so only its own buttons are held.
  const [busyLineId, setBusyLineId] = useState("");

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Modals for POS customer & discount
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  // Active persistent discount rule for current order
  const [activeDiscountRule, setActiveDiscountRule] =
    useState<AppliedDiscountRule | null>(null);

  // Auto-sync & auto-recalculate discount whenever order items or subtotal change
  useEffect(() => {
    if (!order?.id) {
      setActiveDiscountRule(null);
      return;
    }

    const key = `pos_cart_discount_${order.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setActiveDiscountRule(null);
      return;
    }

    try {
      const rule: AppliedDiscountRule = JSON.parse(raw);
      setActiveDiscountRule(rule);

      let targetAmount = 0;
      if (rule.type === "PERCENTAGE") {
        targetAmount = (order.subtotal * rule.value) / 100;
        if (rule.maxDiscountAmount && targetAmount > rule.maxDiscountAmount) {
          targetAmount = rule.maxDiscountAmount;
        }
      } else if (rule.type === "FINAL_PRICE") {
        targetAmount = Math.max(0, order.subtotal - rule.value);
      } else {
        targetAmount = rule.value;
      }

      targetAmount = Math.min(
        order.subtotal,
        Math.max(0, parseFloat(targetAmount.toFixed(2)))
      );

      // Auto-update discount if cart subtotal changed (e.g. new item added)
      if (Math.abs((order.discountAmount ?? 0) - targetAmount) > 0.001) {
        void setOrderDiscount({
          discountAmount: targetAmount,
          discountId: rule.discountId,
          discountCode: rule.discountCode,
        });
      }
    } catch {
      localStorage.removeItem(key);
      setActiveDiscountRule(null);
    }
  }, [order?.id, order?.subtotal, order?.discountAmount, setOrderDiscount]);

  // Attached customer object matching order.customerId
  const selectedCustomer = useMemo(() => {
    if (!order?.customerId) return null;
    return customers.find((c) => c.id === order.customerId) ?? null;
  }, [customers, order?.customerId]);

  /** Runs one line change, reporting rather than silently swallowing failure. */
  async function runLineChange(
    lineId: string,
    change: () => Promise<unknown>,
    failure: string,
  ) {
    setBusyLineId(lineId);

    try {
      await change();
    } catch (cause) {
      toast({
        tone: "error",
        title: failure,
        description: getApiErrorMessage(cause, "Please try again."),
      });
    } finally {
      setBusyLineId("");
    }
  }

  const handleSelectCustomer = async (customerId: string | null) => {
    try {
      await setOrderCustomer({ customerId }).unwrap();
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not attach customer",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  };

  const handleApplyDiscountRule = async (rule: AppliedDiscountRule | null) => {
    if (!order?.id) return;
    const key = `pos_cart_discount_${order.id}`;

    if (!rule) {
      localStorage.removeItem(key);
      setActiveDiscountRule(null);
      await setOrderDiscount({ discountAmount: 0 }).unwrap();
      return;
    }

    localStorage.setItem(key, JSON.stringify(rule));
    setActiveDiscountRule(rule);

    let targetAmount = 0;
    if (rule.type === "PERCENTAGE") {
      targetAmount = (order.subtotal * rule.value) / 100;
      if (rule.maxDiscountAmount && targetAmount > rule.maxDiscountAmount) {
        targetAmount = rule.maxDiscountAmount;
      }
    } else if (rule.type === "FINAL_PRICE") {
      targetAmount = Math.max(0, order.subtotal - rule.value);
    } else {
      targetAmount = rule.value;
    }

    targetAmount = Math.min(
      order.subtotal,
      Math.max(0, parseFloat(targetAmount.toFixed(2)))
    );

    await setOrderDiscount({
      discountAmount: targetAmount,
      discountId: rule.discountId,
      discountCode: rule.discountCode,
    }).unwrap();
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading order…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-brand-red">
        Could not load the current order.
      </div>
    );
  }

  const items = order?.items ?? [];
  const summary = {
    subtotal: order?.subtotal ?? 0,
    discount: order?.discountAmount ?? 0,
    total: order?.total ?? 0,
  };
  const totalSecondary = secondaryFor(summary.total, order);

  /** Names and parks the current cart without cancelling it. */
  const handleCreateOrder = async (data: { name: string }) => {
    try {
      if (order?.id) {
        localStorage.removeItem(`pos_cart_discount_${order.id}`);
      }
      await parkOrder({ note: data.name.trim() }).unwrap();

      setNewOrderOpen(false);
      onOrderCreated?.();
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not start a new order",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      await parkOrder({}).unwrap();
      onOrderCreated?.();
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not save this order",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  };

  /**
   * Settles the sale.
   */
  const handleValidatePayment = async (
    method: "CASH" | "DIGITAL",
    receivedAmount?: number,
  ) => {
    if (!order) return;

    const sold = order;

    try {
      const sale = await payOrder({
        paymentMethod: method,
        receivedAmount,
      }).unwrap();

      if (sold.id) {
        localStorage.removeItem(`pos_cart_discount_${sold.id}`);
      }

      setPaymentOpen(false);
      onPaymentSuccess?.(sold, sale);
    } catch (cause) {
      toast({
        tone: "error",
        title: "Payment failed",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  };

  const renderRow = (item: PosOrderItem) => (
    <ItemRow
      key={item.id}
      item={item}
      currency={order?.currency}
      busy={busyLineId === item.id}
      onIncrease={() =>
        runLineChange(
          item.id,
          () =>
            updateOrderItem({
              orderItemId: item.id,
              quantity: item.quantity + 1,
            }).unwrap(),
          "Could not change the quantity",
        )
      }
      onDecrease={() =>
        runLineChange(
          item.id,
          () =>
            item.quantity <= 1
              ? removeOrderItem(item.id).unwrap()
              : updateOrderItem({
                orderItemId: item.id,
                quantity: item.quantity - 1,
              }).unwrap(),
          "Could not change the quantity",
        )
      }
      onRemove={() =>
        runLineChange(
          item.id,
          () => removeOrderItem(item.id).unwrap(),
          "Could not remove that item",
        )
      }
    />
  );

  return (
    <div className="flex h-full flex-col bg-white/90">
      {/* Customer Bar at top of POS cart */}
      <div className="border-b border-[#d9d9d9] bg-gray-50/80 px-4 py-2.5">
        {selectedCustomer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(selectedCustomer.globalCustomer?.fullName || "C")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {selectedCustomer.globalCustomer?.fullName || "Customer"}
                  </span>
                  {selectedCustomer.membershipType && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      <Crown className="h-2.5 w-2.5" />
                      {selectedCustomer.membershipType.typeName}
                    </span>
                  )}
                  {selectedCustomer.salesChannel && (
                    <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-gray-200 text-gray-700">
                      {selectedCustomer.salesChannel.name}
                    </span>
                  )}
                </div>
                {selectedCustomer.globalCustomer?.phoneNumber && (
                  <p className="text-[11px] text-gray-500 truncate">
                    {selectedCustomer.globalCustomer.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline px-1.5 py-0.5"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => void handleSelectCustomer(null)}
                className="grid size-6 place-items-center rounded-full text-gray-400 hover:bg-red-50 hover:text-brand-red"
                title="Detach Customer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              No customer attached
            </span>
            <button
              type="button"
              onClick={() => setCustomerModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/30 transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" />
              + Add Customer
            </button>
          </div>
        )}
      </div>

      {/* items — scrolls, header stays visible */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 z-10 bg-[#f5f5f5] text-left">
            <tr>
              <th className="w-[38%] px-2 py-2 text-xs font-semibold text-[#37423b] sm:w-[42%] sm:px-4 sm:text-sm min-[1025px]:text-lg">Product</th>
              <th className="w-[25%] px-1 py-2 text-center text-xs font-semibold text-[#37423b] sm:w-[18%] sm:px-4 sm:text-left sm:text-sm min-[1025px]:text-lg">Qty</th>
              <th className="w-[23%] px-2 py-2 text-xs font-semibold text-[#37423b] sm:w-[24%] sm:px-4 sm:text-sm min-[1025px]:text-lg">Price</th>
              <th className="w-[14%] px-2 py-2 text-center text-xs font-semibold text-[#37423b] sm:w-[16%] sm:px-4 sm:text-sm min-[1025px]:text-lg">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-gray-400 min-[1025px]:hidden"
                >
                  No items yet — tap an item to start the order.
                </td>
              </tr>
            )}

            {items.map(renderRow)}
          </tbody>
        </table>
      </div>

      {/* summary — pinned to the bottom */}
      <div className="px-4 py-3 text-sm min-[1025px]:pb-4 min-[1025px]:pt-2">
        <div className="flex justify-between py-1">
          <span className="text-gray-600 min-[1025px]:text-[22px] min-[1025px]:font-medium min-[1025px]:leading-7">Subtotal</span>
          <span className="tabular-nums text-gray-800 min-[1025px]:text-[25px] min-[1025px]:font-medium min-[1025px]:leading-7">
            {format(summary.subtotal, order?.currency)}
          </span>
        </div>

        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-2">
            <span className="text-primary min-[1025px]:text-[22px] min-[1025px]:font-medium min-[1025px]:leading-7">
              Discount
            </span>
            {activeDiscountRule?.label && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-green-100 text-primary border border-green-200">
                {activeDiscountRule.label}
                <button
                  type="button"
                  onClick={() => void handleApplyDiscountRule(null)}
                  className="hover:text-brand-red ml-0.5"
                  title="Remove Discount"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => setDiscountModalOpen(true)}
              className="text-xs font-bold text-primary hover:bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30 flex items-center gap-1 transition-all"
            >
              <Tag className="h-3 w-3" />
              {summary.discount > 0 ? "Edit" : "+ Apply"}
            </button>
          </div>
          <span className="tabular-nums text-primary min-[1025px]:text-[25px] min-[1025px]:font-medium min-[1025px]:leading-7">
            -{format(summary.discount, order?.currency)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#d9d9d9] px-4 py-3 min-[1025px]:h-16">
        <span className="text-base font-semibold text-gray-700 min-[1025px]:text-[25px]">Total</span>
        <span className="flex flex-col items-end">
          <span className="text-xl font-bold tabular-nums text-brand-red min-[1025px]:text-[35px]">
            {format(summary.total, order?.currency)}
          </span>
          {totalSecondary && (
            <span className="text-sm font-semibold tabular-nums text-gray-600 min-[1025px]:text-base">
              {format(totalSecondary.amount, totalSecondary.currency.code)}
            </span>
          )}
        </span>
      </div>

      <div className="flex gap-3 p-4 min-[1025px]:gap-3 min-[1025px]:pb-4 min-[1025px]:pt-2">
        <button
          type="button"
          onClick={() =>
            isEditingOrder ? void handleSaveEdit() : setNewOrderOpen(true)
          }
          disabled={isParking}
          className="h-12 flex-1 rounded-xl bg-brand-yellow text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 min-[1025px]:h-[55px] min-[1025px]:rounded-[15px] min-[1025px]:text-2xl"
        >
          {isEditingOrder ? "Save" : "New order"}
        </button>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          disabled={items.length === 0 || isPaying}
          className="h-12 flex-1 rounded-xl bg-primary text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 min-[1025px]:h-[55px] min-[1025px]:rounded-[15px] min-[1025px]:text-2xl"
        >
          Pay
        </button>
      </div>

      {newOrderOpen && (
        <NewOrder
          open={newOrderOpen}
          onOpenChange={setNewOrderOpen}
          itemCount={items.length}
          onCreate={handleCreateOrder}
          isCreating={isParking}
        />
      )}

      {/* Customer select modal */}
      <CustomerSelectModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        selectedCustomerId={order?.customerId}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Discount select modal */}
      <DiscountSelectModal
        open={discountModalOpen}
        onOpenChange={setDiscountModalOpen}
        subtotal={summary.subtotal}
        currency={order?.currency}
        currentDiscountAmount={summary.discount}
        activeRule={activeDiscountRule}
        onApplyDiscountRule={handleApplyDiscountRule}
      />

      {paymentOpen && order && (
        <Payment
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          order={legacyOrderShape(order)}
          onValidate={handleValidatePayment}
          onDigitalPaid={(sale) => {
            if (order.id) {
              localStorage.removeItem(`pos_cart_discount_${order.id}`);
            }
            setPaymentOpen(false);
            onPaymentSuccess?.(order, sale);
          }}
          isProcessing={isPaying}
        />
      )}
    </div>
  );
}