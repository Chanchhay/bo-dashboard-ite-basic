"use client";

import { UserRound, Pencil, MessageSquareOff } from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { useGetOpenOrdersQuery, useLoadOrderForEditMutation } from "@/features/order/order-api";

export interface OrdersListProps {
  onEdit?: () => void; // called after an order is loaded — parent switches tab back to POS
}

export function OrdersList({ onEdit }: OrdersListProps) {
  const { data: orders = [], isLoading } = useGetOpenOrdersQuery();
  const [loadOrderForEdit, { isLoading: isLoadingEdit }] =
    useLoadOrderForEditMutation();

  async function handleEdit(orderId: string) {
    try {
      await loadOrderForEdit(orderId).unwrap();
      onEdit?.();
    } catch (e) {
      console.error("Failed to load order for editing", e);
    }
  }

  return (
    <div className="flex h-full flex-col px-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Orders</h1>
          <p className="text-sm text-gray-500">
            Manage your active transactions
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {orders.length} OPEN {orders.length === 1 ? "ORDER" : "ORDERS"}
        </div>
      </div>

      {/* Order cards */}
      {isLoading ? (
        <div className="pt-6 text-sm text-gray-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <MessageSquareOff className="h-8 w-8" />
          <p className="text-sm">No open orders right now</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(order.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleEdit(order.id);
              }}
              className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <UserRound className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold ">
                      {order.note || "Untitled order"}
                    </p>
                    <p className="text-xs text-gray-500">CUSTOMER ORDER</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoadingEdit}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(order.id);
                  }}
                  className="text-secondary hover:text-secondary disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] font-semibold text-gray-500">
                    TIME
                  </p>
                  <p className="text-xs font-bold text-gray-700">
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] font-semibold text-gray-500">
                    ITEMS
                  </p>
                  <p className="text-xs font-bold text-primary">
                    {order.itemCount} items
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] font-semibold text-gray-500">
                    TOTAL
                  </p>
                  <p className="text-xs font-bold text-accent">
                    {formatCurrency(order.total)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}