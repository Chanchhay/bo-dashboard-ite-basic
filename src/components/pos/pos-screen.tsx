"use client";

import { useMemo, useState } from "react";
import { PackageOpen, Search, ShoppingCart, X } from "lucide-react";

import type { Item } from "@/types/pos-type";
import type { PosOrder, Sale } from "@/lib/api/pos-order";
import type { ChannelItem } from "@/lib/api/sales-channels";

import { useMoney } from "@/hooks/useMoney";
import { PaidReceiptView } from "@/components/pos/order/pain-receipt-view";
import PosCard from "@/components/pos/pos-card";
import { ReceiptDetailView } from "@/components/pos/order/receipt-detail-view";
import { ReceiptsList } from "@/components/pos/order/receipt-list";
import { OrdersList } from "@/components/pos/order/order-list";
import PosButton, { type PosTab } from "@/components/pos/pos-button";
import { OrderTable } from "@/components/pos/order/order-table";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { authClient } from "@/lib/auth/auth-client";
import { useSessionSubject } from "@/lib/auth/session-context";
import { useCreateNotificationMutation } from "@/services/notificationApi";
import { useGetCurrentStockQuery } from "@/services/inventoryApi";
import {
  useAddOrderItemMutation,
  useGetCurrentOrderQuery,
} from "@/services/posOrderApi";

const TABS_WITH_CART: PosTab[] = ["Point of Sale", "Order"];

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
  currentRegisterUser,
  registerCashSales,
  registerCurrency,
}: PosScreenProps) {
  const { format } = useMoney();
  const [activeTab, setActiveTab] = useState<PosTab>("Point of Sale");
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<PaidReceiptState | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
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
        const thumbnail = [...(entry.item.images ?? [])]
          .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
          .find((image) => image.url)?.url;

        return {
          id: entry.item.id,
          business_owner_id: "",
          name: entry.item.name ?? "Unnamed",
          image_url: thumbnail ?? null,
          price: String(entry.item.price ?? 0),
          is_available:
            entry.item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        };
      });
  }, [channelItems, searchQuery, selectedCategoryId]);

  const filtersAreActive =
    searchQuery.trim().length > 0 || selectedCategoryId !== "ALL";

  const [addOrderItem] = useAddOrderItemMutation();
  const { toast } = useToast();

  const addItem = async (itemId: string) => {
    try {
      await addOrderItem({ itemId, quantity: 1 }).unwrap();
    } catch (error) {
      // A tap that silently does nothing is worse than one that says why —
      // the cashier would otherwise keep tapping.
      toast({
        tone: "error",
        title: "Could not add that item",
        description: getApiErrorMessage(error, "Please try again."),
      });
    }
  };
  // The same cached order the cart panel renders, so the mobile bar can never
  // disagree with the panel behind it.
  const { data: currentOrder } = useGetCurrentOrderQuery();
  const showCart = TABS_WITH_CART.includes(activeTab);
  const itemCount =
    currentOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartTotal = currentOrder?.total ?? 0;
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [createNotification] = useCreateNotificationMutation();
  const { data: session } = authClient.useSession();
  /* The backend matches receiverId against the Keycloak subject, not against
     Better Auth's local user.id. */
  const subject = useSessionSubject();

  const { data: currentStockList = [] } = useGetCurrentStockQuery();

  const stockByItemId = useMemo(() => {
    const map = new Map<string, number>();
    currentStockList.forEach((s) => {
      map.set(s.itemId, s.quantityOnHand ?? 0);
    });
    return map;
  }, [currentStockList]);

  const handlePaymentSuccess = (order: PosOrder, sale: Sale) => {
    setPaidReceipt({ order, sale });
    setActiveTab("Point of Sale");
    setMobileCartOpen(false);
    setEditingOrderId(null);

    // Dispatch Sale Completed notification to POS / Business users
    if (subject) {
      const orderRef = order.invoiceNumber || (order.id ? order.id.slice(0, 8) : "POS");
      const totalVal = sale.totalAmount ?? order.total ?? 0;
      const formattedTotal = format(totalVal, sale.currency ?? order.currency);
      const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) || order.items?.length || 0;

      // 1. Dispatch Sale Completed Notification
      createNotification({
        senderId: subject,
        senderName: session?.user?.name || "POS Cashier",
        receiverIds: [subject],
        type: "ORDER",
        title: `Sale Completed (#${orderRef})`,
        content: `Completed sale of ${itemCount} item(s) total ${formattedTotal}.`,
        deepLink: "/dashboard/pos",
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

          const currentStock = stockByItemId.get(itemObj.id) ?? 0;
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
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f5f5] min-[1025px]:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-20 [-ms-overflow-style:none] min-[1025px]:pb-0 [&::-webkit-scrollbar]:hidden">
          {activeTab === "Point of Sale" &&
            (paidReceipt ? (
              <PaidReceiptView
                order={paidReceipt.order}
                sale={paidReceipt.sale}
                onNewOrder={() => setPaidReceipt(null)}
              />
            ) : (
              <div className="px-3 pt-4 sm:px-6 sm:pt-6 min-[1025px]:px-[25px] min-[1025px]:pt-8">
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
                  <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 min-[900px]:grid-cols-5 min-[1025px]:grid-cols-5 min-[1025px]:gap-x-[13px]">
                    {items.map((item) => (
                      <PosCard
                        key={item.id}
                        item={item}
                        onSelect={(id) => addItem(id)}
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
            setActiveTab(tab);
            setOpenReceiptId(null);
          }}
        />
      </div>

      {showCart && (
        <div className="scrollbar-hide hidden w-[43.4vw] max-w-[625px] min-w-[500px] shrink-0 overflow-y-auto border-l border-[#d9d9d9] bg-white/90 min-[1025px]:flex min-[1025px]:flex-col">
          <OrderTable
            onPaymentSuccess={handlePaymentSuccess}
            onOrderCreated={handleOrderCreated}
            isEditingOrder={editingOrderId !== null}
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
              onPaymentSuccess={handlePaymentSuccess}
              onOrderCreated={handleOrderCreated}
              isEditingOrder={editingOrderId !== null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
