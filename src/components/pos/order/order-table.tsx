"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/money";

import type { Order } from "@/types/pos-type";
import type { PosOrder, PosOrderItem, Sale } from "@/lib/api/pos-order";

import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useGetCurrentOrderQuery,
  useParkOrderMutation,
  useRemoveOrderItemMutation,
  usePayOrderMutation,
  useUpdateOrderItemMutation,
} from "@/services/posOrderApi";
import { NewOrder } from "./new-order";
import { Payment } from "./payment";

export interface OrderTableProps {
  onPaymentSuccess?: (paidOrder: PosOrder, sale: Sale) => void;
  /** Selects the Order tab after the current order is parked. */
  onOrderCreated?: () => void;
  isEditingOrder?: boolean;
}

/**
 * The payment dialog still speaks the older snake_case `Order`.
 * This adapts just enough of the real order for them, and goes away once those
 * screens are wired to the API directly.
 */
function legacyOrderShape(order: PosOrder): Order {
  return {
    id: order.id,
    business_owner_id: order.businessId,
    invoice_number: order.invoiceNumber,
    customer_id: order.customerId,
    cashier_id: null,
    channel: order.channel,
    status: order.status,
    subtotal: String(order.subtotal),
    discount_amount: String(order.discountAmount),
    applied_discounts: null,
    total: String(order.total),
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
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  /** Quantity buttons are held while the line is being written. */
  busy?: boolean;
}

function ItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  busy,
}: ItemRowProps) {
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
        {formatCurrency(item.lineTotal)}
        {item.quantity > 1 && (
          <span className="mt-0.5 block text-xs font-normal text-gray-400">
            {formatCurrency(item.unitPrice)} each
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
}

/* --------------------------------- table --------------------------------- */

export function OrderTable({
  onPaymentSuccess,
  onOrderCreated,
  isEditingOrder = false,
}: OrderTableProps) {
  const { toast } = useToast();
  const { data: order, isLoading, error } = useGetCurrentOrderQuery();
  const [updateOrderItem] = useUpdateOrderItemMutation();
  const [removeOrderItem] = useRemoveOrderItemMutation();
  const [parkOrder, { isLoading: isParking }] = useParkOrderMutation();
  const [payOrder, { isLoading: isPaying }] = usePayOrderMutation();

  // Which line is mid-request, so only its own buttons are held.
  const [busyLineId, setBusyLineId] = useState("");

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

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
  /** Names and parks the current cart without cancelling it. */
  const handleCreateOrder = async (data: { name: string }) => {
    try {
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
   *
   * The order is captured before paying because the cart is cleared the moment
   * the payment lands — the receipt still needs the lines that were sold.
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

      setPaymentOpen(false);
      onPaymentSuccess?.(sold, sale);
    } catch (cause) {
      // Covers a closed register as well as short cash — the backend refuses
      // a POS sale with no open session, and the cashier needs to know which.
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
      // The backend rejects a quantity of zero, so the last one down is a
      // removal — which is also what a cashier means by it.
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
            {formatCurrency(summary.subtotal)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-primary min-[1025px]:text-[22px] min-[1025px]:font-medium min-[1025px]:leading-7">Discount</span>
          <span className="tabular-nums text-primary min-[1025px]:text-[25px] min-[1025px]:font-medium min-[1025px]:leading-7">
            -{formatCurrency(summary.discount)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#d9d9d9] px-4 py-3 min-[1025px]:h-16">
        <span className="text-base font-semibold text-gray-700 min-[1025px]:text-[25px]">Total</span>
        <span className="text-xl font-bold tabular-nums text-brand-red min-[1025px]:text-[35px]">
          {formatCurrency(summary.total)}
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

      {/* Payment still reads the legacy order shape. It is inert until the pay
          endpoint is wired, so it is only mounted once there is a sale. */}
      {paymentOpen && order && (
        <Payment
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          order={legacyOrderShape(order)}
          onValidate={handleValidatePayment}
          onDigitalPaid={(sale) => {
            // Bakong settled it; the sale already exists, so there is nothing
            // to pay here — just show what was sold.
            setPaymentOpen(false);
            onPaymentSuccess?.(order, sale);
          }}
          isProcessing={isPaying}
        />
      )}
    </div>
  );
}
