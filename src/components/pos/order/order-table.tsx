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
  discountModalOpen?: boolean;
  onDiscountModalOpenChange?: (open: boolean) => void;
}

/**
 * The payment dialog still speaks the older snake_case `Order`.
 */
import { getActiveDefaultTax } from "@/lib/tax-store";

function computeItemDiscount(
  item: PosOrderItem,
  orderVal: PosOrder | null,
  rule: AppliedDiscountRule | null
): { discountAmount: number; label?: string } {
  if (!rule) {
    return { discountAmount: item.discountAmount ?? 0 };
  }

  let isEligible = true;
  if (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM") {
    const targetIds = new Set(rule.targetItemIds || []);
    if (targetIds.size > 0 && !targetIds.has(item.itemId)) {
      isEligible = false;
    }
  }

  if (!isEligible) {
    return { discountAmount: 0 };
  }

  const lineSubtotal = item.unitPrice * item.quantity;
  if (lineSubtotal <= 0) return { discountAmount: 0 };

  const targetIds = (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM")
    ? new Set(rule.targetItemIds || [])
    : null;

  const eligibleSubtotal = (orderVal?.items || []).reduce((sum, i) => {
    if (!targetIds || targetIds.has(i.itemId)) {
      return sum + i.unitPrice * i.quantity;
    }
    return sum;
  }, 0);

  if (eligibleSubtotal <= 0) return { discountAmount: 0 };

  let disc = 0;
  if (rule.type === "PERCENTAGE") {
    disc = (lineSubtotal * rule.value) / 100;
    if (rule.maxDiscountAmount) {
      const totalPercentageDisc = (eligibleSubtotal * rule.value) / 100;
      if (totalPercentageDisc > rule.maxDiscountAmount) {
        disc = (lineSubtotal / eligibleSubtotal) * rule.maxDiscountAmount;
      }
    }
  } else if (rule.type === "FINAL_PRICE") {
    const targetAmount = Math.max(0, eligibleSubtotal - rule.value);
    disc = (lineSubtotal / eligibleSubtotal) * targetAmount;
  } else {
    const totalDisc = Math.min(eligibleSubtotal, rule.value);
    disc = (lineSubtotal / eligibleSubtotal) * totalDisc;
  }

  disc = Math.min(lineSubtotal, Math.max(0, parseFloat(disc.toFixed(2))));

  return {
    discountAmount: disc,
    label: rule.discountCode
      ? `Code: ${rule.discountCode}`
      : rule.type === "PERCENTAGE"
      ? `${rule.value}% OFF`
      : undefined,
  };
}

function legacyOrderShape(order: PosOrder): Order {
  const subtotalNum = order.subtotal ?? 0;
  const discountNum = order.discountAmount ?? 0;
  const afterDiscount = Math.max(0, subtotalNum - discountNum);

  const activeTax = getActiveDefaultTax();
  const isTaxActive = activeTax?.isActive ?? false;
  const isTaxInclusive = activeTax?.isTaxInclusive ?? false;

  const effectiveTaxRate = isTaxActive
    ? ((order.taxRate && order.taxRate > 0) ? order.taxRate : (activeTax?.taxRate ?? 0))
    : 0;

  const calculatedTax = isTaxActive
    ? isTaxInclusive
      ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
      : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2))
    : 0;

  const taxAmount = isTaxActive
    ? ((order.taxAmount && order.taxAmount > 0) ? order.taxAmount : calculatedTax)
    : 0;

  const computedTotal = isTaxInclusive
    ? afterDiscount
    : Math.max(0, parseFloat((afterDiscount + taxAmount).toFixed(2)));

  let storedRule: AppliedDiscountRule | null = null;
  try {
    const raw = localStorage.getItem(`pos_cart_discount_${order.id}`);
    if (raw) storedRule = JSON.parse(raw);
  } catch {}

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
    items: order.items.map((line) => {
      const disc = computeItemDiscount(line, order, storedRule);
      return {
        id: line.id,
        business_owner_id: order.businessId,
        order_id: order.id,
        product_id: line.itemId,
        variant_id: line.variantId,
        product_name: line.itemName,
        variant_name: line.variantName ?? null,
        unit_name: line.unitName ?? null,
        unit_factor: line.unitFactor ?? null,
        add_ons: (line.addOns || []).map((addOn) => ({ name: addOn.name })),
        quantity: line.quantity,
        unit_price: String(line.unitPrice),
        unit_cost: "0",
        discount_amount: String(disc.discountAmount),
        applied_discount: null,
      };
    }),
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
  discountInfo?: { discountAmount: number; label?: string };
}

const ItemRow = memo(function ItemRow({
  item,
  currency,
  onIncrease,
  onDecrease,
  onRemove,
  busy,
  discountInfo,
}: ItemRowProps) {
  const { format } = useMoney();
  const grossTotal = item.unitPrice * item.quantity;
  const lineDiscount = discountInfo?.discountAmount ?? item.discountAmount ?? 0;
  const netTotal = Math.max(0, grossTotal - lineDiscount);

  return (
    <tr className="align-middle border-b border-gray-100">
      <td className="break-words px-2 py-2.5 text-xs text-gray-800 sm:px-4 sm:text-sm">
        <span className="font-semibold text-gray-900">{item.itemName}</span>
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
        {lineDiscount > 0 ? (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[11px] font-normal text-gray-400 line-through">
              {format(grossTotal, currency)}
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {format(netTotal, currency)}
            </span>
          </div>
        ) : (
          format(grossTotal, currency)
        )}
      </td>

      <td className="px-2 py-2.5 sm:px-4">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Remove ${item.itemName}`}
            onClick={() => onRemove(item.id)}
            disabled={busy}
            className="grid size-9 cursor-pointer place-items-center rounded-xl transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:outline-none disabled:opacity-40 dark:hover:bg-red-950/40"
          >
            <Trash2 className="size-4 text-brand-red" />
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
  discountModalOpen: externalDiscountModalOpen,
  onDiscountModalOpenChange,
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
  const [internalDiscountModalOpen, setInternalDiscountModalOpen] = useState(false);

  const isDiscountModalOpen = externalDiscountModalOpen ?? internalDiscountModalOpen;
  const setDiscountModalOpen = (open: boolean) => {
    setInternalDiscountModalOpen(open);
    onDiscountModalOpenChange?.(open);
  };

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

  const STORE_DEFAULT_DISCOUNT_KEY = "pos_store_default_discount";

  const [activeDiscountRule, setActiveDiscountRule] =
    useState<AppliedDiscountRule | null>(() => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("pos_store_default_discount");
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    });

  const computeTargetDiscountAmount = (orderVal: PosOrder, rule: AppliedDiscountRule): number => {
    let eligibleSubtotal = orderVal.subtotal;

    if (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM") {
      const targetIds = new Set(rule.targetItemIds || []);
      if (targetIds.size > 0) {
        eligibleSubtotal = orderVal.items.reduce((sum, item) => {
          if (targetIds.has(item.itemId)) {
            return sum + item.unitPrice * item.quantity;
          }
          return sum;
        }, 0);
      }
    }

    if (eligibleSubtotal <= 0) return 0;

    let targetAmount = 0;
    if (rule.type === "PERCENTAGE") {
      targetAmount = (eligibleSubtotal * rule.value) / 100;
      if (rule.maxDiscountAmount && targetAmount > rule.maxDiscountAmount) {
        targetAmount = rule.maxDiscountAmount;
      }
    } else if (rule.type === "FINAL_PRICE") {
      targetAmount = Math.max(0, eligibleSubtotal - rule.value);
    } else {
      targetAmount = Math.min(eligibleSubtotal, rule.value);
    }

    return Math.min(
      eligibleSubtotal,
      Math.max(0, parseFloat(targetAmount.toFixed(2)))
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storeDefaultRaw = localStorage.getItem(STORE_DEFAULT_DISCOUNT_KEY);
    let rule: AppliedDiscountRule | null = null;

    if (storeDefaultRaw) {
      try {
        rule = JSON.parse(storeDefaultRaw);
      } catch {}
    }

    if (order?.id) {
      const cartKey = `pos_cart_discount_${order.id}`;
      const cartRaw = localStorage.getItem(cartKey);
      if (cartRaw) {
        try {
          rule = JSON.parse(cartRaw);
        } catch {}
      } else if (rule) {
        try {
          localStorage.setItem(cartKey, JSON.stringify(rule));
        } catch {}
      }
    }

    if (rule) {
      setActiveDiscountRule(rule);
      if (order?.id) {
        const targetAmount = computeTargetDiscountAmount(order, rule);
        if (Math.abs((order.discountAmount ?? 0) - targetAmount) > 0.001) {
          void setOrderDiscount({
            discountAmount: targetAmount,
            discountId: rule.discountId,
            discountCode: rule.discountCode,
          });
        }
      }
    } else {
      setActiveDiscountRule(null);
    }
  }, [order?.id, order?.subtotal, order?.discountAmount, order?.items, setOrderDiscount]);

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
    if (!rule) {
      localStorage.removeItem(STORE_DEFAULT_DISCOUNT_KEY);
      if (order?.id) {
        localStorage.removeItem(`pos_cart_discount_${order.id}`);
      }
      setActiveDiscountRule(null);
      if (order?.id) {
        await setOrderDiscount({ discountAmount: 0 }).unwrap();
      }
      return;
    }

    localStorage.setItem(STORE_DEFAULT_DISCOUNT_KEY, JSON.stringify(rule));

    if (order?.id) {
      localStorage.setItem(`pos_cart_discount_${order.id}`, JSON.stringify(rule));
      setActiveDiscountRule(rule);

      const targetAmount = computeTargetDiscountAmount(order, rule);

      await setOrderDiscount({
        discountAmount: targetAmount,
        discountId: rule.discountId,
        discountCode: rule.discountCode,
      }).unwrap();
    } else {
      setActiveDiscountRule(rule);
    }
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
  const subtotalNum = order?.subtotal ?? 0;
  const discountNum = order?.discountAmount ?? 0;
  const afterDiscount = Math.max(0, subtotalNum - discountNum);

  const activeTax = getActiveDefaultTax();
  const isTaxActive = activeTax?.isActive ?? false;
  const isTaxInclusive = activeTax?.isTaxInclusive ?? false;

  const effectiveTaxRate = isTaxActive
    ? ((order?.taxRate && order.taxRate > 0) ? order.taxRate : (activeTax?.taxRate ?? 0))
    : 0;

  const calculatedTax = isTaxActive
    ? isTaxInclusive
      ? (afterDiscount > 0 && effectiveTaxRate > 0 ? parseFloat((afterDiscount - (afterDiscount / (1 + (effectiveTaxRate / 100)))).toFixed(2)) : 0)
      : parseFloat((afterDiscount * (effectiveTaxRate / 100)).toFixed(2))
    : 0;

  const taxAmount = isTaxActive
    ? ((order?.taxAmount && order.taxAmount > 0) ? order.taxAmount : calculatedTax)
    : 0;

  const computedCartTotal = isTaxInclusive
    ? afterDiscount
    : Math.max(0, parseFloat((afterDiscount + taxAmount).toFixed(2)));

  const summary = {
    subtotal: subtotalNum,
    discount: discountNum,
    taxName: activeTax?.taxName ?? "VAT",
    taxRate: effectiveTaxRate,
    taxAmount: taxAmount,
    isTaxActive,
    isTaxInclusive,
    total: computedCartTotal,
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
      const taxInclusionType = isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE";
      const sale = await payOrder({
        paymentMethod: method,
        receivedAmount,
        isTaxActive,
        isTaxInclusive,
        taxInclusionType,
        taxRate: effectiveTaxRate,
        taxAmount: summary.taxAmount,
      }).unwrap();

      if (sold.id) {
        if (activeDiscountRule) {
          try {
            localStorage.setItem(`pos_order_discount_rule_${sold.id}`, JSON.stringify(activeDiscountRule));
            if (sale?.id) {
              localStorage.setItem(`pos_order_discount_rule_${sale.id}`, JSON.stringify(activeDiscountRule));
            }
          } catch {}
        }
        localStorage.removeItem(`pos_cart_discount_${sold.id}`);
        try {
          localStorage.setItem(`pos_order_tax_rule_${sold.id}`, JSON.stringify({
            isTaxActive,
            isTaxInclusive,
            taxInclusionType,
            taxRate: effectiveTaxRate,
            taxAmount: summary.taxAmount,
            totalAmount: summary.total,
          }));
        } catch {}
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
      discountInfo={computeItemDiscount(item, order ?? null, activeDiscountRule)}
    />
  );

  return (
    <div className="flex h-full flex-col bg-white/90">
      {/* Active Shop Discount Banner */}
      {activeDiscountRule && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary shrink-0">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-bold">Active Shop Discount:</span>
            <span className="truncate">{activeDiscountRule.label}</span>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            Active
          </span>
        </div>
      )}

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

        {summary.discount > 0 && (
          <div className="flex justify-between items-center py-1">
            <span className="text-primary min-[1025px]:text-[22px] min-[1025px]:font-medium min-[1025px]:leading-7">
              Discount
            </span>
            <span className="tabular-nums text-primary min-[1025px]:text-[25px] min-[1025px]:font-medium min-[1025px]:leading-7">
              -{format(summary.discount, order?.currency)}
            </span>
          </div>
        )}

        {summary.isTaxActive && !summary.isTaxInclusive && summary.taxAmount > 0 && (
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-600 min-[1025px]:text-[22px] min-[1025px]:font-medium min-[1025px]:leading-7">
              +
              {summary.taxName.includes("VAT") ? "VAT" : summary.taxName}
              {summary.taxRate > 0 ? ` (${summary.taxRate}%)` : ""}
            </span>
            <span className="tabular-nums text-primary min-[1025px]:text-[25px] min-[1025px]:font-medium min-[1025px]:leading-7">
              +{format(summary.taxAmount, order?.currency)}
            </span>
          </div>
        )}

        {summary.isTaxActive && summary.isTaxInclusive && summary.taxAmount > 0 && (
          <div className="flex justify-between items-center py-1 text-xs text-muted-foreground italic">
            <span>
              Incl. {summary.taxName.includes("VAT") ? "VAT" : summary.taxName}
              {summary.taxRate > 0 ? ` (${summary.taxRate}%)` : ""}
            </span>
            <span className="tabular-nums font-mono">
              ({format(summary.taxAmount, order?.currency)})
            </span>
          </div>
        )}
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
        open={isDiscountModalOpen}
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