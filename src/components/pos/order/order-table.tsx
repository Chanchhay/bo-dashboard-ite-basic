"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crown,
  Minus,
  Plus,
  Tag,
  Ticket,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useMoney } from "@/hooks/useMoney";

import type { Order } from "@/types/pos-type";
import {
  baseUnitsOf,
  type PosOrder,
  type PosOrderItem,
  type Sale,
  type SetOrderCustomerInput,
  type SetOrderDiscountInput,
} from "@/lib/api/pos-order";

import { offlineDb } from "@/lib/offline/db";
import { processOfflineCheckout } from "@/lib/checkout";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { playTick } from "@/lib/pos/sounds";
import { useGetCustomersQuery } from "@/services/customerApi";
import { useGetDiscountsQuery } from "@/services/discountApi";
import type { DiscountResponse } from "@/lib/api/discount";
import { useGetBusinessProfileQuery } from "@/services/businessApi";
import {
  useParkOrderMutation,
  usePayOrderMutation,
  useSetOrderCustomerMutation,
  useSetOrderDiscountMutation,
} from "@/services/posOrderApi";
import { useCartActions, useCurrentCart } from "@/lib/pos/use-cart";
import { setCartTax } from "@/lib/pos/local-cart";
import { flushCart, getLastCartPushError, onCartPushFailed } from "@/lib/pos/cart-sync";
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
  discountModalMode?: "COUPON" | "CUSTOM";
  customerModalOpen?: boolean;
  onCustomerModalOpenChange?: (open: boolean) => void;
  /**
   * How many more of an item the till may still sell, the cart's own claim
   * already taken off.
   *
   * Passed in rather than worked out here: the terminal already answers this
   * for the grid, the option picker and the scanner, and a second answer that
   * forgot the channel's share of the stock would let the cart sell past a
   * ceiling the cards respect. Absent means nobody counts this item.
   */
  stockFor?: (itemId: string, variantId?: string) => number | undefined;
}

/**
 * The payment dialog still speaks the older snake_case `Order`.
 */

const formatLocalPhone = (phoneStr?: string | null): string => {
  if (!phoneStr) return "";
  const cleaned = phoneStr.trim();
  let digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("855") && digits.length >= 10) {
    digits = "0" + digits.slice(3);
  } else if (!digits.startsWith("0") && (digits.length === 8 || digits.length === 9)) {
    digits = "0" + digits;
  }
  return digits || cleaned;
};

const isMembershipDiscount = (r: AppliedDiscountRule | null): boolean => {
  if (!r) return false;
  if (r.isMembership) return true;
  const lbl = (r.label || "").toLowerCase();
  return lbl.includes("vip") || lbl.includes("membership") || lbl.includes("member");
};

function isRuleConditionMet(orderVal: PosOrder | null, rule: AppliedDiscountRule | null): boolean {
  if (!rule || !orderVal) return true;

  // 1. Minimum Purchase Order Subtotal condition
  if (rule.minOrderAmount && rule.minOrderAmount > 0) {
    if ((orderVal.subtotal ?? 0) < rule.minOrderAmount) {
      return false;
    }
  }

  // 2. Minimum Item Quantity condition
  if (rule.minQuantity && rule.minQuantity > 0) {
    const totalQty = (orderVal.items || []).reduce((sum, item) => sum + item.quantity, 0);
    if (totalQty < rule.minQuantity) {
      return false;
    }
  }

  // 3. Buy X Get Y condition
  if (rule.buyQuantity && rule.getQuantity && rule.buyQuantity > 0 && rule.getQuantity > 0) {
    let targetIds: Set<string> | null = null;
    if (rule.scope === "SPECIFIC_ITEMS" || rule.scope === "ITEM") {
      targetIds = new Set(rule.targetItemIds || []);
    }
    const eligibleQty = (orderVal.items || []).reduce((sum, item) => {
      if (!targetIds || targetIds.has(item.itemId)) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
    if (eligibleQty < (rule.buyQuantity + rule.getQuantity)) {
      return false;
    }
  }

  return true;
}

function computeItemDiscount(
  item: PosOrderItem,
  orderVal: PosOrder | null,
  rule: AppliedDiscountRule | null,
  _activePosDiscounts: DiscountResponse[] = []
): { discountAmount: number; label?: string } {
  const effectiveRule = rule;

  // With no rule the cashier actually chose, guessing one for this one item
  // from the active discount list used to mean matching whichever discount
  // came first for THIS item alone — never checking whether another item in
  // the same cart had already used up the very units a storewide bundle
  // needed, or whether the backend's own per-item and order-level discounts
  // (gated so only one of the two ever fires — see `syncOrderDiscount`)
  // agreed with a guess made one line at a time. Two items each getting
  // matched independently was how a storewide Buy X Get Y ended up giving
  // Hamberger its own "free" unit on top of Matcha latte's, something the
  // backend's real total never charged for. `item.discountAmount` (and
  // `item.freeQuantity` for the free-unit badge) are never a guess — the
  // backend already decided correctly and this device learned the real
  // numbers back from it — so they are trusted outright instead.
  if (!effectiveRule || !orderVal) {
    return { discountAmount: item.discountAmount ?? 0, label: item.discountLabel ?? undefined };
  }

  if (!isRuleConditionMet(orderVal, effectiveRule)) {
    return { discountAmount: 0 };
  }

  let isEligible = true;
  if (effectiveRule.scope === "SPECIFIC_ITEMS" || effectiveRule.scope === "ITEM") {
    const targetIds = new Set(effectiveRule.targetItemIds || []);
    if (targetIds.size > 0 && !targetIds.has(item.itemId)) {
      isEligible = false;
    }
  }

  if (!isEligible) {
    return { discountAmount: 0 };
  }

  const lineSubtotal = item.unitPrice * item.quantity;
  if (lineSubtotal <= 0) return { discountAmount: 0 };

  const targetIds = (effectiveRule.scope === "SPECIFIC_ITEMS" || effectiveRule.scope === "ITEM")
    ? new Set(effectiveRule.targetItemIds || [])
    : null;

  // Handle Buy X Get Y discount scope calculation (cheapest eligible items become FREE)
  if (effectiveRule.buyQuantity && effectiveRule.getQuantity && effectiveRule.buyQuantity > 0 && effectiveRule.getQuantity > 0) {
    const eligibleUnits: { itemId: string; unitPrice: number }[] = [];
    for (const orderItem of orderVal.items || []) {
      if (!targetIds || targetIds.has(orderItem.itemId)) {
        for (let q = 0; q < orderItem.quantity; q++) {
          eligibleUnits.push({ itemId: orderItem.itemId, unitPrice: orderItem.unitPrice });
        }
      }
    }

    eligibleUnits.sort((a, b) => a.unitPrice - b.unitPrice);

    const freeCount = Math.floor(eligibleUnits.length / (effectiveRule.buyQuantity + effectiveRule.getQuantity)) * effectiveRule.getQuantity;
    if (freeCount <= 0) {
      return { discountAmount: 0 };
    }

    const freeUnits = eligibleUnits.slice(0, freeCount);
    const itemFreeQty = freeUnits.filter((u) => u.itemId === item.itemId).length;
    const freeDiscount = itemFreeQty * item.unitPrice;

    if (itemFreeQty > 0) {
      return {
        discountAmount: freeDiscount,
        label: effectiveRule.label ? `${itemFreeQty} Free · ${effectiveRule.label}` : `${itemFreeQty} Free`,
      };
    }

    return { discountAmount: 0 };
  }

  const eligibleSubtotal = (orderVal?.items || []).reduce((sum, i) => {
    if (!targetIds || targetIds.has(i.itemId)) {
      return sum + i.unitPrice * i.quantity;
    }
    return sum;
  }, 0);

  if (eligibleSubtotal <= 0) return { discountAmount: 0 };

  let disc = 0;
  if (effectiveRule.type === "PERCENTAGE") {
    disc = (lineSubtotal * effectiveRule.value) / 100;
    if (effectiveRule.maxDiscountAmount) {
      const totalPercentageDisc = (eligibleSubtotal * effectiveRule.value) / 100;
      if (totalPercentageDisc > effectiveRule.maxDiscountAmount) {
        disc = (lineSubtotal / eligibleSubtotal) * effectiveRule.maxDiscountAmount;
      }
    }
  } else if (effectiveRule.type === "FINAL_PRICE") {
    const targetAmount = Math.max(0, eligibleSubtotal - effectiveRule.value);
    disc = (lineSubtotal / eligibleSubtotal) * targetAmount;
  } else {
    if (effectiveRule.scope === "SPECIFIC_ITEMS" || effectiveRule.scope === "ITEM") {
      disc = Math.min(lineSubtotal, effectiveRule.value * item.quantity);
    } else {
      const totalDisc = Math.min(eligibleSubtotal, effectiveRule.value);
      disc = (lineSubtotal / eligibleSubtotal) * totalDisc;
    }
  }

  disc = Math.min(lineSubtotal, Math.max(0, parseFloat(disc.toFixed(2))));

  return {
    discountAmount: disc,
    label: effectiveRule.label
      ?? (effectiveRule.discountCode
        ? `Code: ${effectiveRule.discountCode}`
        : effectiveRule.type === "PERCENTAGE"
        ? `${effectiveRule.value}% OFF`
        : undefined),
  };
}

function legacyOrderShape(
  order: PosOrder,
  activePosDiscounts: DiscountResponse[] = [],
  activeDiscountRule: AppliedDiscountRule | null = null
): Order {
  const subtotalNum = order.subtotal ?? (order.items || []).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  let storedRule = activeDiscountRule;
  if (!storedRule) {
    try {
      const raw = localStorage.getItem(`pos_cart_discount_${order.id}`);
      if (raw) storedRule = JSON.parse(raw);
    } catch {}
  }

  let calculatedItemsDiscount = 0;
  const shapedItems = (order.items || []).map((line) => {
    const disc = computeItemDiscount(line, order, storedRule, activePosDiscounts);
    calculatedItemsDiscount += disc.discountAmount;
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
  });

  const discountNum = Math.max(order.discountAmount ?? 0, calculatedItemsDiscount);
  const afterDiscount = Math.max(0, subtotalNum - discountNum);

  const taxRate = order.taxRate ?? 0;
  const isTaxActive = (order.taxAmount ?? 0) > 0 || taxRate > 0;
  const isTaxInclusive = order.taxInclusionType === "INCLUSIVE";
  const taxAmount = isTaxActive
    ? (isTaxInclusive
      ? Math.round((afterDiscount - afterDiscount / (1 + taxRate / 100)) * 100) / 100
      : Math.round(afterDiscount * (taxRate / 100) * 100) / 100)
    : 0;

  const computedTotal = isTaxInclusive ? afterDiscount : (afterDiscount + taxAmount);

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
    tax_rate: order.taxRate ?? null,
    tax_amount: taxAmount,
    tax_inclusion_type: order.taxInclusionType ?? null,
    total: String(computedTotal),
    currency: order.currency,
    note: order.note,
    comment: null,
    created_at: order.createdDate ?? "",
    updated_at: null,
    items: shapedItems,
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
  /** Nothing left on the shelf for one more of this line. */
  atStockLimit?: boolean;
  discountInfo?: { discountAmount: number; label?: string };
}

const ItemRow = memo(function ItemRow({
  item,
  currency,
  onIncrease,
  onDecrease,
  onRemove,
  busy,
  atStockLimit,
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
        {/* Which promo cut this line's price, so the cashier (and the
            receipt) can say why it's discounted, not just by how much. */}
        {lineDiscount > 0 && discountInfo?.label ? (
          <span className="mt-0.5 block text-[11px] font-semibold text-primary">
            {discountInfo.label}
          </span>
        ) : null}
        {/* How many of this line's units the backend's Buy X Get Y engine
            granted on its own — the whole point of the offer is invisible
            to the cashier without this, since the total quantity alone
            reads as an ordinary sale. */}
        {item.freeQuantity ? (
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary dark:bg-primary/20 dark:text-primary">
            {item.freeQuantity} FREE
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
            disabled={busy || atStockLimit}
            onClick={() => onIncrease(item)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40"
            title={
              atStockLimit
                ? "No more of this in stock"
                : "Increase quantity"
            }
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
            <span className="text-sm font-bold text-primary">
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
  discountModalMode,
  customerModalOpen: externalCustomerModalOpen,
  onCustomerModalOpenChange,
  stockFor,
}: OrderTableProps) {
  const { format, secondaryFor } = useMoney();
  const { toast } = useToast();

  // The cart comes off the device, not the network. Nothing here can be in a
  // loading or failed state for long enough to need a screen of its own.
  const { cart, order, isLoading } = useCurrentCart();
  const {
    setQuantity,
    removeItem,
    setCustomer,
    setDiscount,
    clear: clearLocalCart,
  } = useCartActions();
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: discounts = [] } = useGetDiscountsQuery();
  const { data: business } = useGetBusinessProfileQuery();

  /*
   * A cart opened with no connection has never been priced by the server, so
   * it starts with no tax rule of its own. The shop's own setting fills that
   * in — otherwise a VAT-charging shop rings up an untaxed total offline and
   * only finds out when the sale reconciles at a different figure.
   *
   * Only when the cart has none: once the server has answered, its rate is
   * the one that was actually charged.
   */
  useEffect(() => {
    if (!cart || cart.taxRate !== null || !business) return;
    if (business.taxRate == null) return;

    void setCartTax({
      taxRate: business.taxRate,
      taxInclusionType: business.taxInclusionType ?? "EXCLUSIVE",
    });
  }, [business, cart]);

  const [parkOrder, { isLoading: isParking }] = useParkOrderMutation();
  const [payOrder, { isLoading: isPaying }] = usePayOrderMutation();
  const [setCustomerOnServer] = useSetOrderCustomerMutation();
  const [setDiscountOnServer] = useSetOrderDiscountMutation();
  // Covers the stretch `isPaying` (payOrder's own loading flag) does not:
  // the discount-sync wait and flushCart()'s round trip, both of which
  // happen before payOrder is ever called.
  const isSubmittingPaymentRef = useRef(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  /*
   * The customer and the discount land on the cart first, and the server is
   * told after.
   *
   * Same rule as the lines: what the panel shows is what is saved on this
   * device. Callers still get something with `unwrap()` on it so they read
   * unchanged, but a request that never reached a server is not an error to
   * them — the cart already holds the discount, and letting the rejection
   * through meant a discounted sale could not be taken offline at all.
   */
  const tolerateOffline = useCallback(
    <T,>(pending: { unwrap: () => Promise<T> }) => ({
      unwrap: async (): Promise<T | undefined> => {
        try {
          return await pending.unwrap();
        } catch (cause) {
          const status = (cause as { status?: unknown })?.status;

          if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
            return undefined;
          }

          throw cause;
        }
      },
    }),
    [],
  );

  const setOrderCustomer = useCallback(
    (input: SetOrderCustomerInput) => {
      void setCustomer(input.customerId ?? null);
      return tolerateOffline(setCustomerOnServer(input));
    },
    [setCustomer, setCustomerOnServer, tolerateOffline],
  );

  const setOrderDiscount = useCallback(
    (input: SetOrderDiscountInput) => {
      void setDiscount({
        discountAmount: input.discountAmount,
        discountId: input.discountId ?? null,
        discountCode: input.discountCode ?? null,
      });
      return tolerateOffline(setDiscountOnServer(input));
    },
    [setDiscount, setDiscountOnServer, tolerateOffline],
  );

  const [busyLineId, setBusyLineId] = useState("");

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [internalCustomerModalOpen, setInternalCustomerModalOpen] = useState(false);
  const [internalDiscountModalOpen, setInternalDiscountModalOpen] = useState(false);

  const isCustomerModalOpen = externalCustomerModalOpen ?? internalCustomerModalOpen;
  const setCustomerModalOpen = (open: boolean) => {
    setInternalCustomerModalOpen(open);
    onCustomerModalOpenChange?.(open);
  };

  const isDiscountModalOpen = externalDiscountModalOpen ?? internalDiscountModalOpen;
  const setDiscountModalOpen = (open: boolean) => {
    setInternalDiscountModalOpen(open);
    onDiscountModalOpenChange?.(open);
  };


  const lineQuantityRef = useRef<Map<string, number>>(new Map());

  // Holds the in-flight discount PATCH so a payment attempt can await the
  // exact same promise instead of racing the optimistic cache update.
  const pendingDiscountSyncRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    if (order?.items) {
      order.items.forEach((i) => {
        lineQuantityRef.current.set(i.id, i.quantity - (i.freeQuantity ?? 0));
      });
    }
  }, [order?.items]);

  // A background push (not the payment-time one, which already surfaces its
  // own failure) is otherwise silent — the cashier taps, the screen updates
  // optimistically, and a refused bundle (stock too short to cover it) would
  // never be seen until checkout. This is what tells them right away.
  useEffect(() => {
    return onCartPushFailed((message) => {
      toast({
        tone: "error",
        title: "Could not save that change",
        description: message,
      });
    });
  }, [toast]);

  /** How many free units each line carried as of the last render — so a bundle completing can be told apart from one already sitting there on load. */
  const freeQuantityRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!order?.items) return;

    for (const item of order.items) {
      const previous = freeQuantityRef.current.get(item.id);
      const current = item.freeQuantity ?? 0;

      if (previous !== undefined && current > previous) {
        const gained = current - previous;
        toast({
          tone: "success",
          title: "Promotion applied",
          description: `${item.itemName}: ${gained} free unit${gained > 1 ? "s" : ""} added automatically.`,
        });
      }

      freeQuantityRef.current.set(item.id, current);
    }

    // A line that left the cart entirely has nothing left to compare next
    // time it's used for a different item.
    const stillPresent = new Set(order.items.map((item) => item.id));
    for (const id of freeQuantityRef.current.keys()) {
      if (!stillPresent.has(id)) freeQuantityRef.current.delete(id);
    }
  }, [order?.items, toast]);

  /** Runs one line change, reporting rather than silently swallowing failure. */
  // No connection: the cart is this till's own, and so are its line ids.
  const isOffline = typeof window !== "undefined" && !navigator.onLine;

 
  async function runLineChange(change: () => Promise<unknown>) {
    playTick();
    await change();
  }


  const atStockLimit = useCallback(
    (item: PosOrderItem) => {
      if (!stockFor || item.trackInventory === false) return false;

      const left = stockFor(item.itemId, item.variantId ?? undefined);

      // Undefined is an item nobody counts, not an item at zero.
      if (left === undefined) return false;

      return left < baseUnitsOf({ quantity: 1, unitFactor: item.unitFactor });
    },
    [stockFor],
  );

  const handleIncrease = useCallback(
    (item: PosOrderItem) => {
      // The button is disabled too, but that is the look. A line can hit the
      // limit between the row rendering and the press landing — and the same
      // press arrives from the keyboard, where nothing is dimmed.
      if (atStockLimit(item)) {
        toast({
          tone: "error",
          title: `No more ${item.itemName} in stock`,
          description: "Receive stock for it before selling more.",
        });
        return;
      }

      const currentFree = item.freeQuantity ?? 0;
      const currentPaid = lineQuantityRef.current.get(item.id) ?? (item.quantity - currentFree);
      const nextPaid = currentPaid + 1;
      lineQuantityRef.current.set(item.id, nextPaid);

      // The freebie count is only ever learned back from the server (see
      // local-cart.ts's applyServerCart), so the optimistic total keeps
      // whatever it last confirmed rather than guessing whether this tap
      // just completed a fresh bundle — the push settles that shortly.
      void runLineChange(() => setQuantity(item.id, nextPaid + currentFree));
    },
    [atStockLimit, setQuantity, toast],
  );

  const handleDecrease = useCallback(
    (item: PosOrderItem) => {
      const currentFree = item.freeQuantity ?? 0;
      const currentPaid = lineQuantityRef.current.get(item.id) ?? (item.quantity - currentFree);
      const nextPaid = Math.max(0, currentPaid - 1);
      lineQuantityRef.current.set(item.id, nextPaid);

      // Zero paid units removes the line outright — a leftover free unit
      // with nothing paid backing it is not a sellable state, so it goes
      // with it rather than being sent through as a lone quantity.
      if (nextPaid <= 0) {
        lineQuantityRef.current.delete(item.id);
        void runLineChange(() => removeItem(item.id));
        return;
      }

      void runLineChange(() => setQuantity(item.id, nextPaid + currentFree));
    },
    [removeItem, setQuantity],
  );

  const handleRemove = useCallback(
    (orderItemId: string) => {
      lineQuantityRef.current.delete(orderItemId);
      void runLineChange(() => removeItem(orderItemId));
    },
    [removeItem],
  );

  const STORE_DEFAULT_DISCOUNT_KEY = "pos_store_default_discount";

  const [activeDiscountRule, setActiveDiscountRule] =
    useState<AppliedDiscountRule | null>(() => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("pos_store_default_discount");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.isCoupon || parsed?.discountCode) {
            localStorage.removeItem("pos_store_default_discount");
            return null;
          }
          return parsed;
        }
      } catch {}
      return null;
    });

  // Same window the backend checks at `PATCH /orders/{id}/discount`
  // (`OrderServiceImpl.validateDiscountForOrder`) — see pos-screen.tsx's
  // identical filter for why the schedule and day-of-week matter here too.
  const activePosDiscounts = useMemo(() => {
    const now = new Date();
    const today = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][
      now.getDay()
    ];

    return discounts.filter((d) => {
      if (d.status !== "ACTIVE" || d.requiresCoupon) return false;
      if (
        d.applicableChannels &&
        d.applicableChannels.length > 0 &&
        !d.applicableChannels.includes("POS")
      ) {
        return false;
      }
      if (d.startsAt && now < new Date(d.startsAt)) return false;
      if (d.endsAt && now > new Date(d.endsAt)) return false;
      if (
        d.selectedDays &&
        d.selectedDays.length > 0 &&
        !d.selectedDays.includes(today)
      ) {
        return false;
      }
      return true;
    });
  }, [discounts]);

  const computeTargetDiscountAmount = (
    orderVal: PosOrder,
    rule: AppliedDiscountRule | null
  ): number => {
    if (rule) {
      if (!isRuleConditionMet(orderVal, rule)) {
        return 0;
      }

      // Handle Buy X Get Y promotion discount calculation independently of rule.value or percentage
      if (rule.buyQuantity && rule.getQuantity && rule.buyQuantity > 0 && rule.getQuantity > 0) {
        const totalBuyXGetYDisc = (orderVal.items || []).reduce((sum, item) => {
          const itemDisc = computeItemDiscount(item, orderVal, rule, activePosDiscounts);
          return sum + itemDisc.discountAmount;
        }, 0);
        return Math.max(0, parseFloat(totalBuyXGetYDisc.toFixed(2)));
      }

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
    }

    // With no rule chosen, there is nothing to preview here — every caller
    // falls back to the order's own `discountAmount`, already correct and
    // already learned back from the backend's own `pickBest` selection.
    // Guessing one item at a time (as this used to, matching whichever
    // discount `findMatchingPosDiscount` happened to find for each item
    // independently) could match a storewide bundle against one item
    // without knowing another item in the same cart had already used up
    // the units it needed, giving a second item its own "free" unit the
    // backend's real total never charged for.
    return 0;
  };

  const resolveDiscountSync = (orderVal: PosOrder, rule: AppliedDiscountRule | null) => {
    // The backend already re-derives the order's own discount from the cart
    // on every line change — any catalog rule included, storewide or
    // item-scoped, breaking ties between several active discounts by scope
    // specificity and value (`pickBest` in DiscountApplicationServiceImpl)
    // — with no selection from here needed at all. A coupon code the
    // cashier actually typed, or a membership tied to the customer just
    // attached, is the one thing the backend has no way to guess on its
    // own, so that is the only case this still pushes.
    //
    // Trying to also push a *catalog* pick used to mean recomputing that
    // discount's amount here first — client-side, from whichever rule
    // `findMatchingPosDiscount`/a cached "store default" happened to match,
    // not necessarily the one the backend's own `pickBest` would land on —
    // and PATCHing the result over whatever the backend had just correctly
    // computed on its own. Every disagreement (a stale cached rule matching
    // a smaller cart than it was picked against, two active discounts
    // resolved differently, ordinary rounding) either fed a self-sustaining
    // loop of PATCH /api/orders/current/discount requests, or quietly
    // overwrote a correct figure with a wrong one that then stuck until the
    // next mutation. Restricting this to real coupons, memberships, and a
    // custom amount someone typed by hand (recognisable by carrying no
    // `discountId` — it is not a reference to any catalog discount at all)
    // is what stops both.
    if (!rule || !(rule.isCoupon || rule.discountCode || rule.isMembership || !rule.discountId)) {
      return {
        needsSync: false,
        payload: {
          discountAmount: orderVal.discountAmount ?? 0,
          discountId: null,
          discountCode: null,
          discountIds: null,
        },
      };
    }

    const targetAmount = computeTargetDiscountAmount(orderVal, rule);
    const needsIdSync = Boolean(rule.discountId && orderVal.discountId !== rule.discountId);
    const needsCodeSync = Boolean(rule.discountCode && orderVal.discountCode !== rule.discountCode);
    const needsAmountSync = Math.abs((orderVal.discountAmount ?? 0) - targetAmount) > 0.001;

    return {
      needsSync: needsAmountSync || needsIdSync || needsCodeSync,
      payload: {
        discountAmount: targetAmount,
        discountId: rule.discountId ?? null,
        discountCode: rule.discountCode || null,
        discountIds: null,
      },
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rule: AppliedDiscountRule | null = null;
    let explicitlyDisabled = false;

    // Only something this device actually decided is worth loading back as
    // `rule`: a coupon, a membership, or a custom amount someone typed by
    // hand (recognisable by having no `discountId` — a custom rule is not a
    // reference to any catalog discount at all). A catalog discount an
    // item-scoped or storewide promo) is none of those — it is the
    // backend's own `pickBest` choice, recomputed fresh from the cart on
    // every line change — and recomputing it again here from a rule cached
    // at whatever cart size it was picked against was the root of a whole
    // run of bugs: a stale rule matching a smaller cart than it was cached
    // for, disagreeing with the server enough to loop PATCH
    // /api/orders/current/discount, or once, simply producing a number the
    // cart's own contents could not justify. `item.freeQuantity`,
    // `item.discountLabel` and `order.discountAmount` already carry
    // everything a catalog discount needs to show or charge correctly —
    // nothing here has to re-decide any of it.
    const isExplicitRule = (candidate: unknown): candidate is AppliedDiscountRule =>
      Boolean(
        candidate &&
          typeof candidate === "object" &&
          ((candidate as AppliedDiscountRule).isCoupon ||
            (candidate as AppliedDiscountRule).discountCode ||
            isMembershipDiscount(candidate as AppliedDiscountRule) ||
            !(candidate as AppliedDiscountRule).discountId),
      );

    if (order?.id) {
      const cartKey = `pos_cart_discount_${order.id}`;
      const cartRaw = localStorage.getItem(cartKey);
      if (cartRaw === "NONE") {
        explicitlyDisabled = true;
      } else if (cartRaw) {
        try {
          const parsed = JSON.parse(cartRaw);
          if (isExplicitRule(parsed)) {
            rule = parsed;
          } else {
            localStorage.removeItem(cartKey);
          }
        } catch {}
      }
    }

    if (!rule && !explicitlyDisabled) {
      const storeDefaultRaw = localStorage.getItem(STORE_DEFAULT_DISCOUNT_KEY);
      if (storeDefaultRaw) {
        try {
          const parsed = JSON.parse(storeDefaultRaw);
          if (isExplicitRule(parsed)) {
            rule = parsed;
          } else {
            localStorage.removeItem(STORE_DEFAULT_DISCOUNT_KEY);
          }
        } catch {}
      }

      if (rule && order?.id) {
        try {
          localStorage.setItem(`pos_cart_discount_${order.id}`, JSON.stringify(rule));
        } catch {}
      }
    }

    setActiveDiscountRule(rule);

    if (order?.id) {
      const { needsSync, payload } = resolveDiscountSync(order, rule);
      if (needsSync) {
        const promise = setOrderDiscount(payload).unwrap();
        pendingDiscountSyncRef.current = promise;
        promise
          // A payment attempt awaits this exact promise to find out whether
          // the sync failed; this second handler just keeps that rejection
          // from also surfacing as an unhandled-rejection console warning
          // for the common case where no payment ever awaits it at all.
          .catch(() => {})
          .finally(() => {
            if (pendingDiscountSyncRef.current === promise) {
              pendingDiscountSyncRef.current = null;
            }
          });
      }
    }
  }, [
    order?.id,
    order?.subtotal,
    order?.discountAmount,
    order?.discountId,
    order?.discountCode,
    order?.items,
    setOrderDiscount,
  ]);

  const [attachedCustomerId, setAttachedCustomerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("pos_active_customer_id") || null;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (order?.customerId) {
      setAttachedCustomerId(order.customerId);
      try {
        localStorage.setItem("pos_active_customer_id", order.customerId);
      } catch {}
    }
  }, [order?.customerId]);

  const effectiveCustomerId = order?.customerId || attachedCustomerId;

  const selectedCustomer = useMemo(() => {
    if (!effectiveCustomerId) return null;
    return customers.find((c) => c.id === effectiveCustomerId) ?? null;
  }, [customers, effectiveCustomerId]);

  const handleSelectCustomer = async (customerId: string | null) => {
    try {
      setAttachedCustomerId(customerId);
      if (customerId) {
        try {
          localStorage.setItem("pos_active_customer_id", customerId);
        } catch {}
      } else {
        try {
          localStorage.removeItem("pos_active_customer_id");
        } catch {}
      }

      await setOrderCustomer({ customerId }).unwrap();

      if (customerId) {
        const targetCustomer = customers.find((c) => c.id === customerId);
        const discountId =
          targetCustomer?.membershipType?.discountId ||
          targetCustomer?.membershipType?.discount?.id;

        const d: any = (discountId ? discounts.find((rule) => rule.id === discountId) : null) ||
          targetCustomer?.membershipType?.discount;

        if (d) {
          const isBuyXGetY =
            d.ruleType === "BUY_X_GET_Y" ||
            String(d.type) === "BUY_X_GET_Y";

          const targetItemIds = Array.isArray(d.targets)
            ? d.targets.map((t: any) => t.targetId)
            : d.targetItemIds;

          const memberRule: AppliedDiscountRule = {
            label: targetCustomer?.membershipType?.typeName
              ? `${targetCustomer.membershipType.typeName} Discount`
              : d.name,
            type: isBuyXGetY ? "BUY_X_GET_Y" : (d.type as any),
            value: d.value ?? 0,
            minOrderAmount: d.minOrderAmount,
            maxDiscountAmount: d.maxDiscountAmount,
            buyQuantity: d.buyQuantity,
            getQuantity: d.getQuantity,
            scope: d.scope,
            targetItemIds,
            discountId: d.id,
            isMembership: true,
          };

          await handleApplyDiscountRule(memberRule);
          toast({
            tone: "success",
            title: "Membership Discount Applied",
            description: `Applied ${targetCustomer?.membershipType?.typeName || "Membership"} discount to order.`,
          });
          return;
        }
      } else {
        if (activeDiscountRule?.isMembership) {
          await handleApplyDiscountRule(null);
        }
        toast({
          tone: "info",
          title: "Customer Removed",
          description: "Customer has been detached from this order.",
        });
      }

      if (activeDiscountRule?.isCoupon || activeDiscountRule?.discountCode) {
        await handleApplyDiscountRule(null);
      }
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not attach customer",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    }
  };

  const handleApplyDiscountRule = async (rule: AppliedDiscountRule | null) => {
    const isCouponRule = Boolean(rule?.isCoupon || rule?.discountCode);

    if (!rule) {
      localStorage.removeItem(STORE_DEFAULT_DISCOUNT_KEY);
      if (order?.id) {
        localStorage.setItem(`pos_cart_discount_${order.id}`, "NONE");
      }
      setActiveDiscountRule(null);
      if (order?.id) {
        await setOrderDiscount({
          discountAmount: 0,
          discountId: null,
          discountCode: null,
        }).unwrap();
      }
      toast({
        tone: "info",
        title: "Discount Removed",
        description: "Discount has been removed from this order.",
      });
      return;
    }

    if (!isCouponRule && !rule.isMembership) {
      localStorage.setItem(STORE_DEFAULT_DISCOUNT_KEY, JSON.stringify(rule));
    }

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

  /*
   * No snapshot, no restore, no "could not load".
   *
   * The cart is a row on this device; a refresh reads it back and an outage
   * never touched it. What used to be here — a JSON copy in localStorage and
   * an effect that pushed it into the query cache when a request failed — was
   * a second cart standing in for the first, and it outlived its own sale.
   */
  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading order…</div>;
  }

  // An empty cart, for the panel to draw before anything has been rung up.
  // It names no business: nothing is sent from it, and a made-up id here is a
  // number that could be somebody else's.
  const fallbackOrder: PosOrder = {
    id: "offline-current",
    businessId: "",
    customerId: null,
    invoiceNumber: null,
    channel: "POS",
    status: "PENDING",
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
    currency: "USD",
    displayCurrency: null,
    displayExchangeRate: null,
    note: null,
    items: [],
    createdDate: null,
  };

  const effectiveOrder = order || fallbackOrder;
  const items = effectiveOrder.items ?? [];
  const subtotalNum = effectiveOrder.subtotal ?? 0;
  const autoTotalDiscount = computeTargetDiscountAmount(effectiveOrder, activeDiscountRule);
  const discountNum = autoTotalDiscount > 0 ? autoTotalDiscount : (effectiveOrder.discountAmount ?? 0);
  const afterDiscount = Math.max(0, subtotalNum - discountNum);

  // Tax was already computed server-side against this order's own items and
  // the business's configured rate — read directly rather than re-derived,
  // so the cart summary never disagrees with what payment will actually charge.
  const taxAmount = order?.taxAmount ?? 0;
  const isTaxActive = taxAmount > 0;
  const isTaxInclusive = order?.taxInclusionType === "INCLUSIVE";
  const effectiveTaxRate = order?.taxRate ?? 0;

  const summary = {
    subtotal: subtotalNum,
    discount: discountNum,
    taxName: business?.taxLabel || "VAT",
    taxRate: effectiveTaxRate,
    taxAmount: taxAmount,
    isTaxActive,
    isTaxInclusive,
    // Worked out from the same `subtotalNum`/`discountNum` the two rows
    // above already show, not read separately off `order.total` — that
    // figure comes from the cart's own, differently-timed reckoning of the
    // discount (learned back from whichever push last landed) and could
    // disagree with what this render just decided the discount actually is,
    // showing a Total that does not match Subtotal minus Discount right
    // above it. Tax is the one figure still read straight from the order:
    // it is computed server-side and inclusive tax is already folded into
    // `subtotalNum`, so exclusive tax is the only case with anything left
    // to add on top.
    total: isTaxActive && !isTaxInclusive ? afterDiscount + taxAmount : afterDiscount,
  };
  const totalSecondary = secondaryFor(summary.total, order);

  const handleCreateOrder = async (data: { name: string }) => {
    try {
      if (order?.id) {
        localStorage.removeItem(`pos_cart_discount_${order.id}`);
      }
      setAttachedCustomerId(null);
      try {
        localStorage.removeItem("pos_active_customer_id");
      } catch {}
      await parkOrder({ note: data.name.trim() }).unwrap();
      await clearLocalCart();

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
      setAttachedCustomerId(null);
      try {
        localStorage.removeItem("pos_active_customer_id");
      } catch {}
      await parkOrder({}).unwrap();
      await clearLocalCart();
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
    method: "CASH" | "DIGITAL" | "PAY_LATER",
    receivedAmount?: number,
  ) => {
    if (!order) return;

    // The "Validate" button's own disabled state only ever watched
    // `isPaying`, which is `usePayOrderMutation`'s loading flag — true only
    // once `payOrder` itself is in flight. Everything before that (waiting
    // on the discount sync, then `flushCart()`'s own round trip) is a
    // second, earlier stretch the button stayed clickable through, so a
    // cashier tapping it again while it looked stuck fired this whole
    // function a second time — a second flush, a second `payOrder`, the
    // till doing the actual work twice for one tap that just felt slow.
    if (isSubmittingPaymentRef.current) return;
    isSubmittingPaymentRef.current = true;
    setIsSubmittingPayment(true);

    const sold = order;

    try {
      // The auto-discount effect above patches the on-screen total the
      // instant a promotion's condition is met (e.g. the 3rd Coca-Cola
      // completing a Buy 2 Get 1 bundle) but fires the PATCH that actually
      // persists it fire-and-forget, for a snappy preview. Paying before
      // that PATCH lands would validate `receivedAmount` against the
      // backend's still-stale, pre-discount `order.total` and reject a
      // correct payment. Waiting on the in-flight promise itself (rather
      // than re-checking the cache, which the optimistic update already
      // made look "in sync" before the server ever confirmed it) is what
      // actually closes this race.
      if (pendingDiscountSyncRef.current) {
        await pendingDiscountSyncRef.current;
      }

      // Belt and braces: nothing was in flight, but this payment attempt is
      // itself the first thing to notice the order's stored discount is
      // out of date (e.g. the modal was opened before the effect above ever
      // ran) — sync it for real here too.
      const { needsSync, payload } = resolveDiscountSync(order, activeDiscountRule);
      if (needsSync) {
        await setOrderDiscount(payload).unwrap();
      }

      let sale: Sale;
      const isOfflineMode = typeof window !== "undefined" && !navigator.onLine;
      const taxInclusionType = isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE";

      if (isOfflineMode) {
        const recAmount = receivedAmount ?? summary.total;
        const chgAmount = Math.max(0, recAmount - summary.total);

        const offline = await processOfflineCheckout({
          items: (order.items || []).map((i) => ({
            product_id: i.itemId,
            product_name: i.itemName,
            variant_id: i.variantId ?? null,
            variant_name: i.variantName ?? null,
            unit_id: i.unitId ?? null,
            unit_name: i.unitName ?? null,
            add_ons: (i.addOns ?? []).flatMap((addOn) =>
              addOn.addOnId
                ? [{
                    addOnId: addOn.addOnId,
                    name: addOn.name,
                    unitPrice: addOn.unitPrice,
                  }]
                : [],
            ),
            unit_factor: i.unitFactor ?? null,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            subtotal: i.lineTotal,
          })),
          subtotal: summary.subtotal,
          discountAmount: summary.discount,
          discountLabel: activeDiscountRule?.label ?? null,
          taxRate: summary.isTaxActive ? summary.taxRate : null,
          taxAmount: summary.isTaxActive ? summary.taxAmount : null,
          taxInclusionType: summary.isTaxActive ? taxInclusionType : null,
          total: summary.total,
          currency: order.currency,
          paidAmount: recAmount,
          changeAmount: chgAmount,
          paymentMethod: method === "CASH" ? "CASH" : "CARD",
        });

        // Take the sale off the cached balances, which are what the ceiling is
        // measured against until the connection is back. In the units stock is
        // counted in, not in packs: deducting the pack count left almost all of
        // the shelf behind and the same stock could be sold over and over.
        for (const item of order.items || []) {
          if (item.itemId) {
            const key = item.variantId ? `${item.itemId}:${item.variantId}` : item.itemId;
            const existingStock = await offlineDb.stockList.get(key);
            if (existingStock) {
              const newQty = Math.max(
                0,
                existingStock.quantityOnHand - baseUnitsOf(item),
              );
              await offlineDb.stockList.update(key, { quantityOnHand: newQty });
            }
          }
        }

        /*
         * A real Sale, not a cast over a few fields.
         *
         * The receipt reads paidAmount, soldAt, subtotal, the tax and the
         * invoice number off this. What used to be built here named two of
         * them differently — receivedAmount, createdAt — and simply omitted
         * the rest, so an offline receipt printed a blank number, no tax line
         * and no cash tendered, and the cast hid all of it from the compiler.
         *
         * The invoice number is the id the sale is queued under, which is what
         * the backend records it as when it syncs — so the slip in the
         * customer's hand names the same sale the shop will see later.
         */
        sale = {
          id: offline.uuid,
          orderId: order.id,
          invoiceNumber: offline.uuid,
          cashierId: null,
          customerId: order.customerId,
          customerName: null,
          customerPhone: null,
          customerEmail: null,
          channel: "POS",
          subtotal: summary.subtotal,
          discountAmount: summary.discount,
          discountLabel: activeDiscountRule?.label ?? null,
          taxRate: summary.isTaxActive ? summary.taxRate : null,
          taxAmount: summary.isTaxActive ? summary.taxAmount : null,
          taxInclusionType: summary.isTaxActive ? taxInclusionType : null,
          totalAmount: summary.total,
          paidAmount: recAmount,
          changeAmount: chgAmount,
          currency: order.currency,
          displayCurrency: order.displayCurrency,
          displayExchangeRate: order.displayExchangeRate,
          paymentMethod: method,
          itemCount: (order.items || []).reduce(
            (count, line) => count + line.quantity,
            0,
          ),
          note: order.note,
          soldAt: new Date().toISOString(),
        };

        await clearLocalCart();
      } else {
        // The backend prices the sale from its own order, so everything the
        // till is holding has to be on it before the money is taken. This is
        // the one moment a push cannot be left to the background.
        const pushed = await flushCart();

        if (!pushed) {
          const reason = getLastCartPushError();
          toast({
            tone: "error",
            title: reason ? "Could not apply the discount" : "Could not reach the server",
            description:
              reason ??
              "The sale was not taken. Check the connection, or take it offline in cash.",
          });
          return;
        }

        sale = await payOrder({
          paymentMethod: method,
          receivedAmount,
          isTaxActive,
          isTaxInclusive,
          taxInclusionType,
          taxRate: effectiveTaxRate,
          taxAmount: summary.taxAmount,
          discountId: activeDiscountRule?.discountId,
          discountCode: activeDiscountRule?.discountCode,
        }).unwrap();

        await clearLocalCart();
      }

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
      }

      // Carries a coupon, a membership, or a hand-typed custom amount over
      // to the next order — never a catalog discount, which is not
      // something this device decided in the first place (see the
      // `isExplicitRule` guard in the effect above) and is recomputed by
      // the backend on its own for whatever the next order turns out to
      // hold, not whatever this one just sold.
      const storeDefaultRaw = localStorage.getItem(STORE_DEFAULT_DISCOUNT_KEY);
      let defaultRule: AppliedDiscountRule | null = null;
      if (storeDefaultRaw) {
        try {
          const parsed = JSON.parse(storeDefaultRaw);
          if (parsed?.isCoupon || parsed?.discountCode || isMembershipDiscount(parsed) || !parsed?.discountId) {
            defaultRule = parsed;
          } else {
            localStorage.removeItem(STORE_DEFAULT_DISCOUNT_KEY);
          }
        } catch {}
      }
      setActiveDiscountRule(defaultRule);

      // Reset attached customer so next order starts fresh
      setAttachedCustomerId(null);
      try {
        localStorage.removeItem("pos_active_customer_id");
      } catch {}
      void setOrderCustomer({ customerId: null });

      const itemsWithDiscounts = (sold.items || []).map((item) => {
        const itemDisc = computeItemDiscount(item, sold, activeDiscountRule, activePosDiscounts);
        return {
          ...item,
          discountAmount: itemDisc.discountAmount,
          discountLabel: itemDisc.label,
        };
      });

      const soldWithDiscounts: PosOrder = {
        ...sold,
        items: itemsWithDiscounts,
        subtotal: summary.subtotal,
        discountAmount: summary.discount,
        taxAmount: summary.taxAmount,
        total: summary.total,
      };

      const finalSale: Sale = {
        ...sale,
        subtotal: summary.subtotal,
        discountAmount: summary.discount,
        taxAmount: summary.taxAmount,
        totalAmount: summary.total,
      };

      setPaymentOpen(false);
      onPaymentSuccess?.(soldWithDiscounts, finalSale);
    } catch (cause) {
      toast({
        tone: "error",
        title: "Payment failed",
        description: getApiErrorMessage(cause, "Please try again."),
      });
    } finally {
      isSubmittingPaymentRef.current = false;
      setIsSubmittingPayment(false);
    }
  };

  const renderRow = (item: PosOrderItem) => (
    <ItemRow
      key={item.id}
      item={item}
      currency={order?.currency}
      busy={busyLineId === item.id}
      atStockLimit={atStockLimit(item)}
      onIncrease={handleIncrease}
      onDecrease={handleDecrease}
      onRemove={handleRemove}
      discountInfo={computeItemDiscount(item, order ?? null, activeDiscountRule, activePosDiscounts)}
    />
  );

  return (
    <div className="flex h-full flex-col bg-white/90">
      {/* Active Shop Discount Banner */}
      {activeDiscountRule && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary shrink-0">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-bold">
              {activeDiscountRule.isCoupon || activeDiscountRule.discountCode
                ? "Applied Coupon:"
                : "Active Shop Discount:"}
            </span>
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
                    {formatLocalPhone(selectedCustomer.globalCustomer.phoneNumber)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => void handleSelectCustomer(null)}
                className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg transition-colors"
                title="Cancel Customer"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              No customer attached
            </span>
          </div>
        )}
      </div>

      {/* items — scrolls, header stays visible */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table data-tour="pos-cart-qty" className="w-full table-fixed text-sm">
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
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {activeDiscountRule?.label || "Auto Applied"}
              </span>
              {activeDiscountRule && (
                <button
                  type="button"
                  onClick={() => void handleApplyDiscountRule(null)}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded border border-red-200 transition-colors"
                  title="Cancel manual discount on this order"
                >
                  ✕ Cancel
                </button>
              )}
            </div>
            <span className="tabular-nums text-primary min-[1025px]:text-[25px] min-[1025px]:font-semibold min-[1025px]:leading-7 font-bold">
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
          data-tour="pos-checkout"
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
          defaultName={selectedCustomer?.globalCustomer?.fullName || order?.note || ""}
        />
      )}

      {/* Customer select modal */}
      <CustomerSelectModal
        open={isCustomerModalOpen}
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
        items={order?.items || []}
        currentDiscountAmount={summary.discount}
        activeRule={activeDiscountRule}
        onApplyDiscountRule={handleApplyDiscountRule}
        mode={discountModalMode}
      />

      {paymentOpen && order && (
        <Payment
          open={paymentOpen}
          offline={isOffline}
          onOpenChange={setPaymentOpen}
          order={legacyOrderShape(order, activePosDiscounts, activeDiscountRule)}
          onValidate={handleValidatePayment}
          onDigitalPaid={async (sale) => {
            if (order.id) {
              localStorage.removeItem(`pos_cart_discount_${order.id}`);
            }
            if (activeDiscountRule?.isCoupon || activeDiscountRule?.discountCode) {
              const storeDefaultRaw = localStorage.getItem(STORE_DEFAULT_DISCOUNT_KEY);
              let defaultRule: AppliedDiscountRule | null = null;
              if (storeDefaultRaw) {
                try {
                  const parsed = JSON.parse(storeDefaultRaw);
                  if (
                    parsed?.isCoupon ||
                    parsed?.discountCode ||
                    isMembershipDiscount(parsed) ||
                    !parsed?.discountId
                  ) {
                    defaultRule = parsed;
                  }
                } catch {}
              }
              setActiveDiscountRule(defaultRule);
            }
            const itemsWithDiscounts = (order.items || []).map((item) => {
              const itemDisc = computeItemDiscount(item, order, activeDiscountRule, activePosDiscounts);
              return {
                ...item,
                discountAmount: itemDisc.discountAmount,
                discountLabel: itemDisc.label,
              };
            });

            const orderWithDiscounts: PosOrder = {
              ...order,
              items: itemsWithDiscounts,
              subtotal: summary.subtotal,
              discountAmount: summary.discount,
              taxAmount: summary.taxAmount,
              total: summary.total,
            };

            const finalSale: Sale = {
              ...sale,
              subtotal: summary.subtotal,
              discountAmount: summary.discount,
              taxAmount: summary.taxAmount,
              totalAmount: summary.total,
            };

            /*
             * The sale is over, so the cart is too.
             *
             * A KHQR sale settles at the bank and reaches us through the
             * payment poller, not through the Pay button — so it never passed
             * the place where cash and pay-later clear the till, and the lines
             * sat there to be sold a second time. Cleared here from the copy
             * already captured above, which is what the receipt renders.
             */
            await clearLocalCart();

            setPaymentOpen(false);
            onPaymentSuccess?.(orderWithDiscounts, finalSale);
          }}
          isProcessing={isPaying || isSubmittingPayment}
        />
      )}
    </div>
  );
}