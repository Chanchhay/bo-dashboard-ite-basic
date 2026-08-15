"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  posOrderApi,
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
      // The option and the unit are two different things. This used to put the
      // unit in the variant's field, which left nowhere to say which size it
      // was and made "6 Pack" read as an option.
      variant_name: line.variantName ?? null,
      unit_name: line.unitName ?? null,
      unit_factor: line.unitFactor ?? null,
      add_ons: (line.addOns || []).map((addOn) => ({ name: addOn.name })),
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
  onIncrease: (item: PosOrderItem) => void;
  onDecrease: (item: PosOrderItem) => void;
  onRemove: (orderItemId: string) => void;
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
        {/* Which option was picked. Two sizes at two prices are otherwise the
            same line twice, and the cashier cannot tell which is which. */}
        {item.variantName ? (
          <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
            {item.variantName}
          </span>
        ) : null}
        {/* Sold by the pack: what one of them holds, so a case of twenty-four
            never reads as a single can. */}
        {item.unitName && (item.unitFactor ?? 1) > 1 ? (
          <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
            {item.unitName} · {item.unitFactor} per pack
          </span>
        ) : null}
        {/* The extras ride along with the line and are charged per unit. */}
        {item.addOns?.length ? (
          <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
            {item.addOns.map((addOn) => `+ ${addOn.name}`).join(", ")}
          </span>
        ) : null}
        {/* How it has to be made. Free, but the line is wrong without it. */}
        {item.selections?.length ? (
          <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
            {item.selections
              .map((selection) => `${selection.attributeName}: ${selection.label}`)
              .join(" · ")}
          </span>
        ) : null}
      </td>

      <td className="px-1 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-1 sm:justify-start sm:gap-2">
          <button
            type="button"
            aria-label={`Decrease ${item.itemName}`}
            onClick={() => onDecrease(item)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40"
            title={item.quantity <= 1 ? "Remove item" : "Decrease quantity"}
          >
            {item.quantity <= 1 ? (
              <Trash2 className="h-3.5 w-3.5 text-brand-red" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </button>

          <span className="w-8 text-center font-mono text-sm font-bold text-gray-900">
            {item.quantity}
          </span>

          <button
            type="button"
            disabled={busy}
            onClick={() => onIncrease(item)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40"
            title="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>

      <td className="py-2.5 pl-2 pr-2 text-right font-mono text-sm font-bold text-[#1e1e1e]">
        {format(item.lineTotal, currency)}
      </td>

<<<<<<< HEAD
      <td className="py-2.5 pl-1 pr-4 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(item.id)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-brand-red focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:outline-none disabled:opacity-40"
          title="Remove line"
        >
          <X className="h-4 w-4" />
        </button>
=======
      <td className="px-2 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Remove ${item.itemName}`}
            onClick={onRemove}
            disabled={busy}
            className="grid size-9 place-items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="size-4 text-brand-red" />
          </button>
        </div>
>>>>>>> 8d6ace14c638ceeb7c6e92b60b742db2bc34735e
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

  const [busyLineId, setBusyLineId] = useState("");

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  const lineQuantityRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (order?.items) {
      order.items.forEach((i) => {
        lineQuantityRef.current.set(i.id, i.quantity);
      });
    }
  }, [order?.items]);

  /** Runs one line change, reporting rather than silently swallowing failure. */
  async function runLineChange(
    _lineId: string,
    change: () => Promise<unknown>,
    failure: string,
  ) {
    try {
      await change();
    } catch (cause) {
      toast({
        tone: "error",
        title: failure,
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  }

  const handleIncrease = useCallback(
    (item: PosOrderItem) => {
      const current = lineQuantityRef.current.get(item.id) ?? item.quantity;
      const nextQty = current + 1;
      lineQuantityRef.current.set(item.id, nextQty);

      void runLineChange(
        item.id,
        () =>
          updateOrderItem({
            orderItemId: item.id,
            quantity: nextQty,
          }).unwrap(),
        "Could not change the quantity",
      );
    },
    [updateOrderItem],
  );

  const handleDecrease = useCallback(
    (item: PosOrderItem) => {
      const current = lineQuantityRef.current.get(item.id) ?? item.quantity;
      const nextQty = Math.max(0, current - 1);
      lineQuantityRef.current.set(item.id, nextQty);

      void runLineChange(
        item.id,
        () =>
          nextQty <= 0
            ? removeOrderItem(item.id).unwrap()
            : updateOrderItem({
                orderItemId: item.id,
                quantity: nextQty,
              }).unwrap(),
        "Could not change the quantity",
      );
    },
    [removeOrderItem, updateOrderItem],
  );

  const handleRemove = useCallback(
    (orderItemId: string) => {
      lineQuantityRef.current.delete(orderItemId);
      void runLineChange(
        orderItemId,
        () => removeOrderItem(orderItemId).unwrap(),
        "Could not remove that item",
      );
    },
    [removeOrderItem],
  );

  const [activeDiscountRule, setActiveDiscountRule] =
    useState<AppliedDiscountRule | null>(null);

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

  const selectedCustomer = useMemo(() => {
    if (!order?.customerId) return null;
    return customers.find((c) => c.id === order.customerId) ?? null;
  }, [customers, order?.customerId]);

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
      onIncrease={handleIncrease}
      onDecrease={handleDecrease}
      onRemove={handleRemove}
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