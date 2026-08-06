"use client";

import { useState } from "react";
import {
  MessageSquareOff,
  Pencil,
  RefreshCw,
  Trash2,
  UserRound,
} from "lucide-react";

import { CancelOrderDialog } from "@/components/pos/order/cancel-order-dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import type { PosOrder } from "@/lib/api/pos-order";
import { useMoney } from "@/hooks/useMoney";
import {
  useCancelOpenOrderMutation,
  useGetOpenOrdersQuery,
  useLoadOrderForEditMutation,
} from "@/services/posOrderApi";
import { useToast } from "@/components/ui/toast";

export interface OrdersListProps {
  onEdit?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
}

export function OrdersList({ onEdit, onCancel }: OrdersListProps) {
  const { format } = useMoney();
  const { toast } = useToast();
  const [orderToCancel, setOrderToCancel] = useState<PosOrder | null>(null);
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetOpenOrdersQuery(undefined, { refetchOnMountOrArgChange: true });
  const [loadOrderForEdit, { isLoading: isLoadingEdit }] =
    useLoadOrderForEditMutation();
  const [cancelOpenOrder, { isLoading: isCancelling }] =
    useCancelOpenOrderMutation();

  const orders = data?.content ?? [];

  async function handleEdit(orderId: string) {
    try {
      await loadOrderForEdit(orderId).unwrap();
      onEdit?.(orderId);
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not open that order",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  }

  async function handleCancel() {
    if (!orderToCancel) return;

    const { id } = orderToCancel;
    const name = orderToCancel.note?.trim() || "Untitled order";

    try {
      await cancelOpenOrder(id).unwrap();
      setOrderToCancel(null);
      onCancel?.(id);
      toast({
        tone: "success",
        title: "Order cancelled",
        description: `${name} was removed from open orders.`,
      });
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not cancel that order",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  }

  return (
    <div className="flex min-h-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-6 min-[1025px]:px-8 min-[1025px]:pt-7">
      <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-[28px]">
            Orders
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your active transactions
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start rounded-lg border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary min-[480px]:self-auto">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {data?.page.totalElements ?? orders.length} OPEN{" "}
          {(data?.page.totalElements ?? orders.length) === 1 ? "ORDER" : "ORDERS"}
        </div>
      </div>

      {isLoading ? (
        <div
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
          aria-label="Loading open orders"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-white/70"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-4 text-center"
        >
          <p className="font-semibold text-gray-700">Could not load open orders</p>
          <p className="max-w-sm text-sm text-gray-500">
            {getApiErrorMessage(error, "Check the connection and try again.")}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <MessageSquareOff className="size-9 text-gray-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-gray-700">No open orders right now</p>
          <p className="max-w-sm text-xs leading-5 text-gray-500 sm:text-sm">
            Name the current cart with New order and it will appear here.
          </p>
        </div>
      ) : (
        <div
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1025px]:gap-5"
          aria-busy={isFetching || isLoadingEdit || isCancelling}
        >
          {orders.map((order) => {
            const itemCount = order.items.reduce(
              (total, item) => total + item.quantity,
              0,
            );
            const created = order.createdDate ? new Date(order.createdDate) : null;
            const name = order.note?.trim() || "Untitled order";

            return (
              <article
                key={order.id}
                className="relative rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => void handleEdit(order.id)}
                  disabled={isLoadingEdit || isCancelling}
                  aria-label={`Edit ${name}`}
                  className="flex min-h-36 w-full flex-col gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1e29] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-60 sm:p-5"
                >
                  <div className="flex w-full items-start justify-between gap-3 pr-20">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                        <UserRound className="size-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-bold text-gray-900 dark:text-gray-100">
                          {name}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[-0.02em] text-gray-400 dark:text-gray-500">
                          Customer order
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid w-full grid-cols-3 gap-2">
                    <OrderMetric
                      label="Time"
                      value={
                        created
                          ? created.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"
                      }
                    />
                    <OrderMetric
                      label="Items"
                      value={`${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                      tone="text-primary"
                    />
                    <OrderMetric
                      label="Total"
                      value={format(order.total, order.currency)}
                      tone="text-red-500"
                      emphasized
                    />
                  </div>
                </button>

                {/* Consistent 1-Row Action Buttons */}
                <div className="absolute right-4 top-4 sm:right-5 sm:top-5 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => void handleEdit(order.id)}
                    disabled={isLoadingEdit || isCancelling}
                    title="Edit order"
                    aria-label={`Edit ${name}`}
                    className="grid size-9 place-items-center rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 outline-none transition-colors hover:border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 focus-visible:ring-2 focus-visible:ring-amber-500/25 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderToCancel(order)}
                    disabled={isLoadingEdit || isCancelling}
                    title="Cancel order"
                    aria-label={`Cancel ${name}`}
                    className="grid size-9 place-items-center rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-brand-red dark:text-red-400 outline-none transition-colors hover:border-red-200 hover:bg-red-100 dark:hover:bg-red-900/60 focus-visible:ring-2 focus-visible:ring-brand-red/25 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CancelOrderDialog
        open={Boolean(orderToCancel)}
        orderName={orderToCancel?.note?.trim() || "Untitled order"}
        isCancelling={isCancelling}
        onOpenChange={(open) => {
          if (!open) setOrderToCancel(null);
        }}
        onConfirm={() => void handleCancel()}
      />
    </div>
  );
}

function OrderMetric({
  label,
  value,
  tone = "text-gray-700 dark:text-gray-200",
  emphasized = false,
}: {
  label: string;
  value: string;
  tone?: string;
  emphasized?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 flex-col items-center rounded-lg px-1.5 py-2 text-center ${
        emphasized
          ? "border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40"
          : "bg-gray-50 dark:bg-[#12151e]"
      }`}
    >
      <span className={`text-[10px] font-bold uppercase ${emphasized ? "text-red-400 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
        {label}
      </span>
      <span className={`mt-0.5 max-w-full truncate text-xs font-semibold ${tone}`}>
        {value}
      </span>
    </span>
  );
}
