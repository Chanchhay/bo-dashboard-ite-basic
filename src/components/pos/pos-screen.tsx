"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageOpen, Search, ShoppingCart, X } from "lucide-react";

import type { Item } from "@/types/pos-type";
import { baseUnitsOf, type PosOrder, type Sale } from "@/lib/api/pos-order";
import type { ChannelItem } from "@/lib/api/sales-channels";
import { itemThumbnail } from "@/lib/api/inventory";

import { useMoney } from "@/hooks/useMoney";
import { usePosOffline } from "@/lib/offline/usePosOffline";
import { PaidReceiptView } from "@/components/pos/order/pain-receipt-view";
import { ItemChoiceModal } from "@/components/pos/item-choice-modal";
import PosCard from "@/components/pos/pos-card";
import { ReceiptDetailView } from "@/components/pos/order/receipt-detail-view";
import { ReceiptsList } from "@/components/pos/order/receipt-list";
import { OrdersList } from "@/components/pos/order/order-list";
import PosButton, { type PosTab } from "@/components/pos/pos-button";
import type { PosCategoryOption } from "@/components/pos/navbar-pos/navbar";
import { OrderTable } from "@/components/pos/order/order-table";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { linesOf } from "@/components/sales/pricing/channel-lines";
import { authClient } from "@/lib/auth/auth-client";
import { useSessionSubject } from "@/lib/auth/session-context";
import { useNotifyWithPush } from "@/hooks/useNotifyWithPush";
import { useCustomerDisplaySync } from "@/hooks/useCustomerDisplaySync";
import {
  useBarcodeKeyboard,
  type ScanSource,
} from "@/hooks/useBarcodeKeyboard";
import {
  buildScanIndex,
  matchScan,
  variantOf,
} from "@/lib/pos/barcode-match";
import {
  playPaid,
  playScanAccepted,
  playScanRejected,
  playTick,
} from "@/lib/pos/sounds";
import { useGetDiscountsQuery } from "@/services/discountApi";
import {
  useGetCurrentStockQuery,
  useLazyFindInventoryItemByBarcodeQuery,
} from "@/services/inventoryApi";
import { useGetChannelStockAvailabilityQuery } from "@/services/salesChannelApi";
import { channelAvailabilityMap } from "@/lib/api/channel-stock";
import { useCartActions, useCurrentCart } from "@/lib/pos/use-cart";
import { toPosOrder } from "@/lib/pos/local-cart";

const TABS_WITH_CART: PosTab[] = ["Point of Sale", "Order"];

const DEFAULT_LOW_STOCK = 5;

function countsStock(entry: ChannelItem) {
  if (entry.item.trackInventory === false) return false;

  const itemType = entry.item.itemType;

  return itemType !== "SERVICE" && itemType !== "DIGITAL";
}

function needsChoice(entry: ChannelItem) {
  const hasOptions = Boolean(entry.item.variants?.length);
  const hasPacks = Boolean(
    entry.item.uomConversions?.some((conversion) => conversion.price != null),
  );
  const hasAddOns = Boolean(
    entry.item.addOns?.some(
      (addOn) => addOn.available !== false && addOn.price != null,
    ),
  );

  return hasOptions || hasPacks || hasAddOns;
}

type PaidReceiptState = {
  order: PosOrder;
  sale: Sale;
};

export interface PosScreenProps {
  channelItems: ChannelItem[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategoryId: string;
  onClearFilters: () => void;
  onSearchQueryChange?: (value: string) => void;
  categories?: PosCategoryOption[];
  onCategoryChange?: (categoryId: string) => void;
  currentRegisterUser: { id: string; name: string } | null;
  registerCashSales?: number;
  registerCurrency?: string;
}

export function PosScreen({
  channelItems,
  isLoading,
  searchQuery,
  selectedCategoryId,
  onClearFilters,
  onSearchQueryChange,
  categories = [],
  onCategoryChange,
  currentRegisterUser,
  registerCashSales,
  registerCurrency,
}: PosScreenProps) {
  const { format } = useMoney();
  const [activeTab, setActiveTab] = useState<PosTab>("Point of Sale");
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<PaidReceiptState | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [activeDiscountLabel, setActiveDiscountLabel] = useState<string | null>(null);

  useEffect(() => {
    let lastSeen: string | null | undefined;

    const updateDiscountLabel = () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem("pos_store_default_discount");
      } catch {
        raw = null;
      }

      if (raw === lastSeen) return;
      lastSeen = raw;

      try {
        if (raw) {
          const rule = JSON.parse(raw);
          if (rule?.isCoupon || rule?.discountCode) {
            localStorage.removeItem("pos_store_default_discount");
            lastSeen = null;
            setActiveDiscountLabel(null);
          } else {
            setActiveDiscountLabel(rule.label || "Active");
          }
        } else {
          setActiveDiscountLabel(null);
        }
      } catch {
        setActiveDiscountLabel(null);
      }
    };

    updateDiscountLabel();
    window.addEventListener("storage", updateDiscountLabel);
    const interval = setInterval(updateDiscountLabel, 1000);
    return () => {
      window.removeEventListener("storage", updateDiscountLabel);
      clearInterval(interval);
    };
  }, []);

  const { isOnline, cacheStockList, getCachedStockList } = usePosOffline();
  const { data: remoteStockList = [] } = useGetCurrentStockQuery();
  const [cachedStockList, setCachedStockList] = useState<any[]>([]);
  const [stockCacheVersion, setStockCacheVersion] = useState(0);

  useEffect(() => {
    if (isOnline && remoteStockList && remoteStockList.length > 0) {
      void cacheStockList(remoteStockList);
    }
  }, [isOnline, remoteStockList, cacheStockList]);

  useEffect(() => {
    let isMounted = true;
    if (!isOnline || remoteStockList.length === 0) {
      getCachedStockList().then((items) => {
        if (isMounted && items && items.length > 0) {
          setCachedStockList(items);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOnline, remoteStockList.length, getCachedStockList, stockCacheVersion]);

  const currentStockList =
    !isOnline && cachedStockList.length > 0
      ? cachedStockList
      : remoteStockList.length > 0
        ? remoteStockList
        : cachedStockList;

  const { order: currentOrder } = useCurrentCart();

  const stockByItemId = useMemo(() => {
    const map = new Map<string, number>();
    currentStockList.forEach((s) => {
      if (!s.itemId) return;
      if (s.variantId) {
        map.set(`${s.itemId}:${s.variantId}`, s.quantityOnHand ?? 0);
      }
      map.set(s.itemId, (map.get(s.itemId) ?? 0) + (s.quantityOnHand ?? 0));
    });
    return map;
  }, [currentStockList]);

  const { data: channelAvailability } =
    useGetChannelStockAvailabilityQuery("POS");

  const allowedByChannel = useMemo(
    () => channelAvailabilityMap(channelAvailability),
    [channelAvailability],
  );

  const shelfStockFor = useCallback(
    (itemId: string, variantId?: string) => {
      const key = variantId ? `${itemId}:${variantId}` : itemId;
      const onHand = stockByItemId.get(key);

      if (onHand === undefined) return undefined;

      if (!variantId && !allowedByChannel.has(key)) {
        const perOption = [...allowedByChannel.entries()].filter(([entryKey]) =>
          entryKey.startsWith(`${itemId}:`),
        );

        if (perOption.length === 0) return onHand;

        return perOption.reduce(
          (total, [entryKey, allowed]) =>
            total + Math.min(allowed, stockByItemId.get(entryKey) ?? 0),
          0,
        );
      }

      const allowed = allowedByChannel.get(key);

      return allowed === undefined ? onHand : Math.min(onHand, allowed);
    },
    [allowedByChannel, stockByItemId],
  );

  const claimedByCart = useMemo(() => {
    const claimed = new Map<string, number>();

    currentOrder?.items.forEach((line) => {
      const taken = baseUnitsOf(line);

      claimed.set(line.itemId, (claimed.get(line.itemId) ?? 0) + taken);

      if (line.variantId) {
        const key = `${line.itemId}:${line.variantId}`;
        claimed.set(key, (claimed.get(key) ?? 0) + taken);
      }
    });

    return claimed;
  }, [currentOrder]);

  const stockFor = useCallback(
    (itemId: string, variantId?: string) => {
      const onShelf = shelfStockFor(itemId, variantId);

      if (onShelf === undefined) return undefined;

      const key = variantId ? `${itemId}:${variantId}` : itemId;

      return Math.max(0, onShelf - (claimedByCart.get(key) ?? 0));
    },
    [claimedByCart, shelfStockFor],
  );

  const outOfStock = useCallback(
    (entry: ChannelItem) => {
      if (!countsStock(entry)) return false;

      const stockVal = stockFor(entry.item.id);
      if (stockVal === undefined) return false;

      return stockVal <= 0;
    },
    [stockFor],
  );

  const { data: discounts = [] } = useGetDiscountsQuery();

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

  const items = useMemo<Item[]>(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

    return channelItems
      .filter((entry) => {
        if (
          selectedCategoryId !== "ALL" &&
          entry.item.itemGroup?.id !== selectedCategoryId
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          entry.item.name,
          entry.item.code,
          entry.item.sku,
          entry.item.barcode,
        ].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedSearch),
        );
      })
      .map((entry) => {
        const thumbnail = itemThumbnail(entry.item);
        const prices = linesOf(entry.item)
          .map((line) => line.base)
          .filter((price): price is number => price !== undefined);

        const lowest = prices.length
          ? Math.min(...prices)
          : (entry.item.price ?? 0);

        let discountBadge: string | undefined;
        let discountedPrice: string | undefined;

        const itemDiscount = activePosDiscounts.find((d) => {
          if (d.scope === "SPECIFIC_ITEMS" || d.scope === "ITEM") {
            return d.targets?.some((t) => t.targetType === "ITEM" && t.targetId === entry.item.id);
          }
          if (d.scope === "SPECIFIC_CATEGORIES" || d.scope === "CATEGORY") {
            const itemGroupId = entry.item.itemGroup?.id;
            return d.targets?.some((t) => t.targetType === "ITEM_GROUP" && t.targetId === itemGroupId);
          }
          return d.scope === "ALL_ITEMS" || !d.scope;
        });

        if (itemDiscount && lowest > 0) {
          if (itemDiscount.type === "PERCENTAGE" && itemDiscount.value > 0) {
            discountBadge = `-${itemDiscount.value}%`;
            const reduced = Math.max(0, lowest * (1 - itemDiscount.value / 100));
            discountedPrice = format(reduced);
          } else if (itemDiscount.type === "FIXED_AMOUNT" || (itemDiscount.type as any) === "FIXED") {
            if (itemDiscount.value > 0) {
              discountBadge = `-${format(itemDiscount.value)}`;
              const reduced = Math.max(0, lowest - itemDiscount.value);
              discountedPrice = format(reduced);
            }
          } else if (itemDiscount.ruleType === "BUY_X_GET_Y" || (itemDiscount.buyQuantity && itemDiscount.getQuantity)) {
            discountBadge = `Buy ${itemDiscount.buyQuantity} Get ${itemDiscount.getQuantity}`;
          }
        }

        const stockLeft = countsStock(entry)
          ? stockFor(entry.item.id)
          : undefined;
        const lowStockThreshold =
          entry.item.lowStockDefault ?? DEFAULT_LOW_STOCK;

        return {
          id: entry.item.id,
          business_owner_id: "",
          name: entry.item.name ?? "Unnamed",
          image_url: thumbnail ?? null,
          price: String(lowest),
          discountBadge,
          discountedPrice,
          is_available:
            entry.item.status === "INACTIVE" || outOfStock(entry)
              ? "INACTIVE"
              : "ACTIVE",
          unavailableReason:
            entry.item.status === "INACTIVE"
              ? "Unavailable"
              : outOfStock(entry)
                ? "Out of stock"
                : undefined,
          lowStockLeft:
            stockLeft !== undefined &&
            stockLeft > 0 &&
            stockLeft <= lowStockThreshold
              ?
                Number(stockLeft.toFixed(2))
              : undefined,
          stockUnit: entry.item.unit?.symbol ?? entry.item.unit?.name,
        };
      });
  }, [
    channelItems,
    searchQuery,
    selectedCategoryId,
    outOfStock,
    stockFor,
    activePosDiscounts,
    format,
  ]);

  const filtersAreActive =
    searchQuery.trim().length > 0 || selectedCategoryId !== "ALL";

  const { addItem: addCartLine } = useCartActions();
  const { toast } = useToast();

  const channelItemsById = useMemo(() => {
    const map = new Map<string, ChannelItem>();
    channelItems.forEach((entry) => map.set(entry.item.id, entry));
    return map;
  }, [channelItems]);

  const [choosingFor, setChoosingFor] = useState<ChannelItem | null>(null);

  const sendItem = useCallback(
    async (input: {
      itemId: string;
      variantId?: string;
      variantName?: string;
      unitId?: string;
      unitName?: string;
      unitFactor?: number;
      addOns?: { addOnId: string; name: string; unitPrice: number }[];
      itemName: string;
      unitPrice: number;
    }) => {
      const cart = await addCartLine({
        itemId: input.itemId,
        variantId: input.variantId ?? null,
        variantName: input.variantName ?? null,
        unitId: input.unitId ?? null,
        unitName: input.unitName ?? null,
        unitFactor: input.unitFactor ?? null,
        addOns: input.addOns ?? [],
        itemName: input.itemName,
        unitPrice: input.unitPrice,
        quantity: 1,
        trackInventory:
          channelItemsById.get(input.itemId)?.item.trackInventory ?? null,
      });

      return toPosOrder(cart);
    },
    [addCartLine, channelItemsById],
  );

  const addItem = useCallback(
    async (item: Item) => {
      const channelItem = channelItemsById.get(item.id);

      if (channelItem && outOfStock(channelItem)) {
        toast({
          tone: "error",
          title: `${item.name} is out of stock`,
          description: "Receive stock for it before selling it.",
        });
        return;
      }

      if (channelItem && needsChoice(channelItem)) {
        setChoosingFor(channelItem);
        return;
      }

      void sendItem({
        itemId: item.id,
        itemName: item.name,
        unitPrice: Number(item.price ?? 0),
      });
    },
    [channelItemsById, sendItem, outOfStock, toast],
  );

  const scanIndex = useMemo(() => buildScanIndex(channelItems), [channelItems]);
  const [findItemByBarcode] = useLazyFindInventoryItemByBarcodeQuery();

  const rejectScan = useCallback(
    (title: string, description: string) => {
      playScanRejected();
      toast({ tone: "error", title, description });
    },
    [toast],
  );

  const acceptScan = useCallback(
    (order: PosOrder | undefined, name: string, line: {
      itemId: string;
      variantId?: string;
    }) => {
      if (!order) {
        playScanRejected();
        return;
      }

      playScanAccepted();

      const quantity = order.items.find(
        (entry) =>
          entry.itemId === line.itemId &&
          (line.variantId
            ? entry.variantId === line.variantId
            : !entry.variantId),
      )?.quantity;

      toast({
        tone: "success",
        title: `${name} added`,
        description:
          quantity && quantity > 1
            ? `Qty ${quantity} on the order.`
            : "Qty 1 on the order.",
      });
    },
    [toast],
  );

  const handleScan = useCallback(
    async (code: string, { intoField }: ScanSource) => {
      if (intoField) {
        onSearchQueryChange?.("");
      }

      const match = matchScan(scanIndex, code);

      if (!match) {
        try {
          const item = await findItemByBarcode(code, true).unwrap();
          rejectScan(
            `${item.name || "That item"} is not on the till`,
            "Publish it to the Point of Sale channel before selling it here.",
          );
        } catch {
          rejectScan("Unknown barcode", `Nothing on the till matches ${code}.`);
        }

        return;
      }

      const { entry } = match;
      const { item } = entry;
      const name = item.name || "Item";

      if (item.status === "INACTIVE") {
        rejectScan(`${name} is not for sale`, "It is switched off in Items.");
        return;
      }

      const variant = variantOf(match);

      if (variant?.id) {
        const optionName = [name, variant.name].filter(Boolean).join(" · ");

        if (entry.item.trackInventory !== false && (stockFor(item.id, variant.id) ?? 0) <= 0) {
          rejectScan(
            `${optionName} is out of stock`,
            "Receive stock for it before selling it.",
          );
          return;
        }

        const line = linesOf(item).find(
          (candidate) => candidate.variantId === variant.id && !candidate.unitId,
        );

        if (line?.base == null) {
          rejectScan(
            `${optionName} has no price`,
            "Set one in Sale Management before selling it.",
          );
          return;
        }

        const order = await sendItem({
          itemId: item.id,
          variantId: variant.id,
          itemName: optionName,
          unitPrice: line.base,
        });

        acceptScan(order, optionName, { itemId: item.id, variantId: variant.id });
        return;
      }

      if (outOfStock(entry)) {
        rejectScan(
          `${name} is out of stock`,
          "Receive stock for it before selling it.",
        );
        return;
      }

      if (needsChoice(entry)) {
        playScanAccepted();
        setChoosingFor(entry);
        return;
      }

      if (item.price == null) {
        rejectScan(
          `${name} has no price`,
          "Set one in Sale Management before selling it.",
        );
        return;
      }

      const order = await sendItem({
        itemId: item.id,
        itemName: name,
        unitPrice: item.price,
      });

      acceptScan(order, name, { itemId: item.id });
    },
    [
      acceptScan,
      findItemByBarcode,
      onSearchQueryChange,
      outOfStock,
      rejectScan,
      scanIndex,
      sendItem,
      stockFor,
    ],
  );

  const scanningPaused = useCallback(
    () =>
      typeof document === "undefined" ||
      Boolean(document.querySelector('[data-slot="dialog-content"]')),
    [],
  );

  useBarcodeKeyboard({
    enabled:
      activeTab === "Point of Sale" &&
      !paidReceipt &&
      !mobileCartOpen &&
      !choosingFor,
    mode: "passive",
    onScan: handleScan,
    isPaused: scanningPaused,
  });

  useCustomerDisplaySync({
    businessId: paidReceipt?.order.businessId || currentOrder?.businessId,
    terminalId: "term_default",
    order: paidReceipt ? paidReceipt.order : currentOrder,
    sale: paidReceipt ? paidReceipt.sale : null,
    statusOverride: paidReceipt ? "COMPLETED" : undefined,
  });
  const showCart = TABS_WITH_CART.includes(activeTab);
  const itemCount =
    currentOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartTotal = currentOrder?.total ?? 0;
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const createNotification = useNotifyWithPush();
  const { data: session } = authClient.useSession();
  const subject = useSessionSubject();

  const handlePaymentSuccess = (order: PosOrder, sale: Sale) => {
    playPaid();

    if (!isOnline) {
      setStockCacheVersion((version) => version + 1);
    }
    setPaidReceipt({ order, sale });
    setActiveTab("Point of Sale");
    setMobileCartOpen(false);
    setEditingOrderId(null);

    if (subject) {
      const orderRef = order.invoiceNumber || (order.id ? order.id.slice(0, 8) : "POS");
      const totalVal = sale.totalAmount ?? order.total ?? 0;
      const formattedTotal = format(totalVal, sale.currency ?? order.currency);
      const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) || order.items?.length || 0;

      const isPayLater = sale.paymentMethod === "PAY_LATER";
      createNotification({
        senderId: subject,
        senderName: session?.user?.name || "POS Cashier",
        receiverIds: [subject],
        type: "PAYMENT",
        title: isPayLater
          ? `Pay Later Order Placed (#${orderRef})`
          : `Payment Successful (#${orderRef})`,
        content: isPayLater
          ? `${itemCount} item(s) sold on Pay Later, ${formattedTotal} still owed.`
          : `Payment received for sale of ${itemCount} item(s) total ${formattedTotal}.`,
        deepLink: isPayLater ? "/sales/pay-later" : "/sales/orders",
      }).catch(() => {});

      if (order.items && order.items.length > 0) {
        order.items.forEach((line) => {
          const itemMatch = channelItems.find(
            (ci) => ci.item.id === line.itemId || ci.item.name?.toLowerCase() === line.itemName?.toLowerCase()
          );

          if (!itemMatch?.item) return;

          const itemObj = itemMatch.item as any;
          if (itemObj.itemType === "DIGITAL") return;

          const lowThreshold = Number(itemObj.lowStockDefault || 0);
          if (lowThreshold <= 0) return;

          const currentStock =
            (line.variantId
              ? stockByItemId.get(`${itemObj.id}:${line.variantId}`)
              : undefined) ??
            stockByItemId.get(itemObj.id) ??
            0;
          const remainingStock = Math.max(0, currentStock - line.quantity);

          if (remainingStock <= lowThreshold) {
            const itemName = line.itemName || itemObj.name || "Product";
            const statusLabel = remainingStock <= 0 ? "OUT OF STOCK" : `${remainingStock} left`;

            createNotification({
              senderId: subject,
              senderName: "Inventory System",
              receiverIds: [subject],
              type: "INVENTORY",
              title: `Low Stock Warning: ${itemName} (${statusLabel})`,
              content: `Item "${itemName}" is now ${remainingStock <= 0 ? "out of stock" : `low on stock (${remainingStock} remaining, threshold is ${lowThreshold})`}. Please restock!`,
              deepLink: "/inventory/stock",
            }).catch(() => {});
          }
        });
      }
    }
  };

  const handleOrderCreated = () => {
    setActiveTab("Order");
    setMobileCartOpen(false);
    setOpenReceiptId(null);
    setEditingOrderId(null);

    if (subject) {
      createNotification({
        senderId: subject,
        senderName: session?.user?.name || "POS Cashier",
        receiverIds: [subject],
        type: "ORDER",
        title: "New Pending Order Placed",
        content: "A new pending order has been parked/created in POS.",
        deepLink: "/sales/orders",
      }).catch(() => {});
    }
  };

  const [discountModalMode, setDiscountModalMode] = useState<"COUPON" | "CUSTOM">("COUPON");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-clip bg-[#f5f5f5] min-[1025px]:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-20 [-ms-overflow-style:none] min-[1025px]:pb-0 [&::-webkit-scrollbar]:hidden">
          {activeTab === "Point of Sale" &&
            (paidReceipt ? (
              <PaidReceiptView
                order={paidReceipt.order}
                sale={paidReceipt.sale}
                onNewOrder={() => setPaidReceipt(null)}
              />
            ) : (
              <div data-tour="pos-search-grid" className="px-3 pt-4 sm:px-6 sm:pt-6 min-[1025px]:px-[25px] min-[1025px]:pt-8">
                {categories.length > 0 && (
                  <div className="sticky top-0 z-20 -mx-3 mb-4 bg-[#f5f5f5]/95 px-3 pb-2 backdrop-blur-sm sm:-mx-6 sm:px-6 min-[1025px]:hidden">
                    <div
                      className="scrollbar-none flex gap-2 overflow-x-auto"
                      role="group"
                      aria-label="Filter by category"
                    >
                      {[{ id: "ALL", name: "All" }, ...categories].map(
                        (category) => {
                          const isActive = selectedCategoryId === category.id;

                          return (
                            <button
                              key={category.id}
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => onCategoryChange?.(category.id)}
                              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                isActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-gray-200 bg-white text-gray-600 active:bg-gray-50"
                              }`}
                            >
                              {category.name}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <div className="text-sm text-gray-400">
                    Loading items…
                  </div>
                ) : channelItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-20 text-center">
                    <PackageOpen
                      className="h-9 w-9 text-gray-300"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-semibold text-gray-700">
                      No items to sell yet
                    </p>
                    <p className="max-w-xs text-sm text-gray-500">
                      Add items to the Point of Sale channel and they will
                      appear here.
                    </p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <Search
                      className="h-9 w-9 text-gray-300"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        No matching items
                      </p>
                      <p className="mt-1 max-w-xs text-sm text-gray-500">
                        Try another search or category.
                      </p>
                    </div>
                    {filtersAreActive && (
                      <button
                        type="button"
                        onClick={onClearFilters}
                        className="h-10 rounded-xl border border-primary px-4 text-sm font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/25"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 min-[900px]:grid-cols-5 min-[1025px]:grid-cols-3 min-[1025px]:gap-x-[13px] min-[1280px]:grid-cols-4 min-[1600px]:grid-cols-5">
                    {items.map((item) => (
                      <PosCard
                        key={item.id}
                        item={item}
                        onSelect={addItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

          {activeTab === "Order" && (
            <OrdersList
              onEdit={(orderId) => {
                setEditingOrderId(orderId);
                setActiveTab("Point of Sale");
              }}
              onCancel={(orderId) => {
                if (editingOrderId === orderId) {
                  setEditingOrderId(null);
                  setMobileCartOpen(false);
                }
              }}
            />
          )}

          {activeTab === "Receipts" &&
            (openReceiptId ? (
              <ReceiptDetailView
                receiptId={openReceiptId}
                onBack={() => setOpenReceiptId(null)}
              />
            ) : (
              <ReceiptsList
                onOpenReceipt={setOpenReceiptId}
                currentRegisterUser={currentRegisterUser}
                registerCashSales={registerCashSales}
                registerCurrency={registerCurrency}
              />
            ))}
        </div>

        <PosButton
          active={activeTab}
          onChange={(tab) => {
            playTick();
            setActiveTab(tab);
            setOpenReceiptId(null);
          }}
          onOpenCoupon={() => {
            setActiveTab("Point of Sale");
            setDiscountModalMode("COUPON");
            setDiscountModalOpen(true);
          }}
          onOpenCustomDiscount={() => {
            setActiveTab("Point of Sale");
            setDiscountModalMode("CUSTOM");
            setDiscountModalOpen(true);
          }}
          onOpenCustomer={() => {
            setActiveTab("Point of Sale");
            setCustomerModalOpen(true);
          }}
        />
      </div>

      {showCart && (
        <div className="scrollbar-hide hidden w-[43.4vw] max-w-[625px] min-w-[500px] shrink-0 overflow-y-auto border-l border-[#d9d9d9] bg-white/90 min-[1025px]:flex min-[1025px]:flex-col">
          <OrderTable
            stockFor={stockFor}
            onPaymentSuccess={handlePaymentSuccess}
            onOrderCreated={handleOrderCreated}
            isEditingOrder={editingOrderId !== null}
            discountModalOpen={discountModalOpen}
            onDiscountModalOpenChange={setDiscountModalOpen}
            discountModalMode={discountModalMode}
            customerModalOpen={customerModalOpen}
            onCustomerModalOpenChange={setCustomerModalOpen}
          />
        </div>
      )}

      {showCart && !mobileCartOpen && itemCount > 0 && (
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex min-h-12 items-center justify-between rounded-xl bg-primary px-4 py-3 text-white shadow-lg outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-[1025px]:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-4 w-4" />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="text-sm font-bold">{format(cartTotal)}</span>
        </button>
      )}

      {showCart && mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex h-dvh min-h-0 flex-col bg-white pb-[env(safe-area-inset-bottom)] min-[1025px]:hidden">
          <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2">
            <h2 className="text-base font-bold text-gray-900">Current order</h2>
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              aria-label="Close current order"
              className="grid size-11 place-items-center rounded-full text-gray-500 outline-none hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            <OrderTable
              stockFor={stockFor}
              onPaymentSuccess={handlePaymentSuccess}
              onOrderCreated={handleOrderCreated}
              isEditingOrder={editingOrderId !== null}
              discountModalOpen={discountModalOpen}
              onDiscountModalOpenChange={setDiscountModalOpen}
              discountModalMode={discountModalMode}
              customerModalOpen={customerModalOpen}
              onCustomerModalOpenChange={setCustomerModalOpen}
            />
          </div>
        </div>
      )}

      <ItemChoiceModal
        channelItem={choosingFor}
        open={Boolean(choosingFor)}
        onOpenChange={(next) => {
          if (!next) setChoosingFor(null);
        }}
        stockFor={stockFor}
        onConfirm={async (choice) => {
          const chosen = choosingFor;
          setChoosingFor(null);

          if (!chosen) return;

          await sendItem({
            itemId: chosen.item.id,
            ...(choice.variantId ? { variantId: choice.variantId } : {}),
            ...(choice.variantName ? { variantName: choice.variantName } : {}),
            ...(choice.unitId ? { unitId: choice.unitId } : {}),
            ...(choice.unitName ? { unitName: choice.unitName } : {}),
            ...(choice.unitFactor != null
              ? { unitFactor: choice.unitFactor }
              : {}),
            ...(choice.addOns?.length ? { addOns: choice.addOns } : {}),
            itemName: choice.label,
            unitPrice: choice.unitPrice,
          });
        }}
      />
    </div>
  );
}
