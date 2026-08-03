"use client";

import { useState } from "react";
import { Minus, Plus, SquarePen, Trash2 } from "lucide-react";
import { formatCurrency, toNumber } from "@/lib/money";

import type { Order, OrderItem } from "@/types/pos-type";

import { formatDiscount } from "@/lib/discount";
import { NewOrder } from "./new-order";
import { Payment } from "./payment";

export interface OrderTableProps {
  onPaymentSuccess?: (
    paidOrder: Order,
    method: "CASH" | "DIGITAL",
    receivedAmount?: number,
  ) => void;
  /** Called when the pencil icon on a row is clicked (edit item / apply item discount). */
  onEditItem?: (item: OrderItem) => void;
  isEditingOrder?: boolean;
  /** Called when the button is clicked while in edit mode */
  onSaveEdit?: () => void;
}

/* ---------------------------------- row ---------------------------------- */

interface ItemRowProps {
  item: OrderItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onEdit?: () => void;
}

function ItemRow({ item, onIncrease, onDecrease, onRemove }: ItemRowProps) {
  return (
    <tr className="align-middle">
      <td className="px-4 py-2.5 text-gray-800">
        {item.product_name}
        {item.variant_name && (
          <span className="ml-1 text-xs text-gray-400">
            ({item.variant_name})
          </span>
        )}
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${item.product_name}`}
            onClick={onDecrease}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-red-400 text-accent transition hover:bg-red-50 active:scale-90"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-4 text-center tabular-nums text-gray-800">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label={`Increase ${item.product_name}`}
            onClick={onIncrease}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-green-500 text-primary transition hover:bg-green-50 active:scale-90"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </td>

      <td className="px-4 py-2.5 font-semibold text-primary">
        {formatCurrency(item.unit_price)}
        {item.applied_discount ? (
          <span className="mt-0.5 block text-xs font-normal text-accent sm:hidden">
            {formatDiscount(item.applied_discount)}
          </span>
        ) : null}
      </td>

      <td className="hidden px-4 py-2.5 text-accent sm:table-cell">
        {formatDiscount(item.applied_discount)}
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Remove ${item.product_name}`}
            onClick={onRemove}
            className="text-accent transition hover:opacity-70 active:scale-90"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* --------------------------------- table --------------------------------- */

export function OrderTable({
  onPaymentSuccess,
  onEditItem,
  isEditingOrder = false,
  onSaveEdit,
}: OrderTableProps) {
  const order: Order = { items: [], id: "1", created_at: "", status: "OPEN" as any, subtotal: "0", discount_amount: "0", total: "0" } as any;
  const isLoading = false;
  const error = null;
  const updateQty = async (args: any) => {};
  const removeItem = async (id: string) => {};
  const renameOrder = async (args: any) => {};
  const isRenaming = false;
  const clearOrder = async () => {};
  const pay = async (args: any) => ({} as Order);
  const isPaying = false;

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-6 text-sm text-accent">
        Error: {typeof error === "string" ? error : "Failed to load order"}
      </div>
    );
  }

  const summary = {
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount_amount),
    total: toNumber(order.total),
  };
  const handleCreateOrder = async (data: { name: string; comment: string }) => {
    try {
      await clearOrder();
      await renameOrder({ name: data.name, comment: data.comment });
      setNewOrderOpen(false);
    } catch (e) {
      console.error("Failed to create new order", e);
    }
  };

  const handleValidatePayment = async (
    method: "CASH" | "DIGITAL",
    receivedAmount?: number,
  ) => {
    try {
      const paidOrder = await pay({
        method_type: method,
        amount: summary.total,
        received_amount: receivedAmount,
      });
      setPaymentOpen(false);
      onPaymentSuccess?.(paidOrder, method, receivedAmount);
    } catch (e) {
      console.error("Payment failed", e);
    }
  };

  const renderRow = (item: OrderItem) => (
    <ItemRow
      key={item.id}
      item={item}
      onIncrease={() => updateQty({ itemId: item.id, delta: 1 })}
      onDecrease={() => updateQty({ itemId: item.id, delta: -1 })}
      onRemove={() => removeItem(item.id)}
      onEdit={onEditItem ? () => onEditItem(item) : undefined}
    />
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* items — scrolls, header stays visible */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white text-left">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Qty</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="hidden px-4 py-3 font-semibold text-gray-700 sm:table-cell">
                Discount
              </th>
              <th className="px-4  text-center py-3 font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {order.items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No items yet — tap a product to start the order.
                </td>
              </tr>
            )}

            {order.items.map(renderRow)}
          </tbody>
        </table>
      </div>

      {/* summary — pinned to the bottom */}
      <div className="px-4 py-3 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Subtotal</span>
          <span className="tabular-nums text-gray-800">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-primary">Discount</span>
          <span className="tabular-nums text-gray-800">
            -{formatCurrency(summary.discount)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <span className="text-base font-semibold text-gray-700">Total</span>
        <span className="text-xl font-bold tabular-nums text-accent">
          {formatCurrency(summary.total)}
        </span>
      </div>

      <div className="flex gap-3 p-4">
        <button
          type="button"
          onClick={() =>
            isEditingOrder ? onSaveEdit?.() : setNewOrderOpen(true)
          }
          className="flex-1 rounded-xl bg-secondary py-3 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          {isEditingOrder ? "Save" : "New order"}
        </button>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          disabled={order.items.length === 0 || isPaying}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          Pay
        </button>
      </div>

      <NewOrder
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        itemCount={order.items.length}
        onCreate={handleCreateOrder}
        isCreating={isRenaming}
      />

      <Payment
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        order={order}
        onValidate={handleValidatePayment}
        isProcessing={isPaying}
      />
    </div>
  );
}