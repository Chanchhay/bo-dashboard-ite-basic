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

/**
 * How few is few enough to say so, when the item itself does not say.
 *
 * An item carries its own `lowStockDefault` once someone has set one. Until
 * then the till still has to draw the line somewhere, and drawing it at five
 * is close enough to a shift's worth of a fast-moving item to be worth a
 * cashier's attention without labelling half the grid.
 */
const DEFAULT_LOW_STOCK = 5;

/**
 * Whether there is a shelf behind this item at all.
 *
 * A service or a download has none, so no count says anything about whether
 * it can be sold, and an item the shop has switched off inventory for is one
 * it has asked not to be counted.
 */
function countsStock(entry: ChannelItem) {
  if (entry.item.trackInventory === false) return false;

  const itemType = entry.item.itemType;

  return itemType !== "SERVICE" && itemType !== "DIGITAL";
}

/**
 * Whether ringing this up is a question rather than an answer.
 *
 * An item sold in options, in packs, or with extras is never sold as itself,
 * so both ways in — a tap on the card and a scan of the item's own barcode —
 * have to stop and ask. Only a variant's own barcode skips this, because that
 * label has already answered it.
 */
function needsChoice(entry: ChannelItem) {
  const hasOptions = Boolean(entry.item.variants?.length);
  // Only a pack with a price is something that can be sold as one.
  const hasPacks = Boolean(
    entry.item.uomConversions?.some((conversion) => conversion.price != null),
  );
  // Only extras this item actually sells count as something to choose.
  const hasAddOns = Boolean(
    entry.item.addOns?.some(
      (addOn) => addOn.available !== false && addOn.price != null,
    ),
  );

  return hasOptions || hasPacks || hasAddOns;
}

type PaidReceiptState = {
  /** The lines that were sold — the sale itself carries only totals. */
  order: PosOrder;
  sale: Sale;
};

export interface PosScreenProps {
  channelItems: ChannelItem[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategoryId: string;
  onClearFilters: () => void;
  /** Lets a scan that landed in the search box wipe itself back out. */
  onSearchQueryChange?: (value: string) => void;
  /** For the small-screen filter row; the navbar owns the wide-screen one. */
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
    // What the poll last saw. The rule is written by other components in this
    // same tab, where no `storage` event fires, so the till still has to look
    // — but it re-renders only when the stored text has actually changed.
    // Setting state on every tick re-rendered this whole screen, item grid
    // and all, once a second for the length of a shift.
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
  /** Bumped when a sale has changed the cached balances under us. */
  const [stockCacheVersion, setStockCacheVersion] = useState(0);

  useEffect(() => {
    // Only while connected. Offline, Redux is still holding the figures from
    // before the connection dropped, and writing those back over the cache
    // would undo every deduction the outage's own sales have made to it.
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

  /**
   * The balances the ceiling is measured against.
   *
   * Offline the cached list wins even though Redux still has an answer: the
   * cache is the one each offline sale is deducted from, so it knows about the
   * hundred sold during the outage and the stale server figures do not.
   */
  const currentStockList =
    !isOnline && cachedStockList.length > 0
      ? cachedStockList
      : remoteStockList.length > 0
        ? remoteStockList
        : cachedStockList;

  // The same cart row the panel renders, so the mobile bar can never disagree
  // with the panel behind it — and read before the grid, which counts stock
  // down by what this cart already holds.
  const { order: currentOrder } = useCurrentCart();

  const stockByItemId = useMemo(() => {
    const map = new Map<string, number>();
    currentStockList.forEach((s) => {
      // Add-on stock is counted too, but nothing on the till sells one alone.
      if (!s.itemId) return;
      // An option holds its own balance, so it is keyed on its own as well as
      // counted into the item's total. Selling the last Large has to read as
      // out of stock even while the item is full of Smalls.
      if (s.variantId) {
        map.set(`${s.itemId}:${s.variantId}`, s.quantityOnHand ?? 0);
      }
      map.set(s.itemId, (map.get(s.itemId) ?? 0) + (s.quantityOnHand ?? 0));
    });
    return map;
  }, [currentStockList]);

  /**
   * The ceiling the counter sells under, where the shop has set one.
   *
   * A shop that has given the till six of its twenty has said the other
   * fourteen are the web's. Showing twenty here would be showing stock this
   * screen is not allowed to sell — and the sale is refused at settle, which is
   * far too late to find out.
   */
  const { data: channelAvailability } =
    useGetChannelStockAvailabilityQuery("POS");

  const allowedByChannel = useMemo(
    () => channelAvailabilityMap(channelAvailability),
    [channelAvailability],
  );

  /**
   * On hand for an item, or one option of it, in base units.
   *
   * Undefined means the shop does not track this item at all, which reads
   * differently from zero: nothing should be shown as sold out on the strength
   * of a count nobody keeps.
   *
   * Two ceilings where the item's stock is split, and the lower one is what the
   * till may sell: the counter cannot sell past its share, and nobody can sell
   * what is not on the shelf.
   */
  const shelfStockFor = useCallback(
    (itemId: string, variantId?: string) => {
      const key = variantId ? `${itemId}:${variantId}` : itemId;
      const onHand = stockByItemId.get(key);

      if (onHand === undefined) return undefined;

      // An item sold in options is capped option by option, so the item's own
      // total is the sum of what each option may sell rather than one figure.
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

      // Absent means unsplit: this item has no ceiling on any channel.
      return allowed === undefined ? onHand : Math.min(onHand, allowed);
    },
    [allowedByChannel, stockByItemId],
  );

  /**
   * What the cart has already spoken for, keyed the way stock is.
   *
   * A line sold in a pack takes its whole factor off the shelf rather than one
   * unit, so a case of twelve is twelve.
   */
  const claimedByCart = useMemo(() => {
    const claimed = new Map<string, number>();

    currentOrder?.items.forEach((line) => {
      const taken = baseUnitsOf(line);

      claimed.set(line.itemId, (claimed.get(line.itemId) ?? 0) + taken);

      // An option comes off its own shelf as well as the item's total.
      if (line.variantId) {
        const key = `${line.itemId}:${line.variantId}`;
        claimed.set(key, (claimed.get(key) ?? 0) + taken);
      }
    });

    return claimed;
  }, [currentOrder]);

  /**
   * How many more the till may ring up: what is on the shelf, less what the
   * cart already holds.
   *
   * A cart is stock that has not been taken off the shelf yet. Counting from
   * the shelf alone lets a cashier ring up five of the three that exist and
   * find out only when payment is refused, in front of the customer. Every
   * reader of this — the grid, the option picker, the scanner — asks the same
   * question, so they all answer the same way.
   */
  const stockFor = useCallback(
    (itemId: string, variantId?: string) => {
      const onShelf = shelfStockFor(itemId, variantId);

      if (onShelf === undefined) return undefined;

      const key = variantId ? `${itemId}:${variantId}` : itemId;

      return Math.max(0, onShelf - (claimedByCart.get(key) ?? 0));
    },
    [claimedByCart, shelfStockFor],
  );

  /**
   * Whether there is nothing left to sell.
   *
   * Never stocked in counts as out, not as unknown: an item the shop has not
   * received yet has no cost behind it and no unit to take off a shelf, and
   * ringing one up books a sale against stock that was never there. Set Price
   * already refuses to price such an item — the till refuses to sell it.
   *
   * A service or a download is exempt. There is no shelf behind a haircut, so
   * a missing count says nothing about whether it can be sold, and refusing it
   * for want of a number that will never exist would take the shop's whole
   * service list off the till.
   */
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

  /**
   * Same window the backend checks when the discount is actually applied
   * (`OrderServiceImpl.validateDiscountForOrder`) — schedule and day-of-week
   * included, not just the status toggle. Without those two, a discount
   * outside its own date range or restricted to days that aren't today still
   * showed here as pickable, and the backend correctly refused it at
   * checkout with a 409 the cashier had no way to see coming.
   */
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

  // The till sells only what is published to the POS channel. Filtering stays
  // on that API-backed set because the channel endpoint does not accept search
  // parameters yet.
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

        // Find active discount that targets this specific item or storewide
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
          // Zero is left to the "Out of stock" ribbon, which says the same
          // thing in the words a cashier needs.
          lowStockLeft:
            stockLeft !== undefined &&
            stockLeft > 0 &&
            stockLeft <= lowStockThreshold
              ? // Trimmed, not rounded: a shelf holding 4.5 says 4.5, but a
                // subtraction that lands on 41.99999 does not say so.
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

  /** The full item behind each card: options, packs and the base unit. */
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
      // The cart it comes back as, so a caller can say what the line now holds
      // — a scanner ringing the same code four times has to report four. It is
      // the saved cart, not a guess at one: the write has already happened.
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

      // The card is disabled, but that is a look — this is the rule. Stock can
      // also run out between the grid rendering and the tap landing, and the
      // backend would book the sale either way.
      if (channelItem && outOfStock(channelItem)) {
        toast({
          tone: "error",
          title: `${item.name} is out of stock`,
          description: "Receive stock for it before selling it.",
        });
        return;
      }

      // One tap is enough only when there is nothing to choose between.
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

  /*
   * Scanning.
   *
   * The till is armed the whole time it is showing the grid — there is no scan
   * button, because at a counter the scanner *is* the button. A burst of keys
   * arriving faster than fingers move is a scan; anything slower belongs to
   * whoever is typing, which is why the cashier can still use search, and why
   * this stands down entirely while a modal is up.
   */
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
      // `sendItem` has already said why it failed; this only has to not claim
      // the opposite.
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
      // A burst that landed in the search box has already filtered the grid
      // behind us. Clear it, or the cashier's next tap is fighting a filter
      // they never typed.
      if (intoField) {
        onSearchQueryChange?.("");
      }

      const match = matchScan(scanIndex, code);

      if (!match) {
        // Worth one round trip, purely to tell the two misses apart: a code
        // nobody has ever seen, and an item the shop simply has not put on the
        // till. The second is a two-minute fix and the cashier should hear so.
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

      // The option's own label was scanned, so there is nothing left to ask:
      // this is the one line the code names.
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

      // Scanned the item, not one of the things it is sold as. The scan has
      // found it — the cashier still says which one.
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

  // A modal is the DOM's answer sooner than it is React's — the choice modal,
  // payment, customer select and the rest all portal a dialog in, and none of
  // them should be taking scans behind their own screen.
  const scanningPaused = useCallback(
    () =>
      typeof document === "undefined" ||
      Boolean(document.querySelector('[data-slot="dialog-content"]')),
    [],
  );

  useBarcodeKeyboard({
    // Only over the grid: a receipt on screen or the mobile cart pulled up is
    // not a moment when the next scan should be joining the order.
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
  /* The backend matches receiverId against the Keycloak subject, not against
     Better Auth's local user.id. */
  const subject = useSessionSubject();

  const handlePaymentSuccess = (order: PosOrder, sale: Sale) => {
    playPaid();

    // The offline checkout has just taken these items off the cached balances.
    // Read them back, or the next cart of the outage is counted against stock
    // this one has already sold.
    if (!isOnline) {
      setStockCacheVersion((version) => version + 1);
    }
    setPaidReceipt({ order, sale });
    setActiveTab("Point of Sale");
    setMobileCartOpen(false);
    setEditingOrderId(null);

    // Dispatch Payment Received / Sale Completed notification to POS / Business users
    if (subject) {
      const orderRef = order.invoiceNumber || (order.id ? order.id.slice(0, 8) : "POS");
      const totalVal = sale.totalAmount ?? order.total ?? 0;
      const formattedTotal = format(totalVal, sale.currency ?? order.currency);
      const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) || order.items?.length || 0;

      // 1. Dispatch Payment Received Notification
      createNotification({
        senderId: subject,
        senderName: session?.user?.name || "POS Cashier",
        receiverIds: [subject],
        type: "PAYMENT",
        title: `Payment Successful (#${orderRef})`,
        content: `Payment received for sale of ${itemCount} item(s) total ${formattedTotal}.`,
        deepLink: "/sales/orders",
      }).catch(() => {});

      // 2. Check sold items for ACTUAL low stock warnings
      if (order.items && order.items.length > 0) {
        order.items.forEach((line) => {
          const itemMatch = channelItems.find(
            (ci) => ci.item.id === line.itemId || ci.item.name?.toLowerCase() === line.itemName?.toLowerCase()
          );

          if (!itemMatch?.item) return;

          const itemObj = itemMatch.item as any;
          // Skip digital/service items that do not track inventory
          if (itemObj.itemType === "DIGITAL") return;

          const lowThreshold = Number(itemObj.lowStockDefault || 0);
          // Skip if low stock threshold is disabled (0 or unset)
          if (lowThreshold <= 0) return;

          // Warn about what actually sold: the option if the line named one,
          // since the item's total stays healthy while one option empties.
          const currentStock =
            (line.variantId
              ? stockByItemId.get(`${itemObj.id}:${line.variantId}`)
              : undefined) ??
            stockByItemId.get(itemObj.id) ??
            0;
          const remainingStock = Math.max(0, currentStock - line.quantity);

          // ONLY notify if remaining quantity drops to or below the low stock threshold
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
      {/* `min-w-0`: a flex item defaults to `min-width: auto`, so this column
          refuses to go below the grid's min-content width and pushes the cart
          off the right edge — where the row's `overflow-clip` cuts it off
          rather than scrolling to it. */}
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
                {/* The navbar's category dropdown lives in a block that only
                    renders at 1025px, leaving every smaller screen with no way
                    to filter at all. Chips rather than a select: they are a
                    single tap on a counter tablet, and they show what is on
                    offer without opening anything. */}
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
                  /* Column counts drop at 1025px rather than climbing: that is
                     where the cart takes its 500px off the side, so the grid
                     gets less room than it had at 1024px, not more. They climb
                     again as the window grows past what the cart needs. */
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
