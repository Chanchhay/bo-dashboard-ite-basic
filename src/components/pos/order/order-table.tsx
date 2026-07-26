"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency, toNumber } from "@/lib/money";
import {
  useGetCurrentOrderQuery,
  usePayMutation,
  useRemoveItemMutation,
  useUpdateItemQtyMutation,
} from "@/features/order/order-api";
import { useState } from "react";
import { NewOrder } from "./new-order";
import { Payment } from "./payment";

export function OrderTable() {
  const { data: order, isLoading, error } = useGetCurrentOrderQuery();
  const [updateQty] = useUpdateItemQtyMutation();
  const [removeItem] = useRemoveItemMutation();
  const [pay] = usePayMutation();
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

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
  const handleCreateOrder = (data: { name: string; comment: string }) => {
    console.log("Create order:", data);
    setNewOrderOpen(false);
  };
   const handleValidatePayment = async (method: "CASH" | "DIGITAL") => {
    setIsPaying(true);
    try {
      // TODO
      await pay().unwrap();
      setPaymentOpen(false);
    } catch (e) {
      console.error("Payment failed", e);
    } finally {
      setIsPaying(false);
    }
  };
  const summary = {
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount_amount),
    total: toNumber(order.total),
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-700">
          <tr>
            <th className="p-3 font-semibold">Product</th>
            <th className="p-3 font-semibold">Qty</th>
            <th className="p-3 font-semibold">Price</th>
            <th className="p-3 font-semibold">Discount</th>
            <th className="p-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="p-3 text-gray-800">
                {item.product_name}
                {item.variant_name && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({item.variant_name})
                  </span>
                )}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty({ itemId: item.id, delta: -1 })}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-red-400 text-red-500"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQty({ itemId: item.id, delta: 1 })}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-green-500 text-green-600"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </td>
              <td className="p-3 font-semibold text-green-600">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="p-3 text-red-500">
                {item.applied_discount?.type === "PERCENTAGE"
                  ? `${item.applied_discount.value}%`
                  : item.applied_discount?.type === "FIXED"
                    ? formatCurrency(item.applied_discount.value)
                    : ""}
              </td>
              <td className="p-3 text-right">
                <button onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex-1" />

      <div className="border-t border-gray-100 px-4 py-3 text-sm">
        <div className="flex justify-between py-1 text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(summary.subtotal)}</span>
        </div>
        <div className="flex justify-between py-1 text-green-600">
          <span>Discount</span>
          <span>-{formatCurrency(summary.discount)}</span>
        </div>
      </div>
      <div className="flex justify-between border-t border-gray-100 px-4 py-3">
        <span className="text-base font-semibold text-gray-700">Total</span>
        <span className="text-xl font-bold text-red-500">
          {formatCurrency(summary.total)}
        </span>
      </div>

      <div className="flex gap-3 p-4">
        <button 
        onClick={() => setNewOrderOpen(true)}
        className="flex-1 rounded-xl bg-amber-400 py-3 text-sm font-bold text-white active:scale-[0.98]">
          New order
        </button>
        <button
          onClick={() => setPaymentOpen(true)}
          className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:scale-[0.98]"
        >
          Pay
        </button>
      </div>
      
      <NewOrder
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        itemCount={order.items.length}
        onCreate={handleCreateOrder}
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
